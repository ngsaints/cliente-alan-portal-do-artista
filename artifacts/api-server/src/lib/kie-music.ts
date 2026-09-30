import crypto from "crypto";
import { appSettingsTable } from "@workspace/db";
import { db } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  buildMusicPrompt,
  downloadAndSaveGeneratedAudio,
  getReplicateConfig,
  type MiniMaxMusicInput,
  type MusicGenerationTestResult,
  type ReplicateIntegrationReport,
  type ReplicatePredictionResponse,
} from "./replicate-music.js";
import { KIE_MODEL_PREFIX, stripProviderPrefix } from "./music-provider.js";
import { sendAdminAlert } from "./email.js";

/**
 * Provedor kie.ai (API Suno).
 *
 * Fluxo: cria a tarefa (POST /api/v1/jobs/createTask), acompanha por polling
 * (GET /api/v1/generate/record-info?taskId=) e baixa o áudio gerado.
 * Diferente do OpenRouter, a tarefa vive no servidor do kie.ai — o id salvo
 * (`kie:<taskId>`) continua consultável depois de um restart da API.
 */
const KIE_BASE_URL = "https://api.kie.ai";
/** "Modelo" da tarefa na API unificada do kie.ai (o modelo de música vai em input.model). */
const KIE_TASK_MODEL = "ai-music-api/generate";

/** Modelos de música publicados pelo kie.ai (Suno). */
export const KIE_MUSIC_MODELS = ["V6", "V6_MINI", "V6_WILD", "V5_5", "V5", "V4_5PLUS", "V4_5ALL", "V4_5", "V4"];
/** Modelos vigentes — os que o catálogo oferece ao admin (fallback sem chave). */
export const KIE_CURRENT_MODELS = ["V6", "V6_MINI", "V6_WILD"];

const KIE_MODELS_CACHE_MS = 30 * 60 * 1000;
let kieModelsCache: { at: number; ids: string[] } | null = null;

/** Só modelos de música (o /api/v1/models pode trazer modelos de chat junto). */
function isKieMusicModelId(id: string): boolean {
  return /^v\d/i.test(id) || /(suno|music|beat|song)/i.test(id);
}

/**
 * Modelos de música publicados pelo kie.ai (GET /api/v1/models, cache de 30min).
 * Sem chave (ou se a chamada falhar) devolve a lista fixa — o catálogo nunca fica vazio.
 */
export async function listKieMusicModels(): Promise<{ ids: string[]; live: boolean }> {
  const config = await getKieMusicConfig();
  if (config.apiKey && kieModelsCache && Date.now() - kieModelsCache.at < KIE_MODELS_CACHE_MS) {
    return { ids: kieModelsCache.ids, live: true };
  }
  if (config.apiKey) {
    try {
      const { status, body } = await kieFetch(config.apiKey, "/api/v1/models", {}, 12000);
      if (status < 400) {
        const raw: any[] = Array.isArray(body?.data)
          ? body.data
          : Array.isArray(body?.data?.list)
            ? body.data.list
            : Array.isArray(body?.data?.models)
              ? body.data.models
              : Array.isArray(body?.models)
                ? body.models
                : Array.isArray(body)
                  ? body
                  : [];
        const ids = [
          ...new Set(
            raw
              .map((m) => (typeof m === "string" ? m : m?.model ?? m?.modelId ?? m?.id ?? m?.name ?? ""))
              .map((s) => String(s).trim())
              .filter((id) => id && isKieMusicModelId(id))
          ),
        ];
        if (ids.length > 0) {
          kieModelsCache = { at: Date.now(), ids };
          return { ids, live: true };
        }
      }
    } catch {
      /* rede fora: usa a lista fixa */
    }
  }
  return { ids: [...KIE_MUSIC_MODELS], live: false };
}

/** Duração pedida por música (mesma referência de custo do catálogo). */
const KIE_SONG_SECONDS = 60;
const KIE_TIMEOUT_MS = 20 * 1000;
const KIE_POLL_CACHE_MS = 3 * 1000;
const KIE_TEST_TIMEOUT_MS = 3 * 60 * 1000;

const FAIL_FAST_MS = 5 * 60 * 1000;
const ADMIN_ALERT_INTERVAL_MS = 30 * 60 * 1000;
let creditBlockedUntil = 0;
let creditFailureCount = 0;
let lastAdminAlertAt = 0;
let lastCreditErrorAt = 0;

/** Erro de infraestrutura do gateway (não é culpa do artista). */
export class KieServiceError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "KieServiceError";
    this.code = code;
    this.status = status;
  }
}

// O artista não precisa saber de billing: é indisponibilidade temporária do gateway.
const NO_CREDIT_ARTIST_MESSAGE =
  "A geração de hits está temporariamente indisponível. Nossa equipe já foi avisada — tente novamente em alguns minutos.";

function noCreditError(): KieServiceError {
  return new KieServiceError(NO_CREDIT_ARTIST_MESSAGE, "KIE_NO_CREDIT", 503);
}

async function getSettingValue(key: string): Promise<string | null> {
  try {
    const rows = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, key));
    return rows[0]?.value?.trim() || null;
  } catch {
    return null;
  }
}

export interface KieMusicConfig {
  apiKey: string | null;
  /** Id do modelo sem prefixo (ex.: "V6"). */
  model: string;
  /** Id como está no banco/ajustes (ex.: "kie:V6"). */
  modelWithPrefix: string;
  enabled: boolean;
  modelSource: "plano" | "global";
}

export async function getKieMusicConfig(plano?: string): Promise<KieMusicConfig> {
  const base = await getReplicateConfig(plano);
  const apiKey = (await getSettingValue("kie_api_key")) || process.env.KIE_API_KEY || null;
  const disabled = (await getSettingValue("kie_enabled")) === "false";
  return {
    apiKey,
    model: stripProviderPrefix(base.model) || KIE_CURRENT_MODELS[0],
    modelWithPrefix: base.model,
    // Só gera no kie.ai se o modelo escolhido for dele.
    enabled: base.provider === "kie" && !!apiKey && !disabled,
    modelSource: base.modelSource,
  };
}

interface KieHttpResult {
  status: number;
  body: any;
}

/**
 * GET/POST com timeout e Bearer. A kie devolve o código de erro tanto no HTTP
 * quanto no corpo ({ code, msg, data }) — normalizamos nos dois casos.
 */
async function kieFetch(
  apiKey: string,
  path: string,
  init: RequestInit = {},
  timeoutMs = KIE_TIMEOUT_MS
): Promise<KieHttpResult> {
  const res = await fetch(`${KIE_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...((init.headers as Record<string, string>) || {}),
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text().catch(() => "");
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  const bodyCode = Number(body?.code);
  const status = Number.isFinite(bodyCode) && bodyCode >= 400 ? bodyCode : res.status;
  return { status, body };
}

function detailOf(body: any): string {
  if (!body) return "";
  if (typeof body.raw === "string" && body.raw) return body.raw;
  return String(body.msg || body.message || JSON.stringify(body).slice(0, 400));
}

/** Marca a falha de crédito, evita repetir a chamada e avisa o admin (no máx. 1x/30min). */
async function reportCreditFailure(model: string, detail: string): Promise<void> {
  creditFailureCount += 1;
  creditBlockedUntil = Date.now() + FAIL_FAST_MS;
  lastCreditErrorAt = Date.now();
  console.error(
    `[kie.ai] Conta sem créditos (HTTP 402) | modelo=${model} | ocorrências=${creditFailureCount} | ${detail.slice(0, 300)}`
  );
  if (Date.now() - lastAdminAlertAt < ADMIN_ALERT_INTERVAL_MS) return;
  lastAdminAlertAt = Date.now();
  void sendAdminAlert(
    "kie.ai sem créditos — geração de hits pausada",
    [
      "A conta do kie.ai (Suno) está sem saldo e a geração de músicas foi pausada automaticamente.",
      "",
      `Modelo: ${model}`,
      `Ocorrências nesta sessão: ${creditFailureCount}`,
      `Última resposta: ${detail.slice(0, 500)}`,
      "",
      "Recarga: https://kie.ai/credits",
      "Enquanto não houver saldo, novas tentativas são bloqueadas por 5 minutos para não gerar ruído.",
      "",
      "Portal do Artista",
    ].join("\n")
  );
}

/** Chave inválida/recusada (401/403): loga sempre e avisa o admin (com limite de frequência). */
async function reportAuthFailure(status: number, model: string, detail: string): Promise<void> {
  console.error(
    `[kie.ai] Recusa de autenticação (HTTP ${status}) | modelo=${model} | ${detail.slice(0, 300)} | confira kie_api_key no painel`
  );
  if (Date.now() - lastAdminAlertAt < ADMIN_ALERT_INTERVAL_MS) return;
  lastAdminAlertAt = Date.now();
  void sendAdminAlert(
    `kie.ai recusou a chave da IA (HTTP ${status}) — geração de hits parada`,
    [
      "O kie.ai está recusando as chamadas da geração de hits (chave inválida ou revogada).",
      "",
      `Modelo: ${model}`,
      `HTTP: ${status}`,
      `Resposta: ${detail.slice(0, 500)}`,
      "",
      "Confira o campo \"Chave de API kie.ai\" em Admin → Configurações → IA",
      "(obtida em https://kie.ai/api-key)",
      "",
      "Portal do Artista",
    ].join("\n")
  );
}

/** Trata 401/402/429 e devolve o erro pronto para o artista (ou null se não for caso de billing/auth). */
function serviceErrorFor(status: number, model: string, detail: string): KieServiceError | null {
  if (status === 402) {
    void reportCreditFailure(model, detail);
    return noCreditError();
  }
  if (status === 401 || status === 403) {
    void reportAuthFailure(status, model, detail);
    return new KieServiceError(
      "A geração de hits está indisponível no momento. Já avisamos a equipe — tente novamente em alguns minutos.",
      "KIE_NOT_AUTHORIZED",
      503
    );
  }
  if (status === 429) {
    return new KieServiceError(
      "Muitas gerações em andamento. Aguarde alguns instantes e tente de novo.",
      "KIE_RATE_LIMITED",
      429
    );
  }
  if (status === 422) {
    return new KieServiceError(
      "O kie.ai recusou os dados da música. Ajuste a letra ou o estilo e gere de novo.",
      "KIE_INVALID_INPUT",
      422
    );
  }
  if (status === 408) {
    return new KieServiceError(
      "O servidor da Suno demorou para responder (timeout > 10 min). Tente gerar novamente em instantes.",
      "KIE_TIMEOUT",
      504
    );
  }
  if (status === 501) {
    return new KieServiceError(
      "A tarefa de geração falhou no servidor do provedor. Tente gerar novamente.",
      "KIE_GENERATION_FAILED",
      502
    );
  }
  if (status === 455 || status === 500 || status === 505) {
    return new KieServiceError(
      "A geração de hits está indisponível no momento (provedor em manutenção ou serviço desativado). Tente novamente em alguns minutos.",
      "KIE_UNAVAILABLE",
      503
    );
  }
  return null;
}

// ─── Payload ────────────────────────────────────────────────────────────────

/**
 * Payload no modo custom (title + style + lyrics), que é o que usamos:
 * o estilo sai do `buildMusicPrompt` (gênero + clima + voz + produção + instruções do artista)
 * e a letra vai no campo `lyrics` (o `prompt` do kie também seria lido como letra).
 */
export function buildKieInput(input: MiniMaxMusicInput, model: string): Record<string, unknown> {
  const style = buildMusicPrompt(input).slice(0, 1000);
  const title = (input.title || "Meu hit").trim().slice(0, 80);
  const voice = (input.voice || "").toLowerCase();
  const instrumental = voice.includes("instrumental");
  let lyrics = (input.lyrics || "").trim();
  let isInstrumental = instrumental;

  if (!isInstrumental && !lyrics) {
    // Sem letra, o kie cantaria o estilo: melhor gerar instrumental do que cantar lixo.
    if ((input.prompt || "").trim()) lyrics = input.prompt.trim();
    else isInstrumental = true;
  }

  const payload: Record<string, unknown> = {
    custom_mode: true,
    instrumental: isInstrumental,
    model,
    title,
    style,
    variety: 1,
  };
  if (!isInstrumental) payload.lyrics = lyrics.slice(0, 5000);
  if (voice.includes("femin")) payload.vocal_gender = "f";
  else if (voice.includes("mascul")) payload.vocal_gender = "m";
  // duration só é aceita nos modelos V6 (documentação do kie.ai)
  if (/^V6/.test(model)) payload.duration = KIE_SONG_SECONDS;
  return payload;
}

// ─── Criação da tarefa ──────────────────────────────────────────────────────

async function createKieTask(apiKey: string, payload: Record<string, unknown>): Promise<string> {
  const primary = await kieFetch(
    apiKey,
    "/api/v1/jobs/createTask",
    { method: "POST", body: JSON.stringify({ model: KIE_TASK_MODEL, input: payload }) }
  );
  const primaryTaskId = primary.body?.data?.taskId;
  if (primary.status === 200 && primaryTaskId) return String(primaryTaskId);

  // Problema de conta/chave: o endpoint legado vai falhar igual — evita 2 chamadas e alerta duplo.
  if (primary.status === 401 || primary.status === 402 || primary.status === 403 || primary.status === 429) {
    const service = serviceErrorFor(primary.status, String(payload.model), detailOf(primary.body));
    if (service) throw service;
  }

  // Endpoint legado (formato plano, `customMode` camelCase) — cobre contas/modelos antigos.
  const legacyPayload: Record<string, unknown> = {
    customMode: true,
    instrumental: payload.instrumental,
    model: payload.model,
    title: payload.title,
    style: payload.style,
    prompt: payload.style,
    callBackUrl: "",
  };
  if (payload.lyrics) legacyPayload.lyrics = payload.lyrics;
  if (payload.vocal_gender) legacyPayload.vocal_gender = payload.vocal_gender;
  if (payload.duration) legacyPayload.duration = payload.duration;

  const legacy = await kieFetch(apiKey, "/api/v1/generate", {
    method: "POST",
    body: JSON.stringify(legacyPayload),
  });
  const legacyTaskId = legacy.body?.data?.taskId;
  if (legacy.status === 200 && legacyTaskId) return String(legacyTaskId);

  const status = primary.status >= 400 ? primary.status : legacy.status;
  const detail = detailOf(primary.body) || detailOf(legacy.body);
  const service = serviceErrorFor(status, String(payload.model), detail);
  if (service) throw service;
  throw new KieServiceError(
    `Não foi possível iniciar a geração no kie.ai: ${detail || `HTTP ${status}`}`,
    "KIE_CREATE_FAILED",
    status >= 400 ? status : 502
  );
}

export async function startKieMusicGeneration(
  input: MiniMaxMusicInput,
  opts: { plano?: string } = {}
): Promise<ReplicatePredictionResponse> {
  const config = await getKieMusicConfig(opts.plano);
  if (!config.apiKey) {
    console.error("[kie.ai] Chave de API não configurada — defina kie_api_key no Painel Administrativo.");
    void sendAdminAlert(
      "kie.ai sem chave de API — geração de hits indisponível",
      "A chave kie_api_key não está configurada e o modelo escolhido é do kie.ai, então a geração está bloqueada.\n\n" +
        "Cadastre a chave em Admin → Configurações → IA → kie.ai (https://kie.ai/api-key).\n\nPortal do Artista"
    );
    throw new KieServiceError(
      "A geração de hits está indisponível no momento. Tente novamente mais tarde.",
      "KIE_NOT_CONFIGURED",
      503
    );
  }
  // Fail-fast: evita martelar a API (e encher o log) enquanto a conta está sem saldo.
  if (Date.now() < creditBlockedUntil) {
    console.warn("[kie.ai] Fail-fast: conta sem créditos recentemente — nova chamada evitada.");
    throw noCreditError();
  }

  const payload = buildKieInput(input, config.model);
  const taskId = await createKieTask(config.apiKey, payload);
  // Chamada ok: libera o fail-fast de créditos.
  creditBlockedUntil = 0;
  console.log(`[kie.ai] Tarefa criada — modelo=${config.model} taskId=${taskId} titulo="${input.title || ""}"`);
  return { id: `${KIE_MODEL_PREFIX}${taskId}`, status: "processing", output: null, error: null, logs: null };
}

// ─── Status ─────────────────────────────────────────────────────────────────

export const FAILED_STATUSES: Record<string, string> = {
  CREATE_TASK_FAILED: "O kie.ai não conseguiu criar a geração. Tente novamente em instantes.",
  GENERATE_AUDIO_FAILED: "O kie.ai não conseguiu gerar o áudio desta vez. Sua cota foi devolvida — tente de novo.",
  CALLBACK_EXCEPTION: "A geração foi interrompida pelo provedor. Tente gerar novamente.",
  SENSITIVE_WORD_ERROR:
    "O kie.ai rejeitou a música por conteúdo inadequado. Ajuste a letra (evite letras de terceiros) e gere de novo.",
};

const statusCache = new Map<string, { at: number; value: ReplicatePredictionResponse & { alreadySaved?: boolean } }>();

/** Atualiza a predição no cache em memória (ex.: ao receber webhook de conclusão do kie.ai). */
export function setKieStatusCache(
  taskId: string,
  result: ReplicatePredictionResponse & { alreadySaved?: boolean }
): void {
  statusCache.set(taskId, { at: Date.now(), value: result });
}

/** Gera um link de download temporário (20 min) para o arquivo gerado no kie.ai. */
export async function resolveDownloadUrl(apiKey: string, audioUrl: string): Promise<string> {
  try {
    const { status, body } = await kieFetch(
      apiKey,
      "/api/v1/common/download-url",
      { method: "POST", body: JSON.stringify({ url: audioUrl }) },
      10000
    );
    if (status === 200 && typeof body?.data === "string" && body.data) return body.data;
  } catch {
    /* usa a URL original */
  }
  return audioUrl;
}

/**
 * Converte a URL de um arquivo gerado pelo kie.ai em um link de download temporário (válido por 20 minutos).
 * Chama POST /api/v1/common/download-url usando a chave configurada no sistema.
 */
export async function getKieDownloadUrl(fileUrl: string): Promise<string> {
  const config = await getKieMusicConfig();
  if (!config.apiKey) throw new Error("Chave do kie.ai (kie_api_key) não configurada no sistema.");
  return await resolveDownloadUrl(config.apiKey, fileUrl);
}


/** Consulta o estado de uma geração do kie.ai (id `kie:<taskId>`). */
export async function getKiePredictionStatus(
  predictionId: string
): Promise<ReplicatePredictionResponse & { alreadySaved?: boolean }> {
  const taskId = stripProviderPrefix(predictionId);
  const cached = statusCache.get(taskId);
  if (cached && Date.now() - cached.at < KIE_POLL_CACHE_MS) return cached.value;

  const config = await getKieMusicConfig();
  if (!config.apiKey) throw new KieServiceError("kie_api_key não configurada.", "KIE_NOT_CONFIGURED", 503);

  const { status, body } = await kieFetch(
    config.apiKey,
    `/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`,
    {},
    15000
  );
  if (status >= 400) {
    const detail = detailOf(body);
    const service = serviceErrorFor(status, config.model, detail);
    if (service) throw service;
    if (status === 404) {
      return {
        id: predictionId,
        status: "failed",
        output: null,
        error: "A geração não foi encontrada no kie.ai (tarefa expirada). Gere novamente.",
        logs: null,
      };
    }
    throw new KieServiceError(`Erro ao consultar a geração no kie.ai: ${detail || `HTTP ${status}`}`, "KIE_STATUS_FAILED", status);
  }

  const data = body?.data;
  const remoteStatus = String(data?.status || "PENDING");
  let result: ReplicatePredictionResponse & { alreadySaved?: boolean };

  if (remoteStatus === "SUCCESS") {
    const tracks: any[] = Array.isArray(data?.response?.sunoData) ? data.response.sunoData : [];
    const audioUrl = tracks[0]?.audioUrl || null;
    if (audioUrl) {
      result = {
        id: predictionId,
        status: "succeeded",
        // A rota baixa e salva (R2/local) — ainda não está salvo por nós.
        output: await resolveDownloadUrl(config.apiKey, audioUrl),
        error: null,
        logs: null,
        alreadySaved: false,
      };
    } else {
      result = {
        id: predictionId,
        status: "failed",
        output: null,
        error: "O kie.ai concluiu a tarefa mas não devolveu o áudio. Tente gerar de novo.",
        logs: null,
      };
    }
  } else if (FAILED_STATUSES[remoteStatus]) {
    const providerMessage = String(data?.errorMessage || "").slice(0, 300);
    result = {
      id: predictionId,
      status: "failed",
      output: null,
      error: providerMessage ? `${FAILED_STATUSES[remoteStatus]} (${providerMessage})` : FAILED_STATUSES[remoteStatus],
      logs: null,
    };
  } else {
    result = { id: predictionId, status: "processing", output: null, error: null, logs: null };
  }

  statusCache.set(taskId, { at: Date.now(), value: result });
  return result;
}

// ─── Créditos / verificação (grátis) ────────────────────────────────────────

export interface KieCreditDetails {
  ok: boolean;
  code: number;
  msg: string;
  credits: number | null;
  error?: string;
}

/**
 * Consulta detalhada do saldo de créditos da conta kie.ai (GET /api/v1/chat/credit).
 * Trata os códigos de resposta especificados no OpenAPI (200, 401, 402, 404, 408, 422, 429, 455, 500, 501, 505).
 */
export async function getKieCreditDetails(apiKey?: string | null): Promise<KieCreditDetails> {
  const key = apiKey ?? (await getKieMusicConfig()).apiKey;
  if (!key) {
    return {
      ok: false,
      code: 401,
      msg: "Chave do kie.ai (kie_api_key) não configurada no sistema.",
      credits: null,
      error: "Chave ausente",
    };
  }
  try {
    const { status, body } = await kieFetch(key, "/api/v1/chat/credit", {}, 10000);
    const code = Number(body?.code) || status;
    const msg = String(body?.msg || detailOf(body) || (code === 200 ? "success" : `HTTP ${status}`));

    if (code === 200 && body?.data !== null && body?.data !== undefined) {
      const val = Number(body.data);
      return {
        ok: true,
        code: 200,
        msg,
        credits: Number.isFinite(val) ? val : 0,
      };
    }

    return {
      ok: false,
      code,
      msg,
      credits: code === 402 ? 0 : null,
      error: msg,
    };
  } catch (err: any) {
    return {
      ok: false,
      code: 500,
      msg: err?.message || "Falha na comunicação com o kie.ai",
      credits: null,
      error: err?.message,
    };
  }
}

/**
 * Consulta simples do saldo de créditos da conta kie.ai (GET /api/v1/chat/credit).
 * Retorna o número de créditos restantes ou null em caso de falha/chave inválida.
 */
export async function getKieCredits(apiKey?: string | null): Promise<number | null> {
  const details = await getKieCreditDetails(apiKey);
  return details.ok ? details.credits : (details.code === 402 ? 0 : null);
}

/**
 * Verificação de integração (grátis): confere chave, saldo e modelo escolhido
 * sem criar nenhuma geração.
 */
export async function testKieIntegration(): Promise<ReplicateIntegrationReport> {
  const config = await getKieMusicConfig();
  const errors: string[] = [];
  const report: ReplicateIntegrationReport = {
    ok: false,
    enabled: config.enabled,
    hasKey: !!config.apiKey,
    keyHint: config.apiKey ? `${config.apiKey.slice(0, 8)}…` : null,
    model: config.modelWithPrefix,
    account: null,
    modelAccessible: false,
    creditBlocked: creditBlockedUntil > Date.now(),
    creditFailures: creditFailureCount,
    lastCreditErrorAt: lastCreditErrorAt ? new Date(lastCreditErrorAt).toISOString() : null,
    errors,
  };

  if (!config.apiKey) {
    errors.push("kie_api_key não configurada no Painel Administrativo.");
    return report;
  }
  if ((await getSettingValue("kie_enabled")) === "false") {
    errors.push("Gateway kie.ai desativado (kie_enabled = false).");
  }
  const { ids: kieIds } = await listKieMusicModels();
  if (!kieIds.includes(config.model) && !KIE_MUSIC_MODELS.includes(config.model)) {
    errors.push(`Modelo "${config.model}" não existe no kie.ai (use um destes: ${kieIds.slice(0, 8).join(", ")}).`);
  } else {
    report.modelAccessible = true;
  }

  try {
    const details = await getKieCreditDetails(config.apiKey);
    if (!details.ok && details.code !== 402) {
      errors.push(`kie.ai recusou a verificação da conta (código ${details.code}: ${details.msg}).`);
    } else {
      const credits = details.credits ?? 0;
      report.account = `saldo ${credits} créditos`;
      if (credits <= 0 || details.code === 402) {
        errors.push("A conta do kie.ai está sem créditos — recarregue em https://kie.ai/credits.");
      }
    }
  } catch (err: any) {
    errors.push(`Erro ao consultar créditos do kie.ai: ${err?.message || err}`);
  }

  if (report.creditBlocked) {
    errors.push("Bloqueio por falta de crédito ativo: a geração está pausada por 5 minutos após o último HTTP 402.");
  }

  // O Replicate é o fallback automático quando o kie.ai falhar por infraestrutura.
  const replicateKey = (await getSettingValue("replicate_api_key")) || process.env.REPLICATE_API_TOKEN || null;
  if (!replicateKey) {
    errors.push("replicate_api_key ausente — sem fallback para o Replicate se o kie.ai falhar.");
  } else if ((await getSettingValue("replicate_enabled")) === "false") {
    errors.push("Replicate desativado (replicate_enabled = false) — não haverá fallback se o kie.ai falhar.");
  }

  report.ok = errors.length === 0;
  return report;
}

// ─── Teste pago ─────────────────────────────────────────────────────────────

/**
 * Teste PAGO: roda o mesmo caminho do Vivi Studio de ponta a ponta —
 * cria a tarefa, acompanha, baixa o áudio e devolve o link tocável.
 * Uso: Painel Administrativo ("Testar geração de música").
 */
export async function testKieMusicGeneration(
  opts: { plano?: string; prompt?: string; lyrics?: string; title?: string } = {}
): Promise<MusicGenerationTestResult> {
  const config = await getKieMusicConfig(opts.plano);
  const report: MusicGenerationTestResult = {
    ok: false,
    model: config.model,
    modelSource: config.modelSource,
    predictionId: null,
    audioUrl: null,
    durationMs: null,
    status: null,
    error: null,
  };
  if (!config.enabled || !config.apiKey) {
    report.error =
      "kie_api_key não configurada (ou modelo de outro provedor selecionado) no Painel Administrativo.";
    return report;
  }

  const input: MiniMaxMusicInput = {
    prompt: opts.prompt?.trim() || "sertanejo acústico romântico, guitarra limpa, voz masculina suave",
    lyrics: opts.lyrics?.trim() || "[Verso]\nNoite calma, seu nome na canção\n[Refrão]\nVou cantar até o sol nascer",
    genre: "",
    mood: "",
    voice: "Masculina",
    title: opts.title?.trim() || "teste admin kie",
  };

  const started = Date.now();
  let taskId: string;
  try {
    if (Date.now() < creditBlockedUntil) throw noCreditError();
    taskId = await createKieTask(config.apiKey, buildKieInput(input, config.model));
    report.predictionId = `${KIE_MODEL_PREFIX}${taskId}`;
  } catch (err: any) {
    report.durationMs = Date.now() - started;
    report.error = err?.message || String(err);
    return report;
  }

  let last: any = null;
  while (Date.now() - started < KIE_TEST_TIMEOUT_MS) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    try {
      const { status, body } = await kieFetch(
        config.apiKey!,
        `/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`,
        {},
        15000
      );
      if (status >= 400) {
        report.error = detailOf(body) || `HTTP ${status}`;
        report.durationMs = Date.now() - started;
        return report;
      }
      last = body?.data;
      if (last?.status === "SUCCESS" || FAILED_STATUSES[last?.status]) break;
    } catch (err: any) {
      report.error = `Erro ao acompanhar a geração: ${err?.message || err}`;
      report.durationMs = Date.now() - started;
      return report;
    }
  }
  report.durationMs = Date.now() - started;
  report.status = last?.status || null;

  if (last?.status === "SUCCESS") {
    const tracks: any[] = Array.isArray(last?.response?.sunoData) ? last.response.sunoData : [];
    const remote = tracks[0]?.audioUrl;
    if (remote) {
      try {
        const url = await resolveDownloadUrl(config.apiKey, remote);
        report.audioUrl = await downloadAndSaveGeneratedAudio(url, input.title as string);
      } catch (err: any) {
        report.error = `Áudio gerado, mas o download falhou: ${err?.message || err}`;
        return report;
      }
    }
    report.ok = !!report.audioUrl;
    if (!report.ok) report.error = "Tarefa concluída, mas o kie.ai não devolveu o áudio.";
  } else if (last?.status && FAILED_STATUSES[last.status]) {
    report.error = FAILED_STATUSES[last.status];
  } else {
    report.error = `Tempo esgotado (${Math.round(report.durationMs / 1000)}s): geração ainda "${last?.status || "?"}".`;
  }
  return report;
}

export interface KieBase64UploadResult {
  fileName: string;
  filePath: string;
  downloadUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt?: string;
}

/**
 * Envia um arquivo em Base64 para o kie.ai (POST /api/file-base64-upload)
 * e retorna a URL pública temporária (válida por 24h a 3 dias).
 *
 * Suporta tanto string Base64 pura quanto Data URL (ex: data:image/png;base64,... ou data:audio/mpeg;base64,...).
 * Ideal para fornecer imagens de referência ou áudios de guia/remix para modelos de IA.
 */
export async function uploadKieBase64File(
  base64Data: string,
  fileName?: string,
  uploadPath = "staging"
): Promise<KieBase64UploadResult> {
  const config = await getKieMusicConfig();
  if (!config.apiKey) {
    throw new Error("Chave do kie.ai (kie_api_key) não configurada no sistema.");
  }

  const payload: Record<string, unknown> = {
    base64Data,
    uploadPath: uploadPath.replace(/^\/+|\/+$/g, "") || "staging",
  };
  if (fileName) {
    payload.fileName = fileName.trim();
  }

  const { status, body } = await kieFetch(
    config.apiKey,
    "/api/file-base64-upload",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    20000
  );

  if (status >= 400 || !body?.success) {
    const errorMsg = detailOf(body) || `Falha no upload Base64 para o kie.ai (HTTP ${status})`;
    throw new Error(errorMsg);
  }

  const data = body.data || {};
  return {
    fileName: data.fileName || fileName || "upload",
    filePath: data.filePath || "",
    downloadUrl: data.downloadUrl || data.fileUrl || "",
    fileSize: Number(data.fileSize) || 0,
    mimeType: data.mimeType || "",
    uploadedAt: data.uploadedAt || new Date().toISOString(),
  };
}

export interface KieUrlUploadResult {
  fileName: string;
  filePath: string;
  downloadUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt?: string;
}

/**
 * Faz o upload de um arquivo remoto a partir de uma URL pública (HTTP/HTTPS) para o kie.ai (POST /api/file-url-upload).
 * O kie.ai baixa o arquivo diretamente (timeout de 30s, recomendado até 100MB) e o armazena na sua CDN temporária.
 *
 * Ideal para importar recursos da web, mídias externas ou URLs de áudio/imagem para processamento imediato pela IA.
 */
export async function uploadKieUrlFile(
  fileUrl: string,
  fileName?: string,
  uploadPath = "staging"
): Promise<KieUrlUploadResult> {
  const config = await getKieMusicConfig();
  if (!config.apiKey) {
    throw new Error("Chave do kie.ai (kie_api_key) não configurada no sistema.");
  }

  const payload: Record<string, unknown> = {
    fileUrl: fileUrl.trim(),
    uploadPath: uploadPath.replace(/^\/+|\/+$/g, "") || "staging",
  };
  if (fileName) {
    payload.fileName = fileName.trim();
  }

  const { status, body } = await kieFetch(
    config.apiKey,
    "/api/file-url-upload",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    35000 // Timeout estendido para download remoto pelo kie.ai
  );

  if (status >= 400 || !body?.success) {
    const errorMsg = detailOf(body) || `Falha no upload por URL para o kie.ai (HTTP ${status})`;
    throw new Error(errorMsg);
  }

  const data = body.data || {};
  return {
    fileName: data.fileName || fileName || "downloaded-file",
    filePath: data.filePath || "",
    downloadUrl: data.downloadUrl || data.fileUrl || "",
    fileSize: Number(data.fileSize) || 0,
    mimeType: data.mimeType || "",
    uploadedAt: data.uploadedAt || new Date().toISOString(),
  };
}

// ─── Webhook HMAC Security Verification ────────────────────────────────────

/**
 * Obtém a chave secreta HMAC para validação dos callbacks de Webhook do kie.ai.
 * Busca primeiro em `kie_webhook_hmac_key` (banco de configurações) e depois nas variáveis de ambiente.
 */
export async function getKieWebhookHmacKey(): Promise<string | null> {
  return (
    (await getSettingValue("kie_webhook_hmac_key")) ||
    process.env.KIE_WEBHOOK_HMAC_KEY ||
    process.env.WEBHOOK_HMAC_KEY ||
    null
  );
}

export interface KieWebhookVerificationResult {
  valid: boolean;
  error?: string;
  taskId?: string;
  timestamp?: string;
}

/** Janela de tolerância do timestamp (segundos). Aceita KIE_WEBHOOK_TOLERANCE_SECONDS. */
const DEFAULT_WEBHOOK_TOLERANCE_SECONDS = 300;

function webhookToleranceSeconds(): number {
  const raw = Number(process.env.KIE_WEBHOOK_TOLERANCE_SECONDS);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_WEBHOOK_TOLERANCE_SECONDS;
}

/**
 * Assinaturas já processadas (taskId.timestamp.assinatura) -> instante de expiração.
 * Impede replay de uma assinatura válida dentro da janela de tolerância.
 */
const processedWebhookSignatures = new Map<string, number>();
const MAX_PROCESSED_SIGNATURES = 5000;

function pruneProcessedSignatures(nowSeconds: number): void {
  for (const [key, expiresAt] of processedWebhookSignatures) {
    if (expiresAt <= nowSeconds) processedWebhookSignatures.delete(key);
  }
  // Teto de memória mesmo se o prune não liberar espaço (entries vivem pouco tempo).
  if (processedWebhookSignatures.size > MAX_PROCESSED_SIGNATURES) {
    const excess = processedWebhookSignatures.size - MAX_PROCESSED_SIGNATURES;
    let removed = 0;
    for (const key of processedWebhookSignatures.keys()) {
      if (removed >= excess) break;
      processedWebhookSignatures.delete(key);
      removed++;
    }
  }
}

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string | undefined {
  const raw = headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function kieWebhookReplayKey(taskId: string, timestamp: string, signature: string): string {
  return `${taskId}.${timestamp}.${signature}`;
}

/**
 * Libera a marca de replay de uma entrega que falhou no processamento.
 * Sem isso, um 500 temporário faria o kie.ai ser bloqueado ao reenviar o mesmo callback.
 * Chamado apenas quando o handler devolve erro — entregas bem-sucedidas seguem bloqueadas.
 */
export function releaseKieWebhookReplay(
  headers: Record<string, string | string[] | undefined>,
  body: any
): void {
  const timestamp = headerValue(headers, "x-webhook-timestamp");
  const signature = headerValue(headers, "x-webhook-signature");
  const taskId = body?.data?.task_id || body?.data?.taskId || body?.taskId;
  if (!timestamp || !signature || !taskId) return;
  processedWebhookSignatures.delete(kieWebhookReplayKey(String(taskId), timestamp, signature));
}

/**
 * Valida a assinatura de segurança HMAC-SHA256 enviada nos headers do Webhook do kie.ai.
 *
 * Headers esperados:
 * - X-Webhook-Timestamp: timestamp unix em segundos
 * - X-Webhook-Signature: assinatura HMAC-SHA256 codificada em Base64
 *
 * Algoritmo:
 * base64(HMAC-SHA256(taskId + "." + timestamp, webhookHmacKey))
 *
 * Proteções:
 * - crypto.timingSafeEqual sobre os bytes decodificados (comparação em tempo constante);
 * - janela de timestamp (replay de requisição antiga é recusada);
 * - assinatura já vista dentro da janela é recusada (replay da mesma entrega).
 */
export function verifyKieWebhookSignature(
  headers: Record<string, string | string[] | undefined>,
  body: any,
  secret: string
): KieWebhookVerificationResult {
  const timestamp = headerValue(headers, "x-webhook-timestamp");
  const receivedSignature = headerValue(headers, "x-webhook-signature");

  if (!timestamp || !receivedSignature) {
    return { valid: false, error: "Missing signature headers" };
  }

  const taskId = body?.data?.task_id || body?.data?.taskId || body?.taskId;
  if (!taskId) {
    return { valid: false, error: "Missing task_id" };
  }

  const sentAt = Number(timestamp);
  if (!Number.isInteger(sentAt) || sentAt <= 0) {
    return { valid: false, error: "Invalid timestamp", taskId, timestamp };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const tolerance = webhookToleranceSeconds();
  if (Math.abs(nowSeconds - sentAt) > tolerance) {
    return {
      valid: false,
      error: `Timestamp outside allowed window (+/-${tolerance}s)`,
      taskId,
      timestamp,
    };
  }

  try {
    const dataToSign = `${taskId}.${timestamp}`;
    const computedSignature = crypto
      .createHmac("sha256", secret)
      .update(dataToSign)
      .digest("base64");

    // Compara os bytes decodificados: base64 tem representações não canônicas
    // (padding/espaços diferentes) que quebrariam uma comparação literal.
    const expectedBuf = Buffer.from(computedSignature, "base64");
    const receivedBuf = Buffer.from(receivedSignature, "base64");

    if (expectedBuf.length === 0 || expectedBuf.length !== receivedBuf.length) {
      return { valid: false, error: "Invalid signature", taskId, timestamp };
    }

    if (!crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
      return { valid: false, error: "Invalid signature", taskId, timestamp };
    }

    // Replay: mesma assinatura entregue mais de uma vez na janela.
    pruneProcessedSignatures(nowSeconds);
    const replayKey = kieWebhookReplayKey(taskId, timestamp, receivedSignature);
    if (processedWebhookSignatures.has(replayKey)) {
      return { valid: false, error: "Replay detected", taskId, timestamp };
    }
    processedWebhookSignatures.set(replayKey, nowSeconds + tolerance);

    return { valid: true, taskId, timestamp };
  } catch (err: any) {
    return { valid: false, error: `Signature verification error: ${err?.message || err}`, taskId };
  }
}



