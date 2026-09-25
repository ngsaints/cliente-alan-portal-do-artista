// Fundos de perfil do artista — fonte única usada pelo perfil público e pela prévia do painel.
export const PROFILE_BACKGROUNDS: Record<string, string> = {
  "gradiente-azul": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "gradiente-verde": "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
  "gradiente-roxo": "linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)",
  "gradiente-sol": "linear-gradient(135deg, #f5af19 0%, #f12711 100%)",
  "gradiente-oceano": "linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)",
  "gradiente-rosa": "linear-gradient(135deg, #ff6a88 0%, #ff9a9e 100%)",
  "gradiente-aurora": "linear-gradient(135deg, #00c6ff 0%, #0072ff 50%, #00c6ff 100%)",
  "gradiente-tropical": "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)",
  "gradiente-pink": "linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)",
  "escuro": "#1a1a2e",
  "escuro-azul": "#0f0f23",
  "preto": "#000000",
  "branco": "#ffffff",
  "bege": "#f5f0e1",
  "cinza-claro": "#e5e5e5",
  "azul-escuro": "#1e3a5f",
  "verde-escuro": "#1a4d1a",
  "roxo-escuro": "#2d1b4e",
  "verde-azul": "#1a4d4d",
  "lilas": "#4a1a6b",
  "cinza-escuro": "#2d2d2d",
  "azul-azul": "#1a3a5f",
  "vermelho-escuro": "#5f1a1a",
  "dourado": "#5f4a1a",
  "turquesa": "#1a5f5f",
};

export const DEFAULT_PROFILE_BACKGROUND = "hsl(var(--background))";

export function getProfileBackgroundStyle(layout?: string | null): string {
  if (!layout || layout === "padrao") return DEFAULT_PROFILE_BACKGROUND;
  return PROFILE_BACKGROUNDS[layout] || (/^#/.test(layout) ? layout : DEFAULT_PROFILE_BACKGROUND);
}

/** Primeira cor sólida do fundo (hex ou a cor inicial do gradiente). */
export function resolveProfileBackgroundColor(layout?: string | null): string {
  const style = getProfileBackgroundStyle(layout);
  if (style.startsWith("hsl(")) return "";
  const hex = style.match(/#[0-9a-fA-F]{3,8}/)?.[0];
  return hex || style;
}

/** true quando o fundo escolhido é claro (texto escuro é mais legível). */
export function isLightProfileBackground(layout?: string | null): boolean {
  const hex = resolveProfileBackgroundColor(layout);
  if (!hex || hex.startsWith("hsl(")) return false;

  let r: number, g: number, b: number;
  const m = hex.replace("#", "");
  if (m.length === 3) {
    r = parseInt(m[0] + m[0], 16);
    g = parseInt(m[1] + m[1], 16);
    b = parseInt(m[2] + m[2], 16);
  } else if (m.length >= 6) {
    r = parseInt(m.slice(0, 2), 16);
    g = parseInt(m.slice(2, 4), 16);
    b = parseInt(m.slice(4, 6), 16);
  } else {
    return false;
  }

  // Luminância percebida (0 escuro → 1 claro)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}
