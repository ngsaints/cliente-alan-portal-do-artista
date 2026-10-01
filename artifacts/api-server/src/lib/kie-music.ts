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
import { sendAdminAlert, getPortalUrl } from "./email.js";

/**
 * Provedor kie.ai (API Suno).
 *
 * Fluxo: cria a tarefa (POST /api/v1/jobs/createTask), acompanha por polling
 * (GET /api/v1/generate/record-info?taskId=) e baixa o áudio gerado.
 * Diferente do OpenRouter, a tarefa vive no servidor do kie.ai — o id salvo
 * (`kie:<taskId>`) continua consultável depois de um restart da API.
 */
const KIE_BASE_URL = "https://api.kie.ai";
/**
 * Host dos endpoints de arquivo (upload de imagem/áudio) — é outro domínio e NÃO
 * aceita os caminhos do api.kie.ai (lá dá 404). Testado em 2026-10-01.
 */
const KIE_UPLOAD_BASE_URL = "https://kieai.redpandaai.co";
/** "Modelo" da tarefa na API unificada do kie.ai (o modelo de música vai em input.model). */
const KIE_TASK_MODEL = "ai-music-api/generate";
/** Tarefa de cover: transforma um áudio enviado pelo artista mantendo a melodia (Suno). */
const KIE_COVER_TASK_MODEL = "ai-music-api/upload-and-cover-audio";
/** Tarefa de extensão: continua um áudio a partir de um ponto, preservando o estilo (Suno). */
const KIE_EXTEND_TASK_MODEL = "ai-music-api/upload-and-extend-audio";
/** Fonte de áudio pode ter no máximo 8 minutos (limite das tarefas de cover/estender). */
export const KIE_SOURCE_MAX_SECONDS = 8 * 60;
/** Título aceita até 100 caracteres na extensão (a cover limita em 80). */
const KIE_EXTEND_TITLE_MAX = 100;

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

/**
 * Duração pedida ao Suno (só nos modelos V6, faixa 10–360s).
 * Um valor fixo de 60s cortava a música no meio da letra (150 palavras cabem em
 * ~3 min, não em 1), então a duração sai do tamanho da letra via
 * `estimateSongSeconds` e o admin pode forçar um valor fixo em `kie_music_seconds`.
 */
const KIE_SONG_SECONDS_MIN = 90;
const KIE_SONG_SECONDS_MAX = 360;
const KIE_TIMEOUT_MS = 20 * 1000;
const KIE_POLL_CACHE_MS = 3 * 1000;
const KIE_TEST_TIMEOUT_MS = 3 * 60 * 1000;

const FAIL_FAST_MS = 5 * 60 * 1000;
const ADMIN_ALERT_INTERVAL_MS = 30 * 60 * 1000;
let creditBlockedUntil = 0;
let creditFailureCount = 0;
let lastAdminAlertAt = 0;
let lastCreditErrorAt = 0;
let callBackUrlLogged = false;

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
  timeoutMs = KIE_TIMEOUT_MS,
  baseUrl: string = KIE_BASE_URL
): Promise<KieHttpResult> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      // Só JSON quando o corpo é string: FormData (upload de áudio) precisa do boundary do fetch.
      ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
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
 * Peso entre 0 e 1 (2 casas) para os ajustes das tarefas com áudio fonte
 * (cover e estender). Valor ausente/inválido → `null` (campo opcional: melhor não enviar).
 */
function coverWeight(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(1, Math.max(0, Math.round(n * 100) / 100));
}

/**
 * Tarefa do kie.ai para o pedido: estender quando há áudio fonte + ponto de
 * continuação, cover quando há só o áudio de referência, geração do zero quando
 * não há nenhum dos dois. Vai no campo `model` do createTask.
 */
export function kieTaskModelFor(input: MiniMaxMusicInput): string {
  if (input.extendAudioUrl?.trim()) return KIE_EXTEND_TASK_MODEL;
  return input.coverAudioUrl?.trim() ? KIE_COVER_TASK_MODEL : KIE_TASK_MODEL;
}

/**
 * Ponto de continuação do modo estender, em segundos: maior que 0 e menor que a
 * duração máxima da fonte (8 min). Fora da faixa devolve `null` e a rota recusa
 * o pedido antes de gastar crédito.
 */
export function parseContinueAt(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n >= KIE_SOURCE_MAX_SECONDS) return null;
  return Math.round(n * 10) / 10;
}

/**
 * Payload no modo custom (title + style + lyrics), que é o que usamos:
 * o estilo sai do `buildMusicPrompt` (gênero + clima + voz + produção + instruções do artista)
 * e a letra vai no campo `lyrics` (o `prompt` do kie também seria lido como letra).
 *
 * Com `coverAudioUrl` o payload vira o do `ai-music-api/upload-and-cover-audio`:
 * a melodia do áudio enviado é preservada e o estilo/letra entra por cima.
 * Nesse modo a letra é opcional — sem ela o próprio áudio de referência conduz a faixa.
 *
 * Com `extendAudioUrl` + `continueAt` o payload vira o do
 * `ai-music-api/upload-and-extend-audio`: a faixa é continuada a partir do ponto
 * escolhido, preservando o estilo — letra também é opcional.
 */
/**
 * Duração (segundos) que o Suno precisa para cantar a letra inteira.
 *
 * Calibrado com hits reais do Estúdio: 150 palavras foram cortadas aos 118s com
 * a duração fixa de 60s. Usa ~1 palavra por segundo de canto + 30s de instrumental
 * de abertura/final, sempre dentro da faixa 10–360 aceita pelo kie.ai.
 */
export function estimateSongSeconds(lyrics: string): number {
  const words = (lyrics || "")
    .replace(/\[[^\]]*\]/g, " ") // tags de seção ([Verse], [Chorus]...) não são cantadas
    .split(/\s+/)
    .filter(Boolean).length;
  const estimate = words + 30;
  if (estimate > KIE_SONG_SECONDS_MAX) {
    console.warn(
      `[kie.ai] Letra longa (${words} palavras) — duração limitada a ${KIE_SONG_SECONDS_MAX}s; a faixa pode sair cortada.`
    );
  }
  return Math.min(KIE_SONG_SECONDS_MAX, Math.max(KIE_SONG_SECONDS_MIN, estimate));
}

/**
 * Duração da tarefa: o valor fixo `kie_music_seconds` do painel (10–360) quando
 * o admin quiser travar, senão o cálculo pela letra.
 */
async function resolveSongSeconds(lyrics: string): Promise<number> {
  const fixed = Number((await getSettingValue("kie_music_seconds")) || "");
  if (Number.isFinite(fixed) && fixed >= 10 && fixed <= 360) return Math.round(fixed);
  return estimateSongSeconds(lyrics);
}

export function buildKieInput(
  input: MiniMaxMusicInput,
  model: string,
  opts: { duration?: number } = {}
): Record<string, unknown> {
  // Extensão nasce do áudio fonte: essa tarefa nem aceita `duration`.
  if (input.extendAudioUrl?.trim()) return buildKieExtendInput(input, model);
  const duration = opts.duration ?? estimateSongSeconds(input.lyrics);
  if (input.coverAudioUrl?.trim()) return buildKieCoverInput(input, model, duration);

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
  if (/^V6/.test(model)) payload.duration = duration;
  return payload;
}

/**
 * Payload do cover (Suno upload-and-cover-audio). Campos obrigatórios da API:
 * `upload_url`, `instrumental` e `model` (versão do modelo, ex.: "V6").
 * `audio_weight` (fidelidade ao áudio enviado) e `style_weight` (fidelidade ao estilo
 * pedido) são as "barrinhas" do Estúdio — 0 a 1, 2 casas decimais.
 */
function buildKieCoverInput(input: MiniMaxMusicInput, model: string, duration: number): Record<string, unknown> {
  const title = (input.title || "Meu hit").trim().slice(0, 80);
  const voice = (input.voice || "").toLowerCase();
  const isInstrumental = voice.includes("instrumental");
  const lyrics = (input.lyrics || "").trim();
  const style = buildMusicPrompt(input).slice(0, 1000);

  const payload: Record<string, unknown> = {
    upload_url: input.coverAudioUrl!.trim(),
    instrumental: isInstrumental,
    model,
    title,
    variety: 1,
  };
  if (style) payload.style = style;
  // Com a fonte enviada a letra é opcional: vazia, não envia (o áudio conduz a faixa).
  if (!isInstrumental && lyrics) payload.lyrics = lyrics.slice(0, 5000);
  if (!isInstrumental) {
    if (voice.includes("femin")) payload.vocal_gender = "f";
    else if (voice.includes("mascul")) payload.vocal_gender = "m";
  }
  // duration só é aceita nos modelos V6 (documentação do kie.ai)
  if (/^V6/.test(model)) payload.duration = duration;

  const audioWeight = coverWeight(input.audioWeight);
  if (audioWeight !== null) payload.audio_weight = audioWeight;
  const styleWeight = coverWeight(input.styleWeight);
  if (styleWeight !== null) payload.style_weight = styleWeight;
  return payload;
}

/**
 * Payload da extensão (Suno upload-and-extend-audio): continua o áudio fonte a
 * partir de `continue_at`, preservando o estilo. Obrigatórios são `upload_url`,
 * `instrumental` e `model`; `title` (até 100), `style`, `lyrics` e os pesos são
 * opcionais.
 *
 * Diferenças em relação à cover:
 *  - `continue_at` obrigatório (maior que 0 e menor que a duração da fonte);
 *  - **não** envia `duration` (a faixa nasce do áudio enviado) nem `custom_mode`
 *    (a API não aceita simple mode nesta tarefa).
 */
function buildKieExtendInput(input: MiniMaxMusicInput, model: string): Record<string, unknown> {
  const title = (input.title || "Meu hit").trim().slice(0, KIE_EXTEND_TITLE_MAX);
  const voice = (input.voice || "").toLowerCase();
  const isInstrumental = voice.includes("instrumental");
  const lyrics = (input.lyrics || "").trim();
  const style = buildMusicPrompt(input).slice(0, 1000);
  // A rota já validou; aqui só normaliza (1 casa decimal, como manda a faixa 0–8min).
  const continueAt = parseContinueAt(input.continueAt);

  const payload: Record<string, unknown> = {
    upload_url: input.extendAudioUrl!.trim(),
    instrumental: isInstrumental,
    model,
    title,
    variety: 1,
    ...(continueAt !== null ? { continue_at: continueAt } : {}),
  };
  if (style) payload.style = style;
  // Com a fonte enviada a letra é opcional: vazia, não envia (o áudio conduz a faixa).
  if (!isInstrumental && lyrics) payload.lyrics = lyrics.slice(0, 5000);
  if (!isInstrumental) {
    if (voice.includes("femin")) payload.vocal_gender = "f";
    else if (voice.includes("mascul")) payload.vocal_gender = "m";
  }

  const audioWeight = coverWeight(input.audioWeight);
  if (audioWeight !== null) payload.audio_weight = audioWeight;
  const styleWeight = coverWeight(input.styleWeight);
  if (styleWeight !== null) payload.style_weight = styleWeight;
  return payload;
}

// ─── Criação da tarefa ──────────────────────────────────────────────────────

/**
 * URL pública para o kie.ai entregar o callback de conclusão (campo de topo
 * `callBackUrl` do createTask). O nginx encaminha `/webhooks/*` para a API.
 * Sem ela o hit só termina quando o Estúdio consultar o status — se o artista
 * fechar a aba, a geração fica pendente.
 * Retorna string vazia em ambiente local (kie.ai não alcança localhost).
 */
async function kieCallBackUrl(): Promise<string> {
  try {
    const explicit = (process.env.KIE_CALLBACK_URL || "").trim();
    if (explicit) return /^https:\/\//i.test(explicit) ? explicit : "";
    const base = (await getPortalUrl()).trim().replace(/\/+$/, "");
    if (!/^https:\/\//i.test(base)) return "";
    if (/\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)([:/]|$)/i.test(base)) return "";
    return `${base}/webhooks/kie`;
  } catch {
    return "";
  }
}

async function createKieTask(
  apiKey: string,
  payload: Record<string, unknown>,
  taskModel: string = KIE_TASK_MODEL
): Promise<string> {
  const callBackUrl = await kieCallBackUrl();
  if (!callBackUrlLogged) {
    callBackUrlLogged = true;
    console.log(`[kie.ai] callBackUrl do createTask: ${callBackUrl || "desativado (só polling)"}`);
  }

  let primary: KieHttpResult | null = null;
  // Se o kie.ai recusar a URL opcional (validação de campo), repetimos sem ela:
  // um campo opcional nunca pode derrubar a geração do artista.
  for (const url of callBackUrl ? [callBackUrl, ""] : [""]) {
    primary = await kieFetch(apiKey, "/api/v1/jobs/createTask", {
      method: "POST",
      body: JSON.stringify({
        model: taskModel,
        input: payload,
        ...(url ? { callBackUrl: url } : {}),
      }),
    });
    const primaryTaskId = primary.body?.data?.taskId;
    if (primary.status === 200 && primaryTaskId) return String(primaryTaskId);

    // Problema de conta/chave: o endpoint legado vai falhar igual — evita 2 chamadas e alerta duplo.
    if (primary.status === 401 || primary.status === 402 || primary.status === 403 || primary.status === 429) {
      const service = serviceErrorFor(primary.status, String(payload.model), detailOf(primary.body));
      if (service) throw service;
    }
    if (!url || (primary.status !== 400 && primary.status !== 422)) break;
  }
  const lastPrimary = primary;

  // Endpoint legado (formato plano, `customMode` camelCase) — cobre contas/modelos antigos.
  // Só existe para geração do zero: o cover não tem endpoint legado.
  let legacyStatus = 0;
  let legacyDetail = "";
  if (taskModel === KIE_TASK_MODEL) {
    const legacyPayload: Record<string, unknown> = {
      customMode: true,
      instrumental: payload.instrumental,
      model: payload.model,
      title: payload.title,
      style: payload.style,
      prompt: payload.style,
      callBackUrl,
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
    legacyStatus = legacy.status;
    legacyDetail = detailOf(legacy.body);
  }

  const status = lastPrimary && lastPrimary.status >= 400 ? lastPrimary.status : legacyStatus;
  const detail = (lastPrimary ? detailOf(lastPrimary.body) : "") || legacyDetail;
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

  // Duração só existe na geração do zero e na cover; a extensão segue o áudio fonte.
  const duration = input.extendAudioUrl?.trim() ? undefined : await resolveSongSeconds(input.lyrics);
  const payload = buildKieInput(input, config.model, { duration });
  const taskModel = kieTaskModelFor(input);
  const taskId = await createKieTask(config.apiKey, payload, taskModel);
  // Chamada ok: libera o fail-fast de créditos.
  creditBlockedUntil = 0;
  const mode =
    taskModel === KIE_EXTEND_TASK_MODEL
      ? "estender"
      : taskModel === KIE_COVER_TASK_MODEL
        ? "cover"
        : "gerar";
  console.log(
    `[kie.ai] Tarefa criada — modo=${mode} modelo=${config.model} duracao=${String(payload.duration ?? "-")}s ` +
      `taskId=${taskId} titulo="${input.title || ""}"`
  );
  return { id: `${KIE_MODEL_PREFIX}${taskId}`, status: "processing", output: null, error: null, logs: null };
}

// ─── Status ─────────────────────────────────────────────────────────────────

export const FAILED_STATUSES: Record<string, string> = {
  CREATE_TASK_FAILED: "O kie.ai não conseguiu criar a geração. Tente novamente em instantes.",
  GENERATE_AUDIO_FAILED: "O kie.ai não conseguiu gerar o áudio desta vez. Sua cota foi devolvida — tente de novo.",
  CALLBACK_EXCEPTION: "A geração foi interrompida pelo provedor. Tente gerar novamente.",
  SENSITIVE_WORD_ERROR:
    "O kie.ai rejeitou a música por conteúdo inadequado. Ajuste a letra (evite letras de terceiros) e gere de novo.",
  FAILED: "O kie.ai não conseguiu concluir a geração. Sua cota foi devolvida — tente de novo.",
  CANCELED: "A geração foi cancelada pelo provedor. Sua cota foi devolvida — tente de novo.",
  CANCELLED: "A geração foi cancelada pelo provedor. Sua cota foi devolvida — tente de novo.",
};

/**
 * Mensagem amigável para um status remoto de falha (qualquer caixa).
 * `null` quando o status não é uma falha — assim nenhum status novo do kie.ai
 * deixa o hit preso em "processing" para sempre.
 */
export function kieFailedMessage(status: string): string | null {
  const key = String(status || "").trim().toUpperCase();
  if (FAILED_STATUSES[key]) return FAILED_STATUSES[key];
  if (/FAIL|CANCEL|ERROR|TIMEOUT/.test(key)) return FAILED_STATUSES.FAILED;
  return null;
}

export type KieCallbackStatus = "success" | "failed" | "pending";

export interface KieCallbackInfo {
  /** task_id entregue pelo kie.ai (sem o prefixo `kie:`). */
  taskId: string;
  /** "first" (1ª faixa pronta), "complete" (todas) ou "" (legado). */
  callbackType: string;
  audioUrl: string | null;
  duration: number | null;
  status: KieCallbackStatus;
  failureMessage: string | null;
}

function firstTrackUrl(tracks: any[]): string | null {
  for (const track of tracks) {
    const url = track?.audio_url || track?.audioUrl || track?.file_url || track?.fileUrl || track?.url;
    if (typeof url === "string" && url.trim()) return url.trim();
  }
  return null;
}

/**
 * Mensagem amigável para o `code` de um callback de falha do kie.ai.
 * `null` quando o código é sucesso (200) — o texto do provedor entra depois.
 */
export function kieCallbackCodeMessage(code: number): string | null {
  switch (code) {
    case 400:
      return "O kie.ai recusou a música: a letra contém material protegido por direitos autorais. Ajuste a letra e gere de novo.";
    case 408:
      return "O kie.ai não concluiu a geração a tempo (timeout). Tente gerar novamente.";
    case 413:
      return "O kie.ai considerou o áudio enviado igual a uma obra existente. Use outra referência e tente de novo.";
    case 500:
    case 501:
      return "O kie.ai não conseguiu gerar o áudio desta vez. Sua cota foi devolvida — tente de novo.";
    case 531:
      return "O kie.ai teve uma falha no servidor e já devolveu os créditos. Tente gerar novamente.";
    default:
      return null;
  }
}

/**
 * Interpreta o corpo do callback do kie.ai.
 *
 * O contrato oficial (schema de `ai-music-api/generate`) entrega:
 *   { code, msg, data: { callbackType, task_id, data: [ { audio_url, duration, ... } ] } }
 * O `record-info` (polling) usa `data.response.sunoData[]` — aceitamos as duas
 * formas, inclusive com chaves em camelCase, para o callback não virar código morto.
 * `callbackType` acompanha as etapas: "text" (sem áudio ainda), "first", "complete"
 * e "error" (falhou mesmo com code 200 em algumas contas).
 */
export function parseKieCallback(body: any): KieCallbackInfo {
  const data = body?.data && typeof body.data === "object" ? body.data : {};
  const taskId = String(data.task_id || data.taskId || body?.taskId || "");
  const callbackType = String(data.callbackType || "");

  const tracks: any[] = Array.isArray(data.data)
    ? data.data
    : Array.isArray(data.response?.sunoData)
      ? data.response.sunoData
      : Array.isArray(data.sunoData)
        ? data.sunoData
        : Array.isArray(body?.response?.sunoData)
          ? body.response.sunoData
          : [];

  const looseUrl = [data.audioUrl, data.fileUrl, body?.audioUrl, body?.fileUrl].find(
    (u) => typeof u === "string" && u.trim()
  );
  const audioUrl = firstTrackUrl(tracks) || (looseUrl ? String(looseUrl).trim() : null);

  const rawDuration = tracks[0]?.duration ?? data.duration;
  const duration = Number.isFinite(Number(rawDuration)) && Number(rawDuration) > 0 ? Number(rawDuration) : null;

  const code = Number(body?.code);
  const failedByCode = Number.isFinite(code) && code !== 200;
  const failedByType = callbackType === "error";
  const providerMsg = String(body?.msg || data.status || "").slice(0, 300);
  const failedMessage =
    kieFailedMessage(data.status || "") ||
    (failedByCode ? kieCallbackCodeMessage(code) || providerMsg || "A geração falhou no kie.ai." : null) ||
    (failedByType ? providerMsg || "A geração falhou no kie.ai." : null);

  let status: KieCallbackStatus = "pending";
  if (failedMessage) status = "failed";
  else if (audioUrl) status = "success";

  return {
    taskId,
    callbackType,
    audioUrl,
    duration,
    status,
    failureMessage: status === "failed" ? failedMessage : null,
  };
}

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
    const audioUrl = tracks[0]?.audioUrl || tracks[0]?.audio_url || null;
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
  } else if (kieFailedMessage(remoteStatus)) {
    const providerMessage = String(data?.errorMessage || "").slice(0, 300);
    const failedMessage = kieFailedMessage(remoteStatus)!;
    result = {
      id: predictionId,
      status: "failed",
      output: null,
      error: providerMessage ? `${failedMessage} (${providerMessage})` : failedMessage,
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
      if (last?.status === "SUCCESS" || kieFailedMessage(last?.status || "")) break;
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
    const remote = tracks[0]?.audioUrl || tracks[0]?.audio_url;
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
  } else if (last?.status && kieFailedMessage(last.status)) {
    report.error = kieFailedMessage(last.status)!;
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
    20000,
    KIE_UPLOAD_BASE_URL
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
    35000, // Timeout estendido para download remoto pelo kie.ai
    KIE_UPLOAD_BASE_URL
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

/**
 * Envia o áudio de referência do artista (modo cover) para a CDN temporária do
 * kie.ai — POST /api/file-stream-upload (multipart) — e devolve a URL pública
 * que entra como `input.upload_url` na tarefa de cover.
 *
 * O endpoint de stream aceita arquivo de qualquer tamanho sem inflar um corpo
 * JSON: o limite de 8 minutos é do próprio Suno, não do upload.
 */
export async function uploadKieAudioFile(
  buffer: Buffer,
  fileName?: string,
  uploadPath = "portal/audio-references"
): Promise<KieBase64UploadResult> {
  const config = await getKieMusicConfig();
  if (!config.apiKey) {
    throw new Error("Chave do kie.ai (kie_api_key) não configurada no sistema.");
  }

  const safeName = sanitizeUploadFileName(fileName);
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)]), safeName);
  form.append("uploadPath", uploadPath.replace(/^\/+|\/+$/g, "") || "staging");
  form.append("fileName", safeName);

  const { status, body } = await kieFetch(
    config.apiKey,
    "/api/file-stream-upload",
    { method: "POST", body: form },
    90000,
    KIE_UPLOAD_BASE_URL
  );

  if (status >= 400 || !body?.success) {
    const errorMsg = detailOf(body) || `Falha no upload do áudio para o kie.ai (HTTP ${status})`;
    throw new Error(errorMsg);
  }

  const data = body.data || {};
  return {
    fileName: data.fileName || safeName,
    filePath: data.filePath || "",
    downloadUrl: data.downloadUrl || data.fileUrl || "",
    fileSize: Number(data.fileSize) || buffer.length,
    mimeType: data.mimeType || "",
    uploadedAt: data.uploadedAt || new Date().toISOString(),
  };
}

/** Nome de arquivo sem caminho: só letras, números, ponto, hífen e underscore. */
function sanitizeUploadFileName(fileName?: string): string {
  const base = (fileName || "").split(/[\\/]/).pop() || "";
  const clean = base.replace(/[^\w.-]+/g, "_").slice(0, 80);
  return clean || "audio-reference";
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



