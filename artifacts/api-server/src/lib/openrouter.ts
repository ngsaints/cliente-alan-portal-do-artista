import { appSettingsTable } from "@workspace/db";
import { db } from "@workspace/db";
import { eq } from "drizzle-orm";

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterOptions {
  messages: ChatMessage[];
  system?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OpenRouterResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

async function getSettingValue(key: string): Promise<string | null> {
  try {
    const rows = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, key));
    return rows[0]?.value?.trim() || null;
  } catch {
    return null;
  }
}

export async function getOpenRouterConfig(): Promise<{
  apiKey: string | null;
  model: string;
  isDirectOpenAi: boolean;
  enabled: boolean;
}> {
  const openrouterKey = (await getSettingValue("openrouter_api_key")) || process.env.OPENROUTER_API_KEY || null;
  const openaiKey = (await getSettingValue("openai_api_key")) || process.env.OPENAI_API_KEY || null;
  const openrouterModel = (await getSettingValue("openrouter_model")) || "openai/gpt-4o-mini";
  const openrouterEnabled = (await getSettingValue("openrouter_enabled")) !== "false";
  const openaiEnabled = (await getSettingValue("openai_enabled")) !== "false";

  if (openrouterKey && openrouterEnabled) {
    return {
      apiKey: openrouterKey,
      model: openrouterModel,
      isDirectOpenAi: false,
      enabled: true,
    };
  }

  if (openaiKey && openaiEnabled) {
    return {
      apiKey: openaiKey,
      model: "gpt-4o-mini",
      isDirectOpenAi: true,
      enabled: true,
    };
  }

  return {
    apiKey: null,
    model: openrouterModel,
    isDirectOpenAi: false,
    enabled: false,
  };
}

export async function callOpenRouter(opts: OpenRouterOptions): Promise<OpenRouterResponse> {
  const config = await getOpenRouterConfig();
  if (!config.apiKey) {
    throw new Error("Nenhuma chave de API configurada para a IA (OpenRouter ou OpenAI). Configure no Painel Administrativo.");
  }

  const endpoint = config.isDirectOpenAi ? OPENAI_CHAT_URL : OPENROUTER_CHAT_URL;
  const modelToUse = opts.model || config.model;

  const messages: ChatMessage[] = [];
  if (opts.system) {
    messages.push({ role: "system", content: opts.system });
  }
  messages.push(...opts.messages);

  const payload: Record<string, unknown> = {
    model: modelToUse,
    messages,
    temperature: opts.temperature ?? 0.75,
    max_tokens: opts.maxTokens ?? 3000,
  };

  if (!config.isDirectOpenAi) {
    payload.models = [modelToUse, "openrouter/auto"];
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };

  if (!config.isDirectOpenAi) {
    headers["HTTP-Referer"] = "https://portaldoartista.com";
    headers["X-Title"] = "Portal do Artista - Vivi Studio";
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Erro na API de IA:", res.status, errText);
    throw new Error(`Falha na comunicação com a IA (${res.status}): ${errText.slice(0, 150)}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content || "";

  return {
    content,
    model: data.model || modelToUse,
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
    },
  };
}

/**
 * Otimiza a letra do compositor para o padrão aceito pelo MiniMax Music 2.6
 * inserindo tags estruturais [Intro], [Verse], [Chorus], [Bridge], [Outro] e sugerindo o prompt musical perfeito.
 */
export async function optimizeLyricsForMiniMax(params: {
  title?: string;
  lyrics: string;
  genre: string;
  mood?: string;
  bpm?: number;
  voice?: string;
}): Promise<{
  optimizedLyrics: string;
  suggestedPrompt: string;
  tips: string[];
}> {
  const systemPrompt = `Você é a Vivi, a produtora musical e especialista em composição do PORTALDOARTISTA.COM.
Sua especialidade é estruturar letras de músicas em português do Brasil no formato ideal para motores de síntese vocal por IA (especialmente MiniMax Music 2.6).

Diretrizes obrigatórias:
1. Mantenha a essência, rimas e mensagem da letra original do compositor, corrigindo apenas métricas quebras de ritmo ou rimas fracas se necessário.
2. Estruture a letra com as tags padronizadas em colchetes maiúsculos:
   [Intro]
   [Verse 1]
   [Pre-Chorus] (se couber)
   [Chorus]
   [Verse 2]
   [Chorus]
   [Bridge] (se couber)
   [Guitar Solo] ou [Accordion Solo] ou [Drop] (opcional de acordo com o gênero)
   [Chorus]
   [Outro]
3. Gere também um prompt descritivo em português para os instrumentos e voz (ex: "Sertanejo romântico com violão aço acústico, sanfona marcante, bateria suave e voz masculina emotiva, 115 BPM").
4. Retorne sua resposta estritamente em formato JSON válido com as chaves:
{
  "optimizedLyrics": "letra completa formatada com as tags",
  "suggestedPrompt": "descrição musical para a IA",
  "tips": ["dica 1 de interpretação", "dica 2"]
}`;

  const userPrompt = `Título: ${params.title || "Sem título"}
Gênero pretendido: ${params.genre}
Clima/Mood: ${params.mood || "Emocionante"}
Voz: ${params.voice || "Masculina"}
BPM desejado: ${params.bpm || 120}

Letra original do compositor:
"""
${params.lyrics}
"""

Por favor, estruture a letra para o formato do MiniMax e forneça o prompt musical ideal em JSON.`;

  const response = await callOpenRouter({
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    temperature: 0.6,
  });

  try {
    let clean = response.content.trim();
    if (clean.startsWith("```json")) {
      clean = clean.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (clean.startsWith("```")) {
      clean = clean.replace(/^```/, "").replace(/```$/, "").trim();
    }
    const parsed = JSON.parse(clean);
    return {
      optimizedLyrics: parsed.optimizedLyrics || params.lyrics,
      suggestedPrompt: parsed.suggestedPrompt || `${params.genre} com ${params.voice}, ${params.bpm || 120} BPM`,
      tips: Array.isArray(parsed.tips) ? parsed.tips : ["Letra formatada com sucesso para o gerador musical!"],
    };
  } catch (err) {
    console.warn("Falha ao parsear JSON de otimização de letra, usando resposta direta:", err);
    return {
      optimizedLyrics: response.content,
      suggestedPrompt: `${params.genre} estilo ${params.mood || "moderno"} com voz ${params.voice || "masculina"}, ${params.bpm || 120} BPM`,
      tips: ["Letra estruturada com sucesso."],
    };
  }
}

export interface ModelOption {
  id: string;
  name: string;
  isFree?: boolean;
  contextLength?: number;
  promptPrice?: number;
  completionPrice?: number;
}

/**
 * Busca a lista dinâmica de modelos disponíveis no OpenRouter
 */
export async function listOpenRouterModels(): Promise<ModelOption[]> {
  const config = await getOpenRouterConfig();
  if (!config.apiKey || config.isDirectOpenAi) {
    // Retorna os modelos recomendados padrão
    return [
      { id: "openai/gpt-4o-mini", name: "GPT-4o Mini (Recomendado / Rápido & Econômico)" },
      { id: "google/gemini-2.0-flash-001", name: "Google Gemini 2.0 Flash (Ultrarrápido)" },
      { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet (Máxima Criatividade)" },
      { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B (Open Source de Alto Nível)" },
      { id: "deepseek/deepseek-chat", name: "DeepSeek V3 (Excelente Custo-Benefício)" },
      { id: "openrouter/auto", name: "Auto Router (Seleção Automática de Melhor Rota)" },
    ];
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "HTTP-Referer": "https://portaldoartista.com",
        "X-Title": "Portal do Artista",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`OpenRouter ${res.status}`);
    }

    const data = await res.json();
    const list: ModelOption[] = [];

    for (const m of data.data ?? []) {
      if (!m?.id) continue;
      const isFree = m.id.endsWith(":free") || (Number(m.pricing?.prompt) === 0 && Number(m.pricing?.completion) === 0);
      list.push({
        id: m.id,
        name: m.name || m.id,
        isFree,
        contextLength: m.context_length,
        promptPrice: m.pricing?.prompt ? parseFloat(m.pricing.prompt) : undefined,
        completionPrice: m.pricing?.completion ? parseFloat(m.pricing.completion) : undefined,
      });
    }

    // Ordenar priorizando os modelos mais populares/reconhecidos
    const priority = [
      "openai/gpt-4o-mini",
      "google/gemini-2.0-flash-001",
      "anthropic/claude-3.5-sonnet",
      "meta-llama/llama-3.3-70b-instruct",
      "deepseek/deepseek-chat",
      "openrouter/auto"
    ];

    list.sort((a, b) => {
      const idxA = priority.indexOf(a.id);
      const idxB = priority.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.id.localeCompare(b.id);
    });

    return list.slice(0, 50); // Top 50 modelos mais relevantes
  } catch (err) {
    console.warn("Falha ao buscar modelos ao vivo do OpenRouter, retornando lista base:", err);
    return [
      { id: "openai/gpt-4o-mini", name: "GPT-4o Mini (Recomendado)" },
      { id: "google/gemini-2.0-flash-001", name: "Google Gemini 2.0 Flash (Ultrarrápido)" },
      { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet (Criativo)" },
      { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct" },
      { id: "deepseek/deepseek-chat", name: "DeepSeek V3" },
      { id: "openrouter/auto", name: "Auto Router (Automático)" },
    ];
  }
}

/**
 * Consulta saldo de créditos na conta OpenRouter
 */
export async function getOpenRouterCredits(): Promise<{
  totalCredits: number;
  usage: number;
  limit: number | null;
} | null> {
  const config = await getOpenRouterConfig();
  if (!config.apiKey || config.isDirectOpenAi) return null;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/credits", {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    const json = await res.json();
    const d = json.data ?? {};
    const total = Number(d.total_credits ?? 0);
    const usage = Number(d.total_usage ?? d.usage ?? 0);
    return {
      totalCredits: Math.max(0, total - usage),
      usage,
      limit: d.limit === null ? null : Number(d.limit ?? 0),
    };
  } catch {
    return null;
  }
}

