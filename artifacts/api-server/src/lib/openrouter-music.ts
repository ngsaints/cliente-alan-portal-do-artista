import { appSettingsTable } from "@workspace/db";
import { db } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  buildPromptOnlyInput,
  getReplicateConfig,
  saveGeneratedAudioBuffer,
  type MiniMaxMusicInput,
  type ReplicateIntegrationReport,
  type ReplicatePredictionResponse,
} from "./replicate-music.js";
import { stripProviderPrefix } from "./music-provider.js";
import { sendAdminAlert } from "./email.js";

const OPENROUTER_MUSIC_TIMEOUT_MS = 4 * 60 * 1000;
const JOB_TTL_MS = 10 * 60 * 1000;
const FAIL_FAST_MS = 5 * 60 * 1000;
const ADMIN_ALERT_INTERVAL_MS = 30 * 60 * 1000;

/** Estado das gerações disparadas nesta sessão, indexado pelo id sintético `orw:<uuid>`. */
const jobs = new Map<
  string,
  {
    status: ReplicatePredictionResponse["status"];
    output: string | null;
    error: string | null;
    startedAt: number;
    endedAt: number | null;
    model: string;
  }
>();

let creditBlockedUntil = 0;
let lastAdminAlertAt = 0;
let creditFailureCount = 0;

async function getSettingValue(key: string): Promise<string | null> {
  try {
    const rows = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, key));
    return rows[0]?.value?.trim() || null;
  } catch {
    return null;
  }
}

export interface OpenRouterMusicConfig {
  apiKey: string | null;
  /** Id sem prefixo (ex.: google/lyria-3-pro-preview). */
  model: string;
  enabled: boolean;
}

export async function getOpenRouterMusicConfig(plano?: string): Promise<OpenRouterMusicConfig> {
  const config = await getReplicateConfig(plano);
  const apiKey = (await getSettingValue("openrouter_api_key")) || process.env.OPENROUTER_API_KEY || null;
  // Defesa: só gera no OpenRouter se o modelo escolhido for dele.
  const isOpenRouterModel = config.model.startsWith("openrouter:");
  return {
    apiKey,
    model: stripProviderPrefix(config.model),
    enabled: !!apiKey && isOpenRouterModel,
  };
}

function purgeStaleJobs(): void {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (job.endedAt && now - job.endedAt > JOB_TTL_MS) jobs.delete(id);
    else if (!job.endedAt && now - job.startedAt > JOB_TTL_MS * 3) jobs.delete(id);
  }
}

function friendlyError(status: number, detail: string): string {
  if (status === 402) {
    return "A geração de hits está temporariamente indisponível. Nossa equipe já foi avisada — tente novamente em alguns minutos.";
  }
  if (status === 401 || status === 403) {
    return "A geração de hits está indisponível no momento. Já avisamos a equipe — tente novamente em alguns minutos.";
  }
  if (status === 429) return "Muitas geração em andamento. Aguarde alguns instantes e tente de novo.";
  if (status === 404) return "O modelo de música escolhido não está disponível no OpenRouter. Troque o modelo no painel.";
  return detail.slice(0, 300) || "Não foi possível gerar a música agora. Tente novamente.";
}

async function reportCreditFailure(model: string, detail: string): Promise<void> {
  creditFailureCount += 1;
  creditBlockedUntil = Date.now() + FAIL_FAST_MS;
  console.error(`[OpenRouter Music] Conta sem créditos (HTTP 402) | modelo=${model} | ocorrências=${creditFailureCount}`);
  if (Date.now() - lastAdminAlertAt < ADMIN_ALERT_INTERVAL_MS) return;
  lastAdminAlertAt = Date.now();
  void sendAdminAlert(
    "OpenRouter sem créditos — geração de hits pausada",
    [
      "A conta do OpenRouter está sem saldo e a geração de músicas foi pausada automaticamente.",
      "",
      `Modelo: ${model}`,
      `Ocorrências nesta sessão: ${creditFailureCount}`,
      `Última resposta: ${detail.slice(0, 500)}`,
      "",
      "Recarga: https://openrouter.ai/settings/credits",
      "Enquanto não houver saldo, novas tentativas são bloqueadas por 5 minutos.",
      "",
      "Portal do Artista",
    ].join("\n")
  );
}

/** Chave inválida/recusada (401/403): loga sempre e avisa o admin (com limite de frequência). */
async function reportAuthFailure(status: number, model: string, detail: string): Promise<void> {
  console.error(
    `[OpenRouter Music] Recusa de autenticação (HTTP ${status}) | modelo=${model} | ${detail.slice(0, 300)} | confira openrouter_api_key no painel`
  );
  if (Date.now() - lastAdminAlertAt < ADMIN_ALERT_INTERVAL_MS) return;
  lastAdminAlertAt = Date.now();
  void sendAdminAlert(
    `OpenRouter recusou a chave da IA (HTTP ${status}) — geração de hits parada`,
    [
      "O OpenRouter está recusando as chamadas da geração de hits (chave inválida ou revogada).",
      "",
      `Modelo: ${model}`,
      `HTTP: ${status}`,
      `Resposta: ${detail.slice(0, 500)}`,
      "",
      "Confira o campo \"Chave de API OpenRouter\" em Admin → Configurações → IA",
      "(deve começar com sk-or-v1-) em https://openrouter.ai/settings/keys",
      "",
      "Portal do Artista",
    ].join("\n")
  );
}

/** Roda a geração em segundo plano: faz o stream, salva o áudio e atualiza o job. */
async function runJob(jobId: string, input: MiniMaxMusicInput, config: OpenRouterMusicConfig): Promise<void> {
  const job = jobs.get(jobId)!;
  try {
    const content = buildPromptOnlyInput(input);
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://portaldoartista.com",
        "X-Title": "Portal do Artista",
      },
      body: JSON.stringify({
        model: config.model,
        stream: true,
        modalities: ["text", "audio"],
        audio: { format: "mp3" },
        messages: [{ role: "user", content }],
      }),
      signal: AbortSignal.timeout(OPENROUTER_MUSIC_TIMEOUT_MS),
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      if (res.status === 402) await reportCreditFailure(config.model, detail);
      if (res.status === 401 || res.status === 403) await reportAuthFailure(res.status, config.model, detail);
      console.error(
        `[OpenRouter Music] HTTP ${res.status} | modelo=${config.model} | id=${jobId} | ${detail.slice(0, 300)}`
      );
      job.status = "failed";
      job.error = friendlyError(res.status, detail);
      job.endedAt = Date.now();
      return;
    }

    // Áudio chega em chunks base64 em choices[].delta.audio.data
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const audioChunks: string[] = [];
    let failed = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;
        let chunk: any;
        try {
          chunk = JSON.parse(data);
        } catch {
          continue;
        }
        if (chunk.error) {
          failed = true;
          const status = Number(chunk.error.code) || 500;
          console.error(
            `[OpenRouter Music] Erro no stream | modelo=${config.model} | id=${jobId} | ${JSON.stringify(chunk.error).slice(0, 300)}`
          );
          if (status === 402) await reportCreditFailure(config.model, JSON.stringify(chunk.error));
          if (status === 401 || status === 403) await reportAuthFailure(status, config.model, JSON.stringify(chunk.error));
          job.error = friendlyError(status, chunk.error.message || "");
        }
        const delta = chunk.choices?.[0]?.delta;
        if (delta?.audio?.data) audioChunks.push(delta.audio.data);
      }
    }

    const b64 = audioChunks.join("");
    if (failed || !b64) {
      job.status = "failed";
      job.error = job.error || "O modelo não devolveu áudio. Tente novamente.";
      job.endedAt = Date.now();
      return;
    }

    const audioUrl = await saveGeneratedAudioBuffer(Buffer.from(b64, "base64"), input.title || "hit");
    job.status = "succeeded";
    job.output = audioUrl;
    job.endedAt = Date.now();
    console.log(
      `[OpenRouter Music] Geração concluída — modelo=${config.model} id=${jobId} áudio=${audioUrl}`
    );
  } catch (err: any) {
    const isTimeout = err?.name === "TimeoutError" || err?.name === "AbortError";
    job.status = "failed";
    job.error = isTimeout
      ? "A geração demorou mais que o esperado. Tente novamente."
      : friendlyError(500, err?.message || String(err));
    job.endedAt = Date.now();
    console.error("[OpenRouter Music] Falha na geração:", err);
  }
}

/**
 * Inicia uma geração no OpenRouter em segundo plano.
 * Devolve no mesmo formato da Replicate (`{id, status, output, error}`) para o
 * restante do sistema continuar igual — o id é sintético (`orw:<uuid>`).
 */
export async function startOpenRouterMusicGeneration(
  input: MiniMaxMusicInput,
  opts: { plano?: string } = {}
): Promise<ReplicatePredictionResponse> {
  const config = await getOpenRouterMusicConfig(opts.plano);
  if (!config.enabled || !config.apiKey) {
    throw Object.assign(
      new Error(
        "A geração de hits está indisponível no momento. Confira a chave do OpenRouter e o modelo escolhido no painel."
      ),
      { status: 503, code: "OPENROUTER_NOT_CONFIGURED" }
    );
  }
  if (Date.now() < creditBlockedUntil) {
    throw Object.assign(
      new Error("A geração de hits está temporariamente indisponível. Tente novamente em alguns minutos."),
      { status: 503, code: "OPENROUTER_NO_CREDIT" }
    );
  }

  purgeStaleJobs();
  const jobId = `orw:${crypto.randomUUID()}`;
  jobs.set(jobId, {
    status: "processing",
    output: null,
    error: null,
    startedAt: Date.now(),
    endedAt: null,
    model: config.model,
  });

  // Dispara sem bloquear a resposta do artista (mesma UX do polling do Replicate).
  void runJob(jobId, input, config);

  return { id: jobId, status: "processing", output: null, error: null, logs: null };
}

/** Consulta o estado de uma geração do OpenRouter (id sintético `orw:...`). */
export function getOpenRouterMusicStatus(jobId: string): ReplicatePredictionResponse & { alreadySaved?: boolean } {
  purgeStaleJobs();
  const job = jobs.get(jobId);
  if (!job) {
    // A API reiniciou no meio da geração: o estado se perdeu. Trata como falha
    // para o artista não ficar esperando para sempre (a cota é devolvida).
    return {
      id: jobId,
      status: "failed",
      output: null,
      error: "A geração foi interrompida por uma reinicialização do servidor. Tente gerar de novo.",
      logs: null,
    };
  }
  return {
    id: jobId,
    status: job.status,
    // O áudio já está salvo (R2/local): a rota não precisa baixar de novo.
    output: job.output,
    error: job.error,
    logs: null,
    alreadySaved: true,
  };
}

export interface OpenRouterMusicTestResult {
  ok: boolean;
  model: string;
  predictionId: string | null;
  audioUrl: string | null;
  durationMs: number | null;
  status: string | null;
  error: string | null;
}

/**
 * Verificação GRÁTIS da integração (chave + saldo, sem gerar nada).
 * Usa o endpoint `/auth/key`, que só lê a conta e não consome crédito.
 */
export async function testOpenRouterIntegration(): Promise<ReplicateIntegrationReport> {
  const config = await getOpenRouterMusicConfig();
  const bareModel = config.model;
  const errors: string[] = [];
  const report: ReplicateIntegrationReport = {
    ok: false,
    enabled: config.enabled,
    hasKey: !!config.apiKey,
    keyHint: config.apiKey ? `${config.apiKey.slice(0, 10)}…` : null,
    model: bareModel ? `openrouter:${bareModel}` : "(modelo não definido)",
    account: null,
    modelAccessible: false,
    creditBlocked: creditBlockedUntil > Date.now(),
    creditFailures: creditFailureCount,
    lastCreditErrorAt: null,
    errors,
  };

  if (!config.apiKey) {
    errors.push("openrouter_api_key não configurada no Painel Administrativo.");
    return report;
  }
  if (!bareModel) {
    errors.push("Nenhum modelo de música do OpenRouter selecionado.");
  } else if (!config.enabled) {
    errors.push("O modelo selecionado não é do OpenRouter (confira o modelo por plano/global).");
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: { Authorization: `Bearer ${config.apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    const detail = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) {
      await reportAuthFailure(res.status, bareModel, detail);
      errors.push("O OpenRouter recusou a chave (confira openrouter_api_key).");
    } else if (!res.ok) {
      errors.push(`O OpenRouter não respondeu a verificação da conta (HTTP ${res.status}).`);
    } else {
      let body: any = null;
      try {
        body = JSON.parse(detail || "{}");
      } catch {
        body = null;
      }
      const data = body?.data;
      const label = data?.label ? `conta "${data.label}"` : "conta verificada";
      if (typeof data?.usage === "number" && typeof data?.limit === "number") {
        const restante = data.limit - data.usage;
        report.account = `${label} — ${restante.toFixed(2)} USD de crédito restante`;
        if (restante <= 0)
          errors.push(
            "A conta do OpenRouter está sem crédito — recarregue em https://openrouter.ai/settings/credits."
          );
      } else {
        report.account = `${label} — limite não informado (assinatura)`;
      }
    }
  } catch (err: any) {
    errors.push(`Erro ao verificar a conta do OpenRouter: ${err?.message || err}`);
  }

  // O OpenRouter não tem endpoint por modelo (GET /models/{id} devolve 404) — confere na lista completa.
  if (bareModel && config.apiKey) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/models", { signal: AbortSignal.timeout(15000) });
      const json: any = res.ok ? await res.json().catch(() => null) : null;
      const list: any[] = Array.isArray(json?.data) ? json.data : [];
      report.modelAccessible = list.some((m) => m?.id === bareModel);
      if (!report.modelAccessible) {
        errors.push(
          res.ok
            ? `Modelo "${bareModel}" não existe no OpenRouter. Use "google/lyria-3-pro-preview" ou "google/lyria-3-clip-preview".`
            : "Não consegui consultar o catálogo de modelos do OpenRouter (tente de novo)."
        );
      }
    } catch (err: any) {
      errors.push(`Erro ao consultar o catálogo do OpenRouter: ${err?.message || err}`);
    }
  }

  if (report.creditBlocked) {
    errors.push("Bloqueio por falta de crédito ativo: a geração está pausada por 5 minutos após o último HTTP 402.");
  }

  const replicateKey = (await getSettingValue("replicate_api_key")) || process.env.REPLICATE_API_TOKEN || null;
  if (!replicateKey) {
    errors.push("replicate_api_key ausente — sem fallback para o Replicate se o OpenRouter falhar.");
  } else if ((await getSettingValue("replicate_enabled")) === "false") {
    errors.push("Replicate desativado (replicate_enabled = false) — não haverá fallback se o OpenRouter falhar.");
  }

  report.ok = errors.length === 0;
  return report;
}

/**
 * Teste PAGO (~US$ 0,08): gera uma música de verdade no OpenRouter de ponta a ponta.
 * Só roda quando o admin clica no painel.
 */
export async function testOpenRouterMusicGeneration(
  opts: { plano?: string; prompt?: string; lyrics?: string; title?: string } = {}
): Promise<OpenRouterMusicTestResult> {
  const config = await getOpenRouterMusicConfig(opts.plano);
  const report: OpenRouterMusicTestResult = {
    ok: false,
    model: config.model,
    predictionId: null,
    audioUrl: null,
    durationMs: null,
    status: null,
    error: null,
  };
  if (!config.enabled || !config.apiKey) {
    report.error = "openrouter_api_key não configurada (ou modelo do Replicate selecionado) no Painel Administrativo.";
    return report;
  }

  const input: MiniMaxMusicInput = {
    prompt: opts.prompt?.trim() || "sertanejo acústico romântico, guitarra limpa, voz masculina suave",
    lyrics:
      opts.lyrics?.trim() || "[Verso]\nNoite calma, seu nome na canção\n[Refrão]\nVou cantar até o sol nascer",
    genre: "",
    mood: "",
    voice: "Masculina",
    title: opts.title?.trim() || "teste admin openrouter",
  };

  const started = Date.now();
  try {
    const content = buildPromptOnlyInput(input);
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://portaldoartista.com",
        "X-Title": "Portal do Artista",
      },
      body: JSON.stringify({
        model: config.model,
        stream: true,
        modalities: ["text", "audio"],
        audio: { format: "mp3" },
        messages: [{ role: "user", content }],
      }),
      signal: AbortSignal.timeout(OPENROUTER_MUSIC_TIMEOUT_MS),
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      if (res.status === 402) await reportCreditFailure(config.model, detail);
      if (res.status === 401 || res.status === 403) await reportAuthFailure(res.status, config.model, detail);
      console.error(
        `[OpenRouter Music] Teste pago falhou | HTTP ${res.status} | modelo=${config.model} | ${detail.slice(0, 300)}`
      );
      report.error = res.status === 402 ? "HTTP 402: a conta OpenRouter está sem saldo." : `OpenRouter HTTP ${res.status}: ${detail.slice(0, 300)}`;
      report.durationMs = Date.now() - started;
      return report;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const audioChunks: string[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;
        let chunk: any;
        try {
          chunk = JSON.parse(data);
        } catch {
          continue;
        }
        const delta = chunk.choices?.[0]?.delta;
        if (delta?.audio?.data) audioChunks.push(delta.audio.data);
      }
    }

    report.durationMs = Date.now() - started;
    report.status = "succeeded";
    const b64 = audioChunks.join("");
    if (!b64) {
      report.status = "failed";
      report.error = "O modelo não devolveu áudio.";
      return report;
    }
    report.audioUrl = await saveGeneratedAudioBuffer(Buffer.from(b64, "base64"), input.title as string);
    report.ok = true;
  } catch (err: any) {
    report.durationMs = Date.now() - started;
    report.status = "failed";
    report.error = err?.message || String(err);
  }
  return report;
}
