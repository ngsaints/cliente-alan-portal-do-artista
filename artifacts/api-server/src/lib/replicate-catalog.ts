import { db, appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getReplicateConfig } from "./replicate-music.js";
import {
  KIE_MODEL_PREFIX,
  OPENROUTER_MODEL_PREFIX,
  resolveMusicProvider,
  stripProviderPrefix,
  type MusicProvider,
} from "./music-provider.js";
import { KIE_CURRENT_MODELS, listKieMusicModels } from "./kie-music.js";

export { resolveMusicProvider, stripProviderPrefix, OPENROUTER_MODEL_PREFIX, KIE_MODEL_PREFIX, type MusicProvider };

/** Rótulo de cobrança do modelo, do jeito que a Replicate publica. */
export interface MusicModelPrice {
  usd: number | null;
  unit: string | null;
  unitLabel: string | null;
  medianUsd: number | null;
  ok: boolean;
}

export interface MusicModelInfo {
  id: string;
  /** Quem gera a música: Replicate ou OpenRouter (deduzido do id). */
  provider: MusicProvider;
  owner: string;
  name: string;
  description: string;
  url: string;
  coverImageUrl: string | null;
  runCount: number | null;
  price: MusicModelPrice;
  /** Custo estimado de 1 música (duração padrão) em USD e em R$ */
  songCostUsd: number | null;
  songCostBrl: number | null;
}

export interface CatalogResponse {
  usdBrl: number;
  rateSource: string;
  estimatedSongSeconds: number;
  models: MusicModelInfo[];
}

/** Duração usada para estimar o custo de 1 hit (MiniMax entrega ~1 min). */
export const ESTIMATED_SONG_SECONDS = 60;
const UNIT_TRANSLATIONS: [RegExp, string][] = [
  [/output audio file/i, "por arquivo de áudio gerado"],
  [/thousand seconds/i, "por mil segundos de áudio"],
  [/per second/i, "por segundo"],
  [/per run|per prediction|per request/i, "por geração"],
  [/per image/i, "por imagem"],
];

const MUSIC_RE = /\b(music|musical|song|songs|lyric|lyrics|audio|instrumental|beat|riff|soundtrack|musicgen|riffusion|music-)\w*/i;

// ─── Cache (evita bater na Replicate e no site a cada request) ────────────────
const CATALOG_TTL_MS = 30 * 60 * 1000;
const PRICE_TTL_MS = 24 * 60 * 60 * 1000;
const RATE_TTL_MS = 60 * 60 * 1000;
const priceCache = new Map<string, { at: number; price: MusicModelPrice }>();
let catalogCache: { at: number; query: string; data: CatalogResponse } | null = null;
let rateCache: { at: number; value: number } | null = null;

async function getSettingValue(key: string): Promise<string | null> {
  try {
    const rows = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, key));
    return rows[0]?.value?.trim() || null;
  } catch {
    return null;
  }
}

function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 12000): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(ms) });
}

// ─── Câmbio ──────────────────────────────────────────────────────────────────
export async function getUsdBrlRate(): Promise<{ value: number; source: string }> {
  if (rateCache && Date.now() - rateCache.at < RATE_TTL_MS) {
    return { value: rateCache.value, source: "cache" };
  }
  // Fontes públicas em ordem de preferência (a AwesomeAPI estoura cota rápido).
  const sources: { url: string; pick: (d: any) => number; source: string }[] = [
    { url: "https://open.er-api.com/v6/latest/USD", pick: (d) => Number(d?.rates?.BRL), source: "er-api" },
    { url: "https://economia.awesomeapi.com.br/json/last/USDBRL", pick: (d) => Number(d?.USDBRL?.bid), source: "awesomeapi" },
  ];
  for (const s of sources) {
    try {
      const res = await fetchWithTimeout(s.url);
      const bid = s.pick(await res.json());
      if (Number.isFinite(bid) && bid > 0) {
        rateCache = { at: Date.now(), value: bid };
        return { value: bid, source: s.source };
      }
    } catch {
      /* próxima fonte */
    }
  }
  const configured = Number(await getSettingValue("usd_brl"));
  if (Number.isFinite(configured) && configured > 0) return { value: configured, source: "cadastro" };
  if (rateCache) return { value: rateCache.value, source: "cache" };
  return { value: 5.5, source: "padrao" };
}

// ─── Preço do modelo (página pública da Replicate) ───────────────────────────
function parsePriceFromHtml(html: string): MusicModelPrice {
  const price: MusicModelPrice = { usd: null, unit: null, unitLabel: null, medianUsd: null, ok: false };

  const median = html.match(/"p50price"\s*:\s*"\$([0-9]+(?:\.[0-9]+)?)"/);
  if (median) price.medianUsd = Number(median[1]);

  const billingIndex = html.indexOf('"billingConfig"');
  if (billingIndex >= 0) {
    const block = html.slice(billingIndex, billingIndex + 1500);
    const perUnit = block.match(/"price"\s*:\s*"\$([0-9]+(?:\.[0-9]+)?)"[\s\S]{0,240}?"title"\s*:\s*"([^"]+)"/);
    if (perUnit) {
      price.usd = Number(perUnit[1]);
      price.unit = perUnit[2];
    } else {
      const plain = block.match(/"price"\s*:\s*"\$([0-9]+(?:\.[0-9]+)?)"/);
      if (plain) price.usd = Number(plain[1]);
    }
  }

  if (price.unit) {
    const hit = UNIT_TRANSLATIONS.find(([re]) => re.test(price.unit!));
    price.unitLabel = hit ? hit[1] : price.unit;
  }
  price.ok = price.usd !== null || price.medianUsd !== null;
  return price;
}

export async function getModelPrice(id: string): Promise<MusicModelPrice> {
  const cached = priceCache.get(id);
  if (cached && Date.now() - cached.at < PRICE_TTL_MS) return cached.price;

  const fallback: MusicModelPrice = { usd: null, unit: null, unitLabel: null, medianUsd: null, ok: false };
  try {
    const res = await fetchWithTimeout(`https://replicate.com/${id}`);
    if (!res.ok) return fallback;
    const price = parsePriceFromHtml(await res.text());
    priceCache.set(id, { at: Date.now(), price });
    return price;
  } catch {
    return fallback;
  }
}

/** Custo estimado de 1 música, conforme a métrica de cobrança do modelo. */
export function estimateSongCostUsd(price: MusicModelPrice, seconds = ESTIMATED_SONG_SECONDS): number | null {
  if (price.usd === null) return price.medianUsd;
  const unit = (price.unit || "").toLowerCase();
  if (unit.includes("thousand")) return (price.usd / 1000) * seconds;
  if (unit.includes("hour")) return (price.usd / 3600) * seconds;
  if (unit.includes("second")) return price.usd * seconds;
  if (unit.includes("file") || unit.includes("run") || unit.includes("output") || unit.includes("prediction")) {
    return price.usd;
  }
  return price.medianUsd ?? price.usd;
}

// ─── Modelos de música do OpenRouter ─────────────────────────────────────────
const TTS_RE = /text-to-speech|speech synthesis|\bTTS\b|\bvoices?\b/i;
const OR_MUSIC_RE = /\blyria\b|\bmusic\b|\bsongs?\b|\blyrics?\b|\bmusicgen\b|\bbeat\b/i;

/** Só modelos que geram música de verdade (exclui TTS / voz do OpenAI). */
function isOpenRouterMusicModel(m: any): boolean {
  const hay = `${m?.id || ""} ${m?.name || ""} ${m?.description || ""}`;
  return OR_MUSIC_RE.test(hay) && !TTS_RE.test(hay);
}

/** Preço por música publicado na descrição do modelo (ex.: "$0.08 per song", "$0.04 per clip"). */
function parseSongPriceFromDescription(description: string): { usd: number | null; unit: string | null } {
  const hit = (description || "").match(/\$([0-9]+(?:\.[0-9]+)?)\s*per\s+(song|clip)/i);
  if (!hit) return { usd: null, unit: null };
  return { usd: Number(hit[1]), unit: hit[2].toLowerCase() === "clip" ? "por clipe (30s)" : "por música" };
}

let openRouterCache: { at: number; data: any[] } | null = null;

async function fetchOpenRouterMusicModels(): Promise<any[]> {
  if (openRouterCache && Date.now() - openRouterCache.at < CATALOG_TTL_MS) return openRouterCache.data;
  try {
    const res = await fetchWithTimeout("https://openrouter.ai/api/v1/models?output_modalities=audio", {}, 12000);
    if (!res.ok) return openRouterCache?.data || [];
    const json: any = await res.json();
    const list = (Array.isArray(json?.data) ? json.data : []).filter(isOpenRouterMusicModel);
    openRouterCache = { at: Date.now(), data: list };
    return list;
  } catch {
    return openRouterCache?.data || [];
  }
}

function matchesQuery(model: MusicModelInfo, q: string): boolean {
  const terms = q.toLowerCase().split(/\s+/).filter((t) => t.length > 2 && t !== "music" && t !== "generation");
  if (terms.length === 0) return true;
  const hay = `${model.id} ${model.owner} ${model.name} ${model.description}`.toLowerCase();
  return terms.some((t) => hay.includes(t));
}

/** Modelos de música do OpenRouter, já no formato do catálogo (id com prefixo `openrouter:`). */
async function buildOpenRouterCatalog(
  query: string,
  rate: number,
  filterByQuery: boolean
): Promise<MusicModelInfo[]> {
  const list = await fetchOpenRouterMusicModels();
  const models: MusicModelInfo[] = list.map((m: any) => {
    const id = `${OPENROUTER_MODEL_PREFIX}${m.id}`;
    const { usd, unit } = parseSongPriceFromDescription(m.description || "");
    const price: MusicModelPrice = {
      usd,
      unit,
      unitLabel: unit,
      medianUsd: null,
      ok: usd !== null,
    };
    return {
      id,
      provider: "openrouter" as const,
      owner: m.id.split("/")[0] || "openrouter",
      name: m.name || m.id,
      description: (m.description || "").replace(/\s+/g, " ").trim().slice(0, 220),
      url: `https://openrouter.ai/${m.id}`,
      coverImageUrl: null,
      runCount: null,
      price,
      songCostUsd: usd,
      songCostBrl: usd === null ? null : Math.round(usd * rate * 100) / 100,
    } satisfies MusicModelInfo;
  });
  return filterByQuery ? models.filter((m) => matchesQuery(m, query)) : models;
}

// ─── Modelos de música do kie.ai (Suno) ─────────────────────────────────────
/**
 * Preço publicado pelo kie.ai: 12 créditos por geração ≈ US$ 0,06.
 * Usamos o piso por música na estimativa de custo do admin.
 */
const KIE_SONG_USD = 0.06;

/**
 * Modelos do kie.ai (Suno) no formato do catálogo.
 * A lista vem da API deles (`GET /api/v1/models`, cache 30min) e, se não houver
 * chave/chamada falhar, cai para os modelos vigentes fixos — sempre com V6 à frente.
 */
async function buildKieCatalog(query: string, rate: number, filterByQuery: boolean): Promise<MusicModelInfo[]> {
  const descriptions: Record<string, string> = {
    V6: "Suno V6 — expressão musical e vozes mais naturais (12 créditos ≈ US$ 0,06 por geração)",
    V6_MINI: "Suno V6 Mini — leve e rápido, equilíbrio entre qualidade e velocidade",
    V6_WILD: "Suno V6 Wild — fronteiras criativas, estilo mais ousado e distinto",
  };
  const { ids, live } = await listKieMusicModels();
  // Sem chave/chamada falhou: mostra só os modelos vigentes; com a API, a lista real.
  const ordered = [...new Set([...KIE_CURRENT_MODELS, ...(live ? ids : [])])];
  const models: MusicModelInfo[] = ordered.map((model) => ({
    id: `${KIE_MODEL_PREFIX}${model}`,
    provider: "kie" as const,
    owner: "kie.ai",
    name: `Suno ${model.replace(/_/g, " ")}`,
    description: descriptions[model] || `Modelo de música do kie.ai (${model})`,
    url: "https://kie.ai/suno-api",
    coverImageUrl: null,
    runCount: null,
    price: {
      usd: KIE_SONG_USD,
      unit: "por geração (12 créditos)",
      unitLabel: "por geração (12 créditos)",
      medianUsd: null,
      ok: true,
    },
    songCostUsd: KIE_SONG_USD,
    songCostBrl: Math.round(KIE_SONG_USD * rate * 100) / 100,
  }));
  return filterByQuery ? models.filter((m) => matchesQuery(m, query)) : models;
}

// ─── Catálogo ────────────────────────────────────────────────────────────────
async function searchRaw(query: string, apiKey: string): Promise<any[]> {
  const attempts = [
    `https://api.replicate.com/v1/search?query=${encodeURIComponent(query)}`,
    `https://api.replicate.com/v1/models?limit=20&query=${encodeURIComponent(query)}`,
  ];
  for (const url of attempts) {
    try {
      const res = await fetchWithTimeout(url, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (!res.ok) continue;
      const data: any = await res.json();
      const list = Array.isArray(data?.models) ? data.models : Array.isArray(data?.results) ? data.results : [];
      const mapped = list.map((entry: any) => entry?.model ?? entry).filter((m: any) => m?.owner && m?.name);
      if (mapped.length > 0) return mapped;
    } catch {
      /* tenta a próxima rota */
    }
  }
  return [];
}

/**
 * Catálogo de modelos de geração de música com custo estimado por hit.
 * Busca na API do Replicate + modelos de música do OpenRouter (cache de 30min/24h).
 * Cada modelo traz `provider` para o painel mostrar de quem é o modelo.
 */
export async function getMusicCatalog(query: string): Promise<CatalogResponse> {
  const normalized = (query || "").trim().slice(0, 60) || "music generation";
  if (catalogCache && catalogCache.query === normalized && Date.now() - catalogCache.at < CATALOG_TTL_MS) {
    return catalogCache.data;
  }

  const rate = await getUsdBrlRate();
  const config = await getReplicateConfig();
  const models: MusicModelInfo[] = [];

  if (config.apiKey) {
    const raw = await searchRaw(normalized, config.apiKey);
    const seen = new Set<string>();
    const picked: any[] = [];
    for (const m of raw) {
      const id = `${m.owner}/${m.name}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const haystack = `${m.owner} ${m.name} ${m.description || ""}`;
      if (!MUSIC_RE.test(haystack)) continue;
      picked.push(m);
    }

    const replicateModels = await Promise.all(
      picked.slice(0, 12).map(async (m) => {
        const id = `${m.owner}/${m.name}`;
        const price = await getModelPrice(id);
        const songCostUsd = estimateSongCostUsd(price);
        return {
          id,
          provider: "replicate" as const,
          owner: m.owner,
          name: m.name,
          description: (m.description || "").trim().slice(0, 220),
          url: m.url || `https://replicate.com/${id}`,
          coverImageUrl: m.cover_image_url || null,
          runCount: typeof m.run_count === "number" ? m.run_count : null,
          price,
          songCostUsd,
          songCostBrl: songCostUsd === null ? null : Math.round(songCostUsd * rate.value * 100) / 100,
        } satisfies MusicModelInfo;
      })
    );
    models.push(...replicateModels);
  }

  // Modelos de música do OpenRouter entram sempre (são poucos e fixos) e seguem a mesma busca.
  models.push(...(await buildOpenRouterCatalog(normalized, rate.value, normalized !== "music generation")));

  // Modelos do kie.ai (Suno) — lista fixa publicada por eles, mesmo critério de busca.
  models.push(...(await buildKieCatalog(normalized, rate.value, normalized !== "music generation")));

  const data: CatalogResponse = {
    usdBrl: rate.value,
    rateSource: rate.source,
    estimatedSongSeconds: ESTIMATED_SONG_SECONDS,
    models,
  };
  catalogCache = { at: Date.now(), query: normalized, data };
  return data;
}
