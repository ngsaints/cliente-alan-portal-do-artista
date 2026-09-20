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
  fallbacks?: string[];
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

// Vivi (mentora/texto) roda 100% no tier gratuito do OpenRouter.
// Nenhum custo por chamada: modelo roteador free + fallbacks :free.
export const VIVI_FREE_MODEL = "openrouter/free";
export const VIVI_FREE_FALLBACKS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "google/gemma-3-27b-it:free",
  "openrouter/auto",
];

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
    const rawFallbacks = (await getSettingValue("openrouter_fallbacks")) || "";
    const parsedFallbacks = rawFallbacks
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const fallbackList = (opts.fallbacks && opts.fallbacks.length > 0)
      ? opts.fallbacks
      : (parsedFallbacks.length > 0)
        ? parsedFallbacks
        : ["google/gemini-2.0-flash-001", "deepseek/deepseek-chat", "openai/gpt-4o-mini", "openrouter/auto"];

    // Monta cadeia com o modelo principal na primeira posição, seguido dos fallbacks
    const modelChain = [modelToUse, ...fallbackList];
    const uniqueModels = Array.from(new Set(modelChain.filter(Boolean)));
    payload.models = uniqueModels;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };

  if (!config.isDirectOpenAi) {
    headers["HTTP-Referer"] = "https://portaldoartista.com";
    headers["X-Title"] = "Portal do Artista - Vivi Studio";
  }

  let res: Response;
  let lastErrorText = "";

  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch (fetchErr: any) {
    console.warn("[OpenRouter] Falha de conexão na requisição inicial:", fetchErr?.message || fetchErr);
    res = new Response(JSON.stringify({ error: fetchErr?.message || "Connection failed" }), { status: 503 });
  }

  // Se a requisição principal falhou e não é OpenAI direto, tentamos os fallbacks um a um (Layer-2 Resilience)
  if (!res.ok && !config.isDirectOpenAi) {
    lastErrorText = await res.text().catch(() => "");
    console.warn(
      `[OpenRouter Fallback] Modelo principal (${modelToUse}) retornou status ${res.status}: ${lastErrorText.slice(0, 100)}. Acionando cadeia de contingência...`
    );

    const fallbacksToTry = (payload.models as string[] || []).filter((m) => m !== modelToUse);

    for (const fallbackModel of fallbacksToTry) {
      console.info(`[OpenRouter Fallback] Tentando modelo de contingência alternativo: ${fallbackModel}...`);
      try {
        const fallbackPayload = {
          ...payload,
          model: fallbackModel,
          models: [fallbackModel, "openrouter/auto"],
        };

        const fallbackRes = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(fallbackPayload),
        });

        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          const choice = fallbackData.choices?.[0];
          const content = choice?.message?.content || "";
          console.info(`[OpenRouter Fallback] Sucesso! Recuperado com contingência: ${fallbackData.model || fallbackModel}`);
          return {
            content,
            model: fallbackData.model || fallbackModel,
            usage: {
              promptTokens: fallbackData.usage?.prompt_tokens || 0,
              completionTokens: fallbackData.usage?.completion_tokens || 0,
            },
          };
        } else {
          const fbErrText = await fallbackRes.text().catch(() => "");
          console.warn(`[OpenRouter Fallback] Modelo ${fallbackModel} também falhou (${fallbackRes.status}): ${fbErrText.slice(0, 80)}`);
        }
      } catch (fbErr) {
        console.warn(`[OpenRouter Fallback] Erro ao conectar com fallback ${fallbackModel}:`, fbErr);
      }
    }

    // Se todos os fallbacks falharem
    console.error("Erro na API de IA (todos os fallbacks esgotados):", res.status, lastErrorText);
    throw new Error(`Falha na comunicação com a IA (${res.status}): ${lastErrorText.slice(0, 150)}`);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
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
    model: VIVI_FREE_MODEL,
    fallbacks: VIVI_FREE_FALLBACKS,
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

export interface ComposeLyricsParams {
  idea: string;
  genre: string;
  mood?: string;
  voice?: string;
  bpm?: number;
}

export interface ComposeLyricsResult {
  title: string;
  lyrics: string;
  suggestedPrompt: string;
  concept: string;
}

/**
 * Cria uma letra completa e estruturada a partir de uma ideia ou tema fornecido pelo artista
 */
export async function composeFullSongFromIdea(params: ComposeLyricsParams): Promise<ComposeLyricsResult> {
  const systemPrompt = `Você é a Vivi, produtora musical de sucessos no PORTALDOARTISTA.COM.
Sua missão é compor uma letra inédita, emocionante e comercial com base na ideia enviada pelo artista.

Estruture a letra com as tags padronizadas reconhecidas pelo MiniMax Music 2.6:
[Intro]
[Verse 1]
[Pre-Chorus] (opcional)
[Chorus]
[Verse 2]
[Chorus]
[Bridge]
[Guitar Solo] ou [Accordion Solo] (opcional)
[Chorus]
[Outro]

Regras vitais:
1. Rimas autênticas e métrica rítmica natural (8 a 10 sílabas por verso).
2. Refrão forte, marcante e comercial.
3. Vocabulário condizente com o gênero ${params.genre}.
4. Retorne sua resposta estritamente no formato JSON válido com as chaves:
{
  "title": "Título Incrível",
  "lyrics": "letra completa estruturada com as tags",
  "suggestedPrompt": "descrição dos instrumentos e voz para a IA",
  "concept": "explicação breve da ideia comercial da música"
}`;

  const userPrompt = `Gênero: ${params.genre}
Clima/Mood: ${params.mood || "Animado"}
Voz pretendida: ${params.voice || "Masculina"}
BPM: ${params.bpm || 120}
Ideia/Tema do Artista:
"${params.idea}"

Por favor, componha a música completa agora.`;

  const response = await callOpenRouter({
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    model: VIVI_FREE_MODEL,
    fallbacks: VIVI_FREE_FALLBACKS,
    temperature: 0.8,
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
      title: parsed.title || "Composição Inédita",
      lyrics: parsed.lyrics || response.content,
      suggestedPrompt: parsed.suggestedPrompt || `${params.genre} com ${params.voice || "voz marcante"}, ${params.bpm || 120} BPM`,
      concept: parsed.concept || "Música composta com sucesso.",
    };
  } catch (err) {
    console.warn("Falha ao parsear JSON de composição da Vivi:", err);
    return {
      title: "Composição Inédita",
      lyrics: response.content,
      suggestedPrompt: `${params.genre} estilo ${params.mood || "moderno"} com voz ${params.voice || "masculina"}, ${params.bpm || 120} BPM`,
      concept: "Letra gerada com sucesso pela Vivi.",
    };
  }
}

export interface ModelOption {
  id: string;
  name: string;
  description?: string;
  isFree?: boolean;
  contextLength?: number;
  promptPrice?: number;
  completionPrice?: number;
  formattedPricing?: string;
  provider?: string;
}

// Cache em memória dos modelos para máxima performance e evitar rate-limit
const modelsCache: Record<string, { data: ModelOption[]; timestamp: number }> = {};
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos

/**
 * Busca a lista dinâmica de modelos disponíveis no OpenRouter
 * Suporta ordenação: 'most-popular' | 'pricing-low-to-high' | 'context-high-to-low' | 'newest'
 */
export async function listOpenRouterModels(
  sort: string = "most-popular",
  search?: string,
  refresh: boolean = false
): Promise<ModelOption[]> {
  const cacheKey = sort || "most-popular";
  const now = Date.now();

  if (refresh) {
    delete modelsCache[cacheKey];
  }

  let fullList: ModelOption[] = [];

  if (modelsCache[cacheKey] && now - modelsCache[cacheKey].timestamp < CACHE_TTL_MS) {
    fullList = modelsCache[cacheKey].data;
  } else {
    const config = await getOpenRouterConfig();

    try {
      const url = `https://openrouter.ai/api/v1/models?output_modalities=text&sort=${encodeURIComponent(cacheKey)}`;
      const headers: Record<string, string> = {
        "HTTP-Referer": "https://portaldoartista.com",
        "X-Title": "Portal do Artista",
      };
      if (config.apiKey) {
        headers["Authorization"] = `Bearer ${config.apiKey}`;
      }

      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        throw new Error(`OpenRouter models API returned ${res.status}`);
      }

      const data = await res.json();
      const list: ModelOption[] = [];

      for (const m of data.data ?? []) {
        if (!m?.id) continue;
        const promptNum = m.pricing?.prompt ? parseFloat(m.pricing.prompt) : 0;
        const compNum = m.pricing?.completion ? parseFloat(m.pricing.completion) : 0;
        const isFree = m.id.endsWith(":free") || (promptNum === 0 && compNum === 0);

        let formattedPricing = "Grátis";
        if (!isFree && promptNum > 0) {
          const promptPerM = (promptNum * 1_000_000).toFixed(promptNum * 1_000_000 < 1 ? 3 : 2);
          const compPerM = (compNum * 1_000_000).toFixed(compNum * 1_000_000 < 1 ? 3 : 2);
          formattedPricing = `$${promptPerM} / $${compPerM} por 1M`;
        }

        const provider = m.id.includes("/") ? m.id.split("/")[0] : undefined;

        list.push({
          id: m.id,
          name: m.name || m.id,
          description: m.description,
          isFree,
          contextLength: m.context_length,
          promptPrice: promptNum || undefined,
          completionPrice: compNum || undefined,
          formattedPricing,
          provider,
        });
      }

      // Garante que o Free Models Router oficial esteja presente e configurável no catálogo
      if (!list.some((m) => m.id === "openrouter/free")) {
        list.unshift({
          id: "openrouter/free",
          name: "Free Models Router (Roteador 100% Grátis)",
          description: "Roteador gratuito do OpenRouter que alterna automaticamente entre os modelos grátis disponíveis (DeepSeek R1, Llama 3.2, Qwen) com Custo Zero absoluto.",
          isFree: true,
          formattedPricing: "100% Grátis",
          provider: "openrouter",
        });
      }

      // Se a ordenação for a padrão 'most-popular', mantemos os favoritos essenciais no topo
      if (sort === "most-popular") {
        const priority = [
          "openai/gpt-4o-mini",
          "google/gemini-2.0-flash-001",
          "openrouter/free",
          "deepseek/deepseek-chat",
          "anthropic/claude-3.5-sonnet",
          "meta-llama/llama-3.3-70b-instruct",
          "openrouter/auto",
        ];

        list.sort((a, b) => {
          const idxA = priority.indexOf(a.id);
          const idxB = priority.indexOf(b.id);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return 0; // Preserva a ordenação 'most-popular' do OpenRouter
        });
      }

      fullList = list;
      modelsCache[cacheKey] = { data: fullList, timestamp: now };
    } catch (err) {
      console.warn("Falha ao buscar modelos ao vivo do OpenRouter, retornando lista recomendada:", err);
      fullList = [
        { id: "openai/gpt-4o-mini", name: "GPT-4o Mini (Recomendado)", formattedPricing: "$0.15 / $0.60 por 1M", provider: "openai" },
        { id: "google/gemini-2.0-flash-001", name: "Google Gemini 2.0 Flash (Ultrarrápido)", formattedPricing: "$0.10 / $0.40 por 1M", provider: "google" },
        { id: "openrouter/free", name: "Free Models Router (100% Grátis)", formattedPricing: "100% Grátis", provider: "openrouter", isFree: true },
        { id: "deepseek/deepseek-chat", name: "DeepSeek V3 (Excelente Custo-Benefício)", formattedPricing: "$0.14 / $0.28 por 1M", provider: "deepseek" },
        { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet (Criativo)", formattedPricing: "$3.00 / $15.00 por 1M", provider: "anthropic" },
        { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct", formattedPricing: "$0.12 / $0.30 por 1M", provider: "meta-llama" },
        { id: "openrouter/auto", name: "Auto Router (Seleção Automática)", formattedPricing: "Variável", provider: "openrouter" },
      ];
    }
  }

  // Filtragem por busca (ID, nome, descrição ou provedor)
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    return fullList.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q)) ||
        (m.provider && m.provider.toLowerCase().includes(q))
    );
  }

  return fullList;
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

