import { appSettingsTable } from "@workspace/db";
import { db } from "@workspace/db";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";
import { uploadToR2, generateR2Key, r2Enabled } from "./r2-storage.js";

const REPLICATE_API_BASE = "https://api.replicate.com/v1";
const FETCH_TIMEOUT_MS = 60_000;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function assertImageBuffer(arrayBuf: ArrayBuffer): void {
  if (arrayBuf.byteLength < 1024) {
    throw new Error("Resposta de imagem inválida");
  }
  if (arrayBuf.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Imagem gerada excede o tamanho permitido");
  }
}

async function getSettingValue(key: string): Promise<string | null> {
  try {
    const rows = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, key));
    return rows[0]?.value?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Salva um buffer de imagem gerado no R2 ou em uploads/covers local
 */
export async function saveGeneratedImage(
  buffer: Buffer,
  prefix: "cover" | "profile" | "demo",
  originalTitle: string
): Promise<string> {
  const cleanTitle = originalTitle.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30);
  const fileName = `ia_${prefix}_${Date.now()}_${cleanTitle}.jpg`;

  if (r2Enabled) {
    const key = generateR2Key(prefix === "profile" ? "photos" : "covers", fileName);
    return await uploadToR2(buffer, key, "image/jpeg");
  } else {
    const targetDir = path.join(process.cwd(), `uploads/${prefix === "profile" ? "photos" : "covers"}`);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, fileName), buffer);
    return `/api/uploads/${prefix === "profile" ? "photos" : "covers"}/${fileName}`;
  }
}

/**
 * Gera imagem via Replicate (FLUX-schnell ou SDXL) com fallback para Pollinations AI (100% gratuito e resiliente)
 */
export async function generateAiImage(params: {
  prompt: string;
  type: "cover" | "profile";
  title?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16";
}): Promise<{ imageUrl: string; provider: string }> {
  const { prompt, type, title = "imagem", aspectRatio = "1:1" } = params;

  // 1. Tenta Replicate FLUX Schnell se houver chave configurada
  const apiKey = await getSettingValue("replicate_api_key");
  const modelSetting = (await getSettingValue("replicate_image_model")) || "black-forest-labs/flux-schnell";

  if (apiKey) {
    try {
      console.log(`[AI Image] Iniciando geração no Replicate (${modelSetting}):`, prompt.slice(0, 80));
      const res = await fetchWithTimeout(`${REPLICATE_API_BASE}/models/${modelSetting}/predictions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Prefer: "wait=60",
        },
        body: JSON.stringify({
          input: {
            prompt,
            aspect_ratio: aspectRatio,
            output_format: "jpg",
            num_outputs: 1,
          },
        }),
      });

      if (res.ok) {
        let prediction = await res.json();
        
        // Se ainda estiver processando, faz polling rápido de até 30s
        if (prediction.status === "starting" || prediction.status === "processing") {
          const predId = prediction.id;
          for (let i = 0; i < 15; i++) {
            await new Promise((r) => setTimeout(r, 2000));
            const pollRes = await fetchWithTimeout(`${REPLICATE_API_BASE}/predictions/${predId}`, {
              headers: { Authorization: `Bearer ${apiKey}` },
            }, 15_000);
            if (pollRes.ok) {
              prediction = await pollRes.json();
              if (prediction.status === "succeeded" || prediction.status === "failed") break;
            }
          }
        }

        if (prediction.status === "succeeded" && prediction.output) {
          const rawUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
          if (rawUrl && typeof rawUrl === "string") {
            // Baixa e salva local/R2
            const imgRes = await fetchWithTimeout(rawUrl);
            if (imgRes.ok) {
              const arrayBuf = await imgRes.arrayBuffer();
              assertImageBuffer(arrayBuf);
              const permanentUrl = await saveGeneratedImage(Buffer.from(arrayBuf), type, title);
              return { imageUrl: permanentUrl, provider: "replicate-flux" };
            }
          }
        }
      } else {
        const errText = await res.text();
        console.warn("[AI Image] Replicate retornou erro:", res.status, errText.slice(0, 150));
      }
    } catch (replicateErr) {
      console.warn("[AI Image] Exceção no Replicate, acionando fallback Pollinations:", replicateErr);
    }
  }

  // 2. Fallback de Alta Resiliência: Pollinations Flux (Gratuito, rápido e de alta qualidade)
  console.log("[AI Image] Gerando via Fallback Pollinations Flux...");
  let width = 1024;
  let height = 1024;
  if (aspectRatio === "16:9") {
    width = 1280;
    height = 720;
  } else if (aspectRatio === "9:16") {
    width = 720;
    height = 1280;
  }

  const encodedPrompt = encodeURIComponent(prompt.slice(0, 800));
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=flux&nologo=true&seed=${Date.now()}`;

  const pollRes = await fetchWithTimeout(pollinationsUrl, { headers: { "User-Agent": "PortalDoArtista/1.0" } });
  if (!pollRes.ok) {
    throw new Error(`Falha ao gerar imagem no provedor alternativo (${pollRes.status})`);
  }

  const arrayBuf = await pollRes.arrayBuffer();
  assertImageBuffer(arrayBuf);
  const permanentUrl = await saveGeneratedImage(Buffer.from(arrayBuf), type, title);
  return { imageUrl: permanentUrl, provider: "pollinations-flux" };
}
