import { appSettingsTable } from "@workspace/db";
import { db } from "@workspace/db";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";
import Replicate from "replicate";
import { uploadToR2, generateR2Key, r2Enabled } from "./r2-storage.js";

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

function getReplicateClient(apiKey: string): Replicate {
  return new Replicate({
    auth: apiKey,
  });
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
  const modelName = (config.model.includes("/") ? config.model : `minimax/${config.model}`) as `${string}/${string}`;

  const replicate = getReplicateClient(config.apiKey);

  const modelInput = {
    prompt: fullPrompt,
    lyrics: input.lyrics.trim() || "[Instrumental]",
    bitrate: 256000,
    sample_rate: 44100,
    audio_format: "mp3",
    is_instrumental: input.voice ? input.voice.toLowerCase().includes("instrumental") : false,
    lyrics_optimizer: false,
  };

  try {
    const prediction = await replicate.predictions.create({
      model: modelName,
      input: modelInput,
    });

    return {
      id: prediction.id,
      status: prediction.status as ReplicatePredictionResponse["status"],
      output: prediction.output as any,
      error: prediction.error ? String(prediction.error) : null,
      logs: prediction.logs || null,
    };
  } catch (err: any) {
    console.error("Erro ao iniciar predição no Replicate via SDK:", err);
    throw new Error(`Falha ao iniciar geração musical no Replicate: ${err.message || String(err)}`);
  }
}

/**
 * Consulta o status de uma predição em andamento no Replicate
 */
export async function getPredictionStatus(predictionId: string): Promise<ReplicatePredictionResponse> {
  const config = await getReplicateConfig();
  if (!config.apiKey) {
    throw new Error("Chave de API do Replicate não configurada.");
  }

  const replicate = getReplicateClient(config.apiKey);

  try {
    const prediction = await replicate.predictions.get(predictionId);
    
    // Tratamento de URL de saída caso seja FileOutput ou objeto com método .url()
    let out = prediction.output;
    if (out && typeof (out as any).url === "function") {
      out = (out as any).url();
    } else if (Array.isArray(out) && out.length > 0 && typeof (out[0] as any)?.url === "function") {
      out = (out[0] as any).url();
    }

    return {
      id: prediction.id,
      status: prediction.status as ReplicatePredictionResponse["status"],
      output: out as any,
      error: prediction.error ? String(prediction.error) : null,
      logs: prediction.logs || null,
    };
  } catch (err: any) {
    console.error("Erro ao consultar status da predição no Replicate via SDK:", err);
    throw new Error(`Erro ao consultar status da geração: ${err.message || String(err)}`);
  }
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
