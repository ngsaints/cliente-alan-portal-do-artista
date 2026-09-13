import { appSettingsTable } from "@workspace/db";
import { db } from "@workspace/db";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";
import { uploadToR2, generateR2Key, r2Enabled } from "./r2-storage.js";

const REPLICATE_API_BASE = "https://api.replicate.com/v1";

export interface MiniMaxMusicInput {
  prompt: string;
  lyrics: string;
  voice?: string;
  genre?: string;
  bpm?: number;
  mood?: string;
}

export interface ReplicatePredictionResponse {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[] | null;
  error?: string | null;
  logs?: string | null;
}

async function getSettingValue(key: string): Promise<string | null> {
  try {
    const rows = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, key));
    return rows[0]?.value?.trim() || null;
  } catch {
    return null;
  }
}

export async function getReplicateConfig(): Promise<{
  apiKey: string | null;
  model: string;
  enabled: boolean;
}> {
  const replicateKey = (await getSettingValue("replicate_api_key")) || process.env.REPLICATE_API_TOKEN || null;
  const replicateModel = (await getSettingValue("replicate_music_model")) || "minimax/music-2.6";
  const replicateEnabled = (await getSettingValue("replicate_enabled")) !== "false";

  return {
    apiKey: replicateKey,
    model: replicateModel,
    enabled: !!replicateKey && replicateEnabled,
  };
}

/**
 * Inicia uma predição no Replicate para gerar música com o MiniMax Music 2.6
 */
export async function startMusicGeneration(input: MiniMaxMusicInput): Promise<ReplicatePredictionResponse> {
  const config = await getReplicateConfig();
  if (!config.apiKey) {
    throw new Error("Chave de API do Replicate não configurada. Adicione sua chave nas configurações do Painel Administrativo.");
  }

  // Montar prompt completo refinado para o MiniMax
  const stylePromptParts: string[] = [];
  if (input.genre) stylePromptParts.push(input.genre);
  if (input.mood) stylePromptParts.push(`clima ${input.mood}`);
  if (input.voice) {
    if (input.voice.toLowerCase().includes("instrumental")) {
      stylePromptParts.push("instrumental sem voz");
    } else {
      stylePromptParts.push(`voz ${input.voice}`);
    }
  }
  if (input.bpm) stylePromptParts.push(`${input.bpm} BPM`);
  if (input.prompt) stylePromptParts.push(input.prompt);

  const fullPrompt = stylePromptParts.join(", ");

  // Normalizar modelo (ex: minimax/music-2.6 ou minimax/music-01)
  const modelName = config.model.includes("/") ? config.model : `minimax/${config.model}`;

  const payload = {
    input: {
      prompt: fullPrompt,
      lyrics: input.lyrics.trim() || "[Instrumental]",
    },
  };

  const res = await fetch(`${REPLICATE_API_BASE}/models/${modelName}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      Prefer: "wait=5", // espera até 5s para retornar resposta inicial rápida
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Erro ao iniciar predição no Replicate:", res.status, errText);
    throw new Error(`Falha ao iniciar geração musical no Replicate (${res.status}): ${errText.slice(0, 180)}`);
  }

  const prediction = await res.json();
  return {
    id: prediction.id,
    status: prediction.status,
    output: prediction.output,
    error: prediction.error,
  };
}

/**
 * Consulta o status de uma predição em andamento no Replicate
 */
export async function getPredictionStatus(predictionId: string): Promise<ReplicatePredictionResponse> {
  const config = await getReplicateConfig();
  if (!config.apiKey) {
    throw new Error("Chave de API do Replicate não configurada.");
  }

  const res = await fetch(`${REPLICATE_API_BASE}/predictions/${predictionId}`, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erro ao consultar status da geração (${res.status}): ${errText.slice(0, 100)}`);
  }

  const prediction = await res.json();
  return {
    id: prediction.id,
    status: prediction.status,
    output: prediction.output,
    error: prediction.error,
  };
}

/**
 * Baixa o áudio gerado pelo Replicate e salva localmente ou no R2 para ter link permanente
 */
export async function downloadAndSaveGeneratedAudio(remoteAudioUrl: string, title: string): Promise<string> {
  try {
    const res = await fetch(remoteAudioUrl);
    if (!res.ok) throw new Error(`Falha ao baixar áudio gerado (${res.status})`);
    
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30);
    const fileName = `demo_${Date.now()}_${cleanTitle}.mp3`;

    if (r2Enabled) {
      const key = generateR2Key("audio", fileName);
      return await uploadToR2(buffer, key, "audio/mpeg");
    } else {
      const audioDir = path.join(process.cwd(), "uploads/audio");
      fs.mkdirSync(audioDir, { recursive: true });
      fs.writeFileSync(path.join(audioDir, fileName), buffer);
      return `/api/uploads/audio/${fileName}`;
    }
  } catch (err) {
    console.warn("Aviso: Não foi possível salvar áudio localmente, usando URL remota:", err);
    return remoteAudioUrl;
  }
}
