/**
 * Resolução de provedor de geração de música.
 * A regra é simples e não depende de configuração:
 *   - id com prefixo "openrouter:"  → OpenRouter
 *   - id com prefixo "kie:"         → kie.ai (Suno)
 *   - qualquer outro id             → Replicate
 * Assim o admin escolhe só o modelo (no catálogo ele vê de quem é) e o
 * sistema sozinho despacha para a API certa.
 */
export type MusicProvider = "replicate" | "openrouter" | "kie";

export const OPENROUTER_MODEL_PREFIX = "openrouter:";
export const KIE_MODEL_PREFIX = "kie:";

export function resolveMusicProvider(modelId: string | null | undefined): MusicProvider {
  const id = modelId || "";
  if (id.startsWith(OPENROUTER_MODEL_PREFIX)) return "openrouter";
  if (id.startsWith(KIE_MODEL_PREFIX)) return "kie";
  return "replicate";
}

/** Remove o prefixo do provedor para obter o id real do modelo na API dele. */
export function stripProviderPrefix(modelId: string): string {
  if (modelId.startsWith(OPENROUTER_MODEL_PREFIX)) return modelId.slice(OPENROUTER_MODEL_PREFIX.length);
  if (modelId.startsWith(KIE_MODEL_PREFIX)) return modelId.slice(KIE_MODEL_PREFIX.length);
  return modelId;
}

/** Garante o prefixo do provedor no id (usado ao salvar o modelo escolhido). */
export function withProviderPrefix(modelId: string, provider: MusicProvider): string {
  if (provider === "openrouter" && !modelId.startsWith(OPENROUTER_MODEL_PREFIX)) {
    return `${OPENROUTER_MODEL_PREFIX}${modelId}`;
  }
  if (provider === "kie" && !modelId.startsWith(KIE_MODEL_PREFIX)) {
    return `${KIE_MODEL_PREFIX}${modelId}`;
  }
  return modelId;
}

/**
 * Normaliza ids gravados antes da multi-provedor (sem prefixo).
 * Ex.: "google/lyria-3-pro" → "openrouter:google/lyria-3-pro" e "V6" → "kie:V6".
 * Sem isso o id cairia no Replicate e a geração falharia com modelo inexistente.
 */
export function normalizeMusicModelId(modelId: string | null | undefined): string {
  const id = (modelId || "").trim();
  if (!id || id.startsWith(OPENROUTER_MODEL_PREFIX) || id.startsWith(KIE_MODEL_PREFIX)) return id;
  if (/^google\/lyria/i.test(id)) return `${OPENROUTER_MODEL_PREFIX}${id}`;
  // "V6", "V6_MINI", "V5_5"... — a Replicate não tem modelo solto sem "dono/"
  if (/^V\d(_[A-Za-z0-9]+)?$/.test(id)) return `${KIE_MODEL_PREFIX}${id}`;
  return id;
}
