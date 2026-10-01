import { appSettingsTable, plansTable } from "@workspace/db";
import { db } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import path from "path";
import fs from "fs";
import Replicate from "replicate";
import { uploadToR2, generateR2Key, r2Enabled } from "./r2-storage.js";
import { sendAdminAlert } from "./email.js";
import { normalizeMusicModelId, resolveMusicProvider, stripProviderPrefix, type MusicProvider } from "./music-provider.js";

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
  /** Título da música (usado como nome do arquivo de áudio salvo). */
  title?: string;
  /**
   * Modo cover: URL pública do áudio de referência (já enviado ao kie.ai).
   * Presente = gerar cover mantendo a melodia, em vez de gerar do zero.
   */
  coverAudioUrl?: string;
  /**
   * Modo estender: URL pública do áudio fonte (um hit já gerado ou um arquivo
   * enviado). Presente = continuar a partir de `continueAt` em vez de gerar do zero.
   */
  extendAudioUrl?: string;
  /** Modo estender: ponto (segundos) do áudio fonte onde a continuação começa. */
  continueAt?: number;
  /** Modo cover/estender: quanto o áudio fonte pesa (0–1). */
  audioWeight?: number;
  /** Modo cover/estender: quanto o estilo pedido pelo artista pesa (0–1). */
  styleWeight?: number;
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

/** Modelo de música escolhido pelo admin para um plano (null = usar o global). */
export async function getPlanMusicModel(plano?: string): Promise<string | null> {
  if (!plano) return null;
  try {
    const rows = await db
      .select({ model: plansTable.replicateModel })
      .from(plansTable)
      .where(sql`lower(${plansTable.nome}) = lower(${plano})`);
    const model = rows[0]?.model?.trim();
    return model ? model : null;
  } catch {
    return null;
  }
}

export async function getReplicateConfig(plano?: string): Promise<{
  apiKey: string | null;
  model: string;
  enabled: boolean;
  modelSource: "plano" | "global";
  /** Quem gera a música (deduzido do id do modelo escolhido). */
  provider: MusicProvider;
}> {
  const replicateKey = (await getSettingValue("replicate_api_key")) || process.env.REPLICATE_API_TOKEN || null;
  const globalModel = (await getSettingValue("replicate_music_model")) || "minimax/music-2.6";
  const replicateEnabled = (await getSettingValue("replicate_enabled")) !== "false";

  // Plano pode mandar no próprio modelo (ex.: start = modelo barato, premium = melhor)
  const planModel = await getPlanMusicModel(plano);
  // Normaliza ids antigos gravados sem prefixo (ex.: "google/lyria-3-pro")
  const model = normalizeMusicModelId(planModel || globalModel);

  return {
    apiKey: replicateKey,
    model,
    enabled: !!replicateKey && replicateEnabled,
    modelSource: planModel ? "plano" : "global",
    provider: resolveMusicProvider(model),
  };
}

function getReplicateClient(apiKey: string): Replicate {
  return new Replicate({
    auth: apiKey,
  });
}

/** GET simples com timeout e Bearer (usado na verificação do OpenRouter). */
async function fetchWithTimeoutJson(url: string, apiKey: string): Promise<any> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
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
 * Prompt enviado ao MiniMax Music 2.6.
 * O modelo responde muito melhor a uma descrição densa (estilo + instrumentação + clima +
 * andamento + voz + produção) do que à lista simples que usávamos antes.
 * As instruções personalizadas do artista entram por último, literalmente, sem filtro.
 */
const GENRE_STYLE_HINTS: [RegExp, string][] = [
  [/^sertanejo\s*universit/i, "university sertanejo, rhythmic acoustic guitar, light percussion, catchy chorus"],
  [/^sertanejo/i, "brazilian sertanejo, steel-string acoustic guitar, viola caipira, accordion fills"],
  [/^mod[ãa]o/i, "caipira modão, viola caipira, acoustic guitar, sentimental melody"],
  [/^piseiro/i, "brazilian piseiro, electronic bass, syncopated beat, bright synth lead"],
  [/^forr/i, "forró, zabumba, triangle and accordion, danceable groove"],
  [/^pagod/i, "pagode, cavaquinho, pandeiro, brazilian percussion"],
  [/^pop/i, "modern pop, clean guitars, synth layers, memorable hook"],
  [/^gospel|worship/i, "contemporary gospel, piano and pads, wide choir, uplifting build"],
  [/^rock/i, "rock band, electric guitars, punchy drums, strong riff"],
  [/^trap|hip\s?hop/i, "trap and hip hop, 808 bass, crisp hi-hats"],
  [/^funk/i, "brazilian funk, heavy 808 bass, syncopated drums"],
  [/^mpb/i, "MPB with bossa colors, nylon-string guitar, delicate arrangement"],
  [/^eletr|^edm|^dance/i, "electronic dance music, four-on-the-floor kick, sidechained synths"],
];

const MOOD_STYLE_HINTS: [RegExp, string][] = [
  [/rom[âa]ntic/i, "romantic, warm and tender"],
  [/sofr/i, "heartbroken, raw and soulful"],
  [/danc|festa|animad|alto astral/i, "upbeat, joyful and danceable"],
  [/apaixon/i, "passionate, intense and emotional"],
  [/brut|r[úu]stic/i, "raw, rustic and powerful"],
  [/nostalg/i, "nostalgic, bittersweet"],
  [/trist|melanc|balada/i, "melancholic, intimate and reflective"],
];

const VOICE_STYLE_HINTS: [RegExp, string][] = [
  [/dupla|dueto/i, "male and female duet with close harmony"],
  [/femin/i, "expressive female vocal, clear and emotional"],
  [/mascul/i, "warm male vocal, expressive and confident"],
];

const PRODUCTION_HINT = "clean studio production, professional mix, natural dynamics";

function matchHint(list: [RegExp, string][], value: string): string | null {
  const v = (value || "").trim();
  if (!v) return null;
  const hit = list.find(([re]) => re.test(v));
  return hit ? hit[1] : null;
}

export function buildMusicPrompt(input: MiniMaxMusicInput): string {
  const parts: string[] = [];
  const push = (value?: string | null) => {
    const v = (value || "").trim();
    if (v) parts.push(v);
  };

  const genre = (input.genre || "").trim();
  push(genre);
  push(matchHint(GENRE_STYLE_HINTS, genre));

  const mood = (input.mood || "").trim();
  if (mood) push(`${mood} mood`);
  push(matchHint(MOOD_STYLE_HINTS, mood));

  const voice = (input.voice || "").trim();
  const instrumental = voice.toLowerCase().includes("instrumental");
  if (instrumental) push("instrumental, no vocals");
  else {
    push(matchHint(VOICE_STYLE_HINTS, voice) || (voice ? `vocal ${voice}` : null));
  }

  if (input.bpm) push(`${input.bpm} BPM`);
  push(PRODUCTION_HINT);

  // Instruções personalizadas do artista: entram como estão (é o que ele pediu).
  push((input.prompt || "").trim());

  const seen = new Set<string>();
  const unique = parts.filter((p) => {
    const key = p.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // O campo prompt do MiniMax aceita até 2000 caracteres.
  return unique.join(", ").slice(0, 1950);
}

/**
 * Prompt para modelos que só aceitam `prompt` (Lyria, schema {prompt, images, seed}).
 * A letra entra junto da descrição, porque nesses modelos não existe campo `lyrics`.
 */
export function buildPromptOnlyInput(input: MiniMaxMusicInput): string {
  const base = buildMusicPrompt(input);
  const lyrics = (input.lyrics || "").trim();
  if (!lyrics) return base;
  return `${base}\n\nLetra da musica:\n${lyrics}`.slice(0, 4000);
}

/** Modelos do Replicate que não aceitam `lyrics` e recebem tudo pelo prompt. */
const PROMPT_ONLY_RE = /lyria|musicgen|^google\//i;

/**
 * Payload de entrada por família de modelo.
 * MiniMax (minimax/music-2.6) tem campos próprios (lyrics, bitrate, sample_rate...);
 * Lyria e similares aceitam só `prompt` — mandar campos extras derruba a predição.
 */
export function buildReplicateModelInput(
  bareModel: string,
  input: MiniMaxMusicInput,
  fullPrompt: string
): Record<string, unknown> {
  if (PROMPT_ONLY_RE.test(bareModel)) {
    return { prompt: buildPromptOnlyInput(input) };
  }
  return {
    prompt: fullPrompt,
    lyrics: input.lyrics.trim() || "[Instrumental]",
    bitrate: 256000,
    sample_rate: 44100,
    audio_format: "mp3",
    is_instrumental: input.voice ? input.voice.toLowerCase().includes("instrumental") : false,
    lyrics_optimizer: false,
  };
}

/**
 * Inicia uma predição no Replicate para gerar música com o MiniMax Music 2.6
 */
export async function startMusicGeneration(
  input: MiniMaxMusicInput,
  opts: { plano?: string; modelOverride?: string } = {}
): Promise<ReplicatePredictionResponse> {
  const base = await getReplicateConfig(opts.plano);
  // Fallback do gateway: força um modelo Replicate quando o escolhido é do OpenRouter.
  const config = opts.modelOverride ? { ...base, model: opts.modelOverride } : base;
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

  if (!config.enabled) {
    console.error("[Replicate] Gateway desativado no painel (replicate_enabled = false) — geração bloqueada.");
    throw new ReplicateServiceError(
      "A geração de hits está indisponível no momento. Tente novamente mais tarde.",
      "REPLICATE_DISABLED",
      503
    );
  }
  // Prompt musical refinado (ver buildMusicPrompt)
  const fullPrompt = buildMusicPrompt(input);

  // Normalizar modelo (ex: minimax/music-2.6 ou minimax/music-01) — remove o prefixo do provedor
  const bareModel = stripProviderPrefix(config.model);
  const modelName = (bareModel.includes("/") ? bareModel : `minimax/${bareModel}`) as `${string}/${string}`;

  const replicate = getReplicateClient(config.apiKey);

  // Payload varia por família: MiniMax aceita lyrics/bitrate, Lyria só aceita prompt.
  const modelInput = buildReplicateModelInput(bareModel, input, fullPrompt);

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

  // Obs.: quando o modelo escolhido é do OpenRouter ou do kie.ai, quem responde por aqui
  // é o music-gateway (testOpenRouterIntegration / testKieIntegration) — este caminho é só Replicate.

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

  // A chave do OpenRouter também é usada pela Vivi e pela geração Lyria (mesmo com modelo Replicate no global).
  const orKey = (await getSettingValue("openrouter_api_key")) || process.env.OPENROUTER_API_KEY || null;
  if (!orKey) {
    errors.push("openrouter_api_key ausente — Vivi e geração Lyria não funcionam.");
  } else if (!orKey.startsWith("sk-or-")) {
    errors.push(
      `openrouter_api_key inválida (começa com "${orKey.slice(0, 3)}…" em vez de "sk-or-") — parece a chave de outro provedor colada no campo errado.`
    );
  } else {
    try {
      const orProbe = await fetchWithTimeoutJson("https://openrouter.ai/api/v1/auth/key", orKey);
      if (!orProbe?.data?.label) errors.push("OpenRouter respondeu de forma inesperada ao verificar a chave.");
    } catch (err: any) {
      errors.push(`OpenRouter recusou a chave: ${err?.message || err}`);
    }
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

export interface MusicGenerationTestResult {
  ok: boolean;
  model: string;
  modelSource: "plano" | "global";
  predictionId: string | null;
  audioUrl: string | null;
  durationMs: number | null;
  status: string | null;
  error: string | null;
}

const MUSIC_TEST_TIMEOUT_MS = 3 * 60 * 1000;

/**
 * Teste PAGO: roda o mesmo caminho do Vivi Studio de ponta a ponta —
 * cria a predição, acompanha, baixa o áudio e devolve o link tocável.
 * Uso: Painel Administrativo ("Testar geração de música").
 */
export async function testMusicGeneration(
  opts: { plano?: string; prompt?: string; lyrics?: string; title?: string } = {}
): Promise<MusicGenerationTestResult> {
  const config = await getReplicateConfig(opts.plano);
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
  if (!config.apiKey) {
    report.error = "replicate_api_key não configurada no Painel Administrativo.";
    return report;
  }
  if (!config.enabled) {
    report.error = "Gateway Replicate desativado no Painel Administrativo (replicate_enabled = false).";
    return report;
  }

  const bareModel = stripProviderPrefix(config.model);
  const miniInput: MiniMaxMusicInput = {
    prompt: opts.prompt?.trim() || "sertanejo acústico romântico, guitarra limpa, voz masculina suave",
    lyrics: opts.lyrics?.trim() || "[Verso]\nNoite calma, seu nome na canção\n[Refrão]\nVou cantar até o sol nascer",
    genre: "",
    mood: "",
    voice: "Masculina",
  };
  const input = buildReplicateModelInput(bareModel, miniInput, miniInput.prompt as string);

  const replicate = getReplicateClient(config.apiKey);
  const started = Date.now();
  let prediction: any = null;

  try {
    prediction = await (replicate as any).predictions.create({ model: bareModel, input });
  } catch (err: any) {
    if (isInsufficientCreditError(err)) {
      await reportInsufficientCredit(config.apiKey, config.model, err?.message || String(err));
      report.error = "HTTP 402: a conta Replicate está sem saldo. Recarregue em https://replicate.com/account/billing";
      return report;
    }
    // Modelos comunitários não aceitam "model": cai para o endpoint do próprio modelo.
    try {
      const slash = bareModel.indexOf("/");
      prediction = await (replicate as any).models.predictions.create(
        bareModel.slice(0, slash),
        bareModel.slice(slash + 1),
        { input }
      );
    } catch (err2: any) {
      report.error = `Falha ao criar a geração: ${err2?.message || err?.message || err}`;
      return report;
    }
  }

  report.predictionId = prediction?.id || null;
  let last: any = prediction;
  while (last?.status !== "succeeded" && last?.status !== "failed" && last?.status !== "canceled") {
    if (Date.now() - started > MUSIC_TEST_TIMEOUT_MS) break;
    await new Promise((resolve) => setTimeout(resolve, 3000));
    try {
      last = await (replicate as any).predictions.get(prediction.id);
    } catch (err: any) {
      report.error = `Erro ao acompanhar a geração: ${err?.message || err}`;
      return report;
    }
  }
  report.durationMs = Date.now() - started;
  report.status = last?.status || null;

  if (last?.status === "succeeded") {
    const remote = Array.isArray(last.output) ? last.output[0] : last.output;
    if (remote && typeof remote === "string") {
      try {
        report.audioUrl = await downloadAndSaveGeneratedAudio(remote, opts.title?.trim() || "teste admin");
      } catch (err: any) {
        report.error = `Áudio gerado, mas o download falhou: ${err?.message || err}`;
        return report;
      }
    }
    report.ok = !!report.audioUrl;
    if (!report.ok) report.error = "Predição concluída, mas o Replicate não devolveu o áudio.";
  } else if (last?.status === "failed" || last?.status === "canceled") {
    report.error = `Geração falhou: ${last?.error || "erro desconhecido"}`;
  } else {
    report.error = `Tempo esgotado (${Math.round(report.durationMs / 1000)}s): geração ainda "${last?.status || "?"}".`;
  }
  return report;
}

/**
 * Salva um buffer de áudio gerado (Replicate ou OpenRouter) no R2 ou localmente
 * e devolve a URL permanente.
 */
export async function saveGeneratedAudioBuffer(buffer: Buffer, title: string): Promise<string> {
  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30);
  const fileName = `demo_${Date.now()}_${cleanTitle}.mp3`;

  if (r2Enabled) {
    const key = generateR2Key("audio", fileName);
    return await uploadToR2(buffer, key, "audio/mpeg");
  }
  const audioDir = path.join(process.cwd(), "uploads/audio");
  fs.mkdirSync(audioDir, { recursive: true });
  fs.writeFileSync(path.join(audioDir, fileName), buffer);
  return `/api/uploads/audio/${fileName}`;
}

/**
 * Baixa o áudio gerado pelo Replicate e salva localmente ou no R2 para ter link permanente
 */
export async function downloadAndSaveGeneratedAudio(remoteAudioUrl: string, title: string): Promise<string> {
  try {
    const res = await fetch(remoteAudioUrl);
    if (!res.ok) throw new Error(`Falha ao baixar áudio gerado (${res.status})`);

    const arrayBuffer = await res.arrayBuffer();
    return await saveGeneratedAudioBuffer(Buffer.from(arrayBuffer), title);
  } catch (err) {
    console.warn("Aviso: Não foi possível salvar áudio localmente, usando URL remota:", err);
    return remoteAudioUrl;
  }
}
