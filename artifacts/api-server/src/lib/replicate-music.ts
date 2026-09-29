import { appSettingsTable } from "@workspace/db";
import { db } from "@workspace/db";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";
import Replicate from "replicate";
import { uploadToR2, generateR2Key, r2Enabled } from "./r2-storage.js";
import { sendAdminAlert } from "./email.js";

/** Erro de infraestrutura do gateway (não é culpa do artista). */
export class ReplicateServiceError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ReplicateServiceError";
    this.code = code;
    this.status = status;
  }
}

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

// HTTP 402 = conta do Replicate sem saldo. Devolve mensagem útil pro artista.
function isInsufficientCreditError(err: any): boolean {
  const parts = [
    err?.message,
    err?.response?.status,
    err?.status,
    typeof err?.response?.data === "string" ? err.response.data : JSON.stringify(err?.response?.data ?? {}),
  ]
    .filter(Boolean)
    .join(" ");
  return /\b402\b|insufficient credit|payment required/i.test(parts);
}

// O artista não precisa saber de billing: é indisponibilidade temporária do gateway.
const NO_CREDIT_ARTIST_MESSAGE =
  "A geração de hits está temporariamente indisponível. Nossa equipe já foi avisada — tente novamente em alguns minutos.";

const CREDIT_FAIL_FAST_MS = 5 * 60 * 1000;
const ADMIN_ALERT_INTERVAL_MS = 30 * 60 * 1000;
let creditBlockedUntil = 0;
let creditFailureCount = 0;
let lastAdminAlertAt = 0;
let lastCreditErrorAt = 0;

function noCreditError(): ReplicateServiceError {
  return new ReplicateServiceError(NO_CREDIT_ARTIST_MESSAGE, "REPLICATE_NO_CREDIT", 503);
}

/** Marca a falha de crédito, evita repetir a chamada e avisa o admin (no máx. 1x/30min). */
async function reportInsufficientCredit(apiKey: string, model: string, detail: string): Promise<void> {
  creditFailureCount += 1;
  creditBlockedUntil = Date.now() + CREDIT_FAIL_FAST_MS;
  lastCreditErrorAt = Date.now();
  console.error(
    `[Replicate] Conta sem créditos (HTTP 402). Fail-fast por ${CREDIT_FAIL_FAST_MS / 60000} min | ` +
      `modelo=${model} | ocorrências=${creditFailureCount}`
  );

  if (Date.now() - lastAdminAlertAt < ADMIN_ALERT_INTERVAL_MS) return;
  lastAdminAlertAt = Date.now();

  void sendAdminAlert(
    "Replicate sem créditos — geração de hits pausada",
    [
      "A conta do Replicate está sem saldo e a geração de músicas foi pausada automaticamente.",
      "",
      `Modelo: ${model}`,
      `Chave: ${apiKey.slice(0, 8)}…`,
      `Ocorrências nesta sessão: ${creditFailureCount}`,
      `Última resposta: ${detail.slice(0, 500)}`,
      "",
      "Recarga: https://replicate.com/account/billing",
      "Enquanto não houver saldo, novas tentativas são bloqueadas por 5 minutos para não gerar ruído.",
      "",
      "Portal do Artista",
    ].join("\n")
  );
}

function toFriendlyError(err: any, context: string, apiKey?: string, model?: string): Error {
  if (isInsufficientCreditError(err)) {
    void reportInsufficientCredit(apiKey || "desconhecida", model || "desconhecido", err?.message || String(err));
    return noCreditError();
  }
  return new Error(`${context}: ${err?.message || String(err)}`);
}

/**
 * Inicia uma predição no Replicate para gerar música com o MiniMax Music 2.6
 */
export async function startMusicGeneration(input: MiniMaxMusicInput): Promise<ReplicatePredictionResponse> {
  const config = await getReplicateConfig();
  if (!config.apiKey) {
    console.error("[Replicate] Chave de API não configurada — defina replicate_api_key no Painel Administrativo.");
    void sendAdminAlert(
      "Replicate sem chave de API — geração de hits indisponível",
      "A chave replicate_api_key não está configurada, então a geração de músicas está bloqueada.\n\n" +
        "Cadastre a chave em Admin → Configurações → Replicate.\n\nPortal do Artista"
    );
    throw new ReplicateServiceError(
      "A geração de hits está indisponível no momento. Tente novamente mais tarde.",
      "REPLICATE_NOT_CONFIGURED",
      503
    );
  }

  // Fail-fast: evita martelar a API (e encher o log) enquanto a conta está sem saldo.
  if (Date.now() < creditBlockedUntil) {
    console.warn("[Replicate] Fail-fast: conta sem créditos recentemente — nova chamada ao Replicate evitada.");
    throw noCreditError();
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

    // Chamada ok: libera o fail-fast de créditos.
    creditBlockedUntil = 0;

    return {
      id: prediction.id,
      status: prediction.status as ReplicatePredictionResponse["status"],
      output: prediction.output as any,
      error: prediction.error ? String(prediction.error) : null,
      logs: prediction.logs || null,
    };
  } catch (err: any) {
    if (isInsufficientCreditError(err)) {
      await reportInsufficientCredit(config.apiKey, modelName, err?.message || String(err));
      throw noCreditError();
    }
    console.error("Erro ao iniciar predição no Replicate via SDK:", err);
    throw toFriendlyError(err, "Falha ao iniciar geração musical no Replicate", config.apiKey, modelName);
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
    if (isInsufficientCreditError(err)) {
      await reportInsufficientCredit(config.apiKey, config.model, err?.message || String(err));
      throw noCreditError();
    }
    console.error("Erro ao consultar status da predição no Replicate via SDK:", err);
    throw toFriendlyError(err, "Erro ao consultar status da geração", config.apiKey, config.model);
  }
}

export interface ReplicateIntegrationReport {
  ok: boolean;
  enabled: boolean;
  hasKey: boolean;
  keyHint: string | null;
  model: string;
  account: string | null;
  modelAccessible: boolean;
  creditBlocked: boolean;
  creditFailures: number;
  lastCreditErrorAt: string | null;
  errors: string[];
}

/**
 * Verificação de integração para o Painel Administrativo.
 * É gratuita: só consulta conta e modelo — não cria predições e não consome crédito.
 * A API do Replicate não expõe saldo, então "há crédito" só se confirma numa geração paga;
 * o que dá para reportar aqui é a chave, o modelo e o estado do bloqueio por 402.
 */
export async function testReplicateIntegration(): Promise<ReplicateIntegrationReport> {
  const config = await getReplicateConfig();
  const errors: string[] = [];
  const report: ReplicateIntegrationReport = {
    ok: false,
    enabled: config.enabled,
    hasKey: !!config.apiKey,
    keyHint: config.apiKey ? `${config.apiKey.slice(0, 8)}…` : null,
    model: config.model,
    account: null,
    modelAccessible: false,
    creditBlocked: creditBlockedUntil > Date.now(),
    creditFailures: creditFailureCount,
    lastCreditErrorAt: lastCreditErrorAt ? new Date(lastCreditErrorAt).toISOString() : null,
    errors,
  };

  if (!config.apiKey) {
    errors.push("replicate_api_key não configurada no Painel Administrativo.");
    return report;
  }
  if (!config.enabled) {
    errors.push("Gateway Replicate desativado (replicate_enabled = false).");
  }

  const replicate = getReplicateClient(config.apiKey);
  try {
    const account: any = await (replicate as any).accounts.current();
    report.account = account?.username || account?.type || "autenticado";
  } catch (err: any) {
    errors.push(`Chave recusada pela Replicate: ${err?.message || err}`);
  }

  const fullName = config.model.includes("/") ? config.model : `minimax/${config.model}`;
  const slash = fullName.indexOf("/");
  try {
    await (replicate as any).models.get(fullName.slice(0, slash), fullName.slice(slash + 1));
    report.modelAccessible = true;
  } catch (err: any) {
    errors.push(`Modelo "${fullName}" inacessível: ${err?.message || err}`);
  }

  if (report.creditBlocked) {
    errors.push("Bloqueio por falta de crédito ativo: a geração está pausada por 5 minutos após o último HTTP 402.");
  }

  report.ok = errors.length === 0;
  return report;
}

/**
 * Teste PAGO (alguns centavos): cria uma predição barata de verdade para descobrir
 * se há saldo na conta. Só roda quando o admin clica — nunca em request de artista.
 */
const CREDIT_PROBE_MODEL = "black-forest-labs/flux-schnell";
const CREDIT_PROBE_TIMEOUT_MS = 60 * 1000;

export interface ReplicateCreditReport {
  ok: boolean;
  model: string;
  predictionId: string | null;
  durationMs: number | null;
  note: string;
  error: string | null;
}

export async function testReplicateCredit(): Promise<ReplicateCreditReport> {
  const config = await getReplicateConfig();
  const report: ReplicateCreditReport = {
    ok: false,
    model: CREDIT_PROBE_MODEL,
    predictionId: null,
    durationMs: null,
    note: "",
    error: null,
  };
  if (!config.apiKey) {
    report.error = "replicate_api_key não configurada no Painel Administrativo.";
    return report;
  }

  const replicate = getReplicateClient(config.apiKey);
  const started = Date.now();
  let prediction: any;
  try {
    prediction = await (replicate as any).predictions.create({
      model: CREDIT_PROBE_MODEL,
      input: { prompt: "credit check" },
    });
  } catch (err: any) {
    if (isInsufficientCreditError(err)) {
      await reportInsufficientCredit(config.apiKey, CREDIT_PROBE_MODEL, err?.message || String(err));
      report.error = "HTTP 402: a conta Replicate está sem saldo. Recarregue em https://replicate.com/account/billing";
    } else {
      report.error = `Falha ao criar a predição de teste: ${err?.message || err}`;
    }
    return report;
  }

  report.predictionId = prediction.id;
  let last: any = prediction;
  while (last?.status !== "succeeded" && last?.status !== "failed" && last?.status !== "canceled") {
    if (Date.now() - started > CREDIT_PROBE_TIMEOUT_MS) break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
    try {
      last = await (replicate as any).predictions.get(prediction.id);
    } catch (err: any) {
      report.error = `Erro ao acompanhar a predição: ${err?.message || err}`;
      return report;
    }
  }
  report.durationMs = Date.now() - started;

  if (last?.status === "succeeded") {
    report.ok = true;
    // Saldo confirmado: libera o fail-fast de 402 imediatamente.
    creditBlockedUntil = 0;
    creditFailureCount = 0;
    report.note = `Saldo confirmado: predição ${prediction.id} concluída em ${(report.durationMs / 1000).toFixed(1)}s.`;
  } else if (last?.status === "failed") {
    report.error = `Predição de teste falhou (saldo pode estar ok): ${last?.error || "erro desconhecido"}`;
  } else {
    report.error = `Timeout: predição ${prediction.id} ainda "${last?.status || "?"}" após ${Math.round(report.durationMs / 1000)}s.`;
  }
  return report;
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
