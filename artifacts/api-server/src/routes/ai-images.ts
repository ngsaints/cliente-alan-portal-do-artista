import { Router, type IRouter } from "express";
import { db, artistsTable, songsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { generateAiImage } from "../lib/replicate-image.js";
import { callOpenRouter } from "../lib/openrouter.js";

const router: IRouter = Router();

// Prompts base estilizados para capa de música
const COVER_STYLE_PROMPTS: Record<string, string> = {
  sertanejo_acustico: "Warm golden hour sunset, acoustic guitar on wooden table in rustic Brazilian countryside, lens flare, professional music album cover art, 8k photography, cinematic lighting",
  sertanejo_universitario: "Concert stage with vibrant laser lights, crowd cheering in silhouette, confetti in the air, modern party atmosphere, high energy music single cover art, ultra sharp 8k",
  palco_show: "Dramatic concert stage spotlights cutting through light haze, vintage chrome microphone in foreground, moody bokeh, stadium concert vibe, premium music album cover",
  minimalista_elegante: "Sleek minimalist modern graphic cover art, typography friendly, subtle abstract sound waves, luxury black and gold aesthetic, studio lighting, award winning album cover",
  country_vintage: "Vintage rustic barn wood texture, classic acoustic guitar, warm lantern light, sepia and earthy tones, authentic country music album cover art",
  dark_neon_pop: "Moody dark scene with vibrant neon reflections, rain on asphalt, purple and teal cinematic lighting, intense artistic single cover",
};

// Prompts base estilizados para foto de perfil do artista
const PROFILE_STYLE_PROMPTS: Record<string, string> = {
  estudio_pro: "Professional studio portrait of an artist musician, soft rim lighting, clean dark background, confident and warm expression, 85mm lens, sharp focus, magazine editorial quality",
  palco_microfone: "Musician performing passionately on stage holding a microphone, stadium concert lights behind creating a glowing halo, dramatic atmospheric haze, live concert photography",
  editorial_revista: "High fashion editorial magazine cover portrait of a musician, stylish contemporary outfit, artistic lighting and shadows, Vogue and Rolling Stone photography style",
  acustico_casual: "Casual lifestyle portrait of a singer songwriter holding an acoustic guitar, sitting on a vintage stool, natural window light, authentic and genuine look",
  preto_e_branco: "Black and white dramatic fine art portrait of a musical artist, high contrast, deep shadows, intense emotional gaze, classic Leica portraiture",
};

/**
 * POST /api/ai/images/generate
 * Gera imagem de capa ou foto de perfil com IA e gera texto de marketing / divulgação
 */
router.post("/ai/images/generate", async (req, res): Promise<void> => {
  try {
    const artistId = (req.session as any)?.artistId;
    if (!artistId) {
      res.status(401).json({ error: "Sessão expirada. Faça login novamente." });
      return;
    }

    const {
      type = "cover", // "cover" | "profile"
      title = "",
      genre = "Sertanejo",
      styleKey = "",
      userPrompt = "",
      aspectRatio = "1:1",
      generateMarketingCopy = true,
    } = req.body;

    const [artist] = await db.select().from(artistsTable).where(eq(artistsTable.id, parseInt(artistId)));
    if (!artist) {
      res.status(404).json({ error: "Artista não encontrado" });
      return;
    }

    // 1. Construir prompt visual enriquecido
    let visualBase = "";
    if (type === "profile") {
      visualBase = PROFILE_STYLE_PROMPTS[styleKey] || PROFILE_STYLE_PROMPTS.estudio_pro;
    } else {
      visualBase = COVER_STYLE_PROMPTS[styleKey] || COVER_STYLE_PROMPTS.sertanejo_acustico;
    }

    const fullVisualPrompt = [
      visualBase,
      title ? `Music concept: "${title}"` : "",
      genre ? `Genre atmosphere: ${genre}` : "",
      userPrompt ? `Specific artist request: ${userPrompt}` : "",
      "masterpiece, ultra-detailed, photorealistic, 8k resolution, commercial quality, no distorted text, clean artwork",
    ]
      .filter(Boolean)
      .join(". ");

    // 2. Gerar Imagem com IA (Replicate Flux com fallback Pollinations)
    const { imageUrl, provider } = await generateAiImage({
      prompt: fullVisualPrompt,
      type: type === "profile" ? "profile" : "cover",
      title: title || artist.name || "arte",
      aspectRatio: aspectRatio === "16:9" || aspectRatio === "9:16" ? aspectRatio : "1:1",
    });

    // 3. Gerar Texto de Divulgação e Marketing via Vivi (OpenRouter)
    let marketingCopy = {
      caption: "",
      hashtags: "",
      storiesHook: "",
    };

    if (generateMarketingCopy) {
      try {
        const marketingPrompt =
          type === "profile"
            ? `Você é a Vivi, mentora e especialista em marketing musical do Portal do Artista.
O artista ${artist.name} acabou de gerar uma nova foto de perfil profissional oficial para suas redes sociais.
Gere:
1. Uma legenda envolvente para o Instagram/Facebook anunciando a nova fase/foto de perfil (com chamada para ouvir suas músicas no Portal do Artista: portaldoartista.com/${artist.slug || ""}).
2. Um gancho para Stories/Reels (frase de impacto).
3. 15 hashtags estratégicas para engajamento no nicho ${artist.genero || genre || "música"}.

Retorne em formato JSON puro:
{
  "caption": "texto da legenda aqui...",
  "storiesHook": "gancho curto para stories aqui...",
  "hashtags": "#hashtag1 #hashtag2..."
}`
            : `Você é a Vivi, mentora e especialista em marketing musical do Portal do Artista.
O artista ${artist.name} está lançando ou divulgando a música "${title || "Novo Lançamento"}" (${genre}).
Esta é a capa oficial da faixa!
Gere:
1. Uma legenda de alta conversão para o feed do Instagram/TikTok que prenda a atenção nos primeiros 3 segundos, conte a energia da música e convide o público a ouvir com o link na bio (portaldoartista.com/${artist.slug || ""}).
2. Um roteiro de 1 frase para falar nos Stories mostrando a capa.
3. 15 hashtags de alto alcance para compositores e cantores do gênero ${genre}.

Retorne em formato JSON puro:
{
  "caption": "texto da legenda aqui...",
  "storiesHook": "gancho para stories aqui...",
  "hashtags": "#hashtag1 #hashtag2..."
}`;

        const aiResponse = await callOpenRouter({
          messages: [
            { role: "system", content: "Você é uma assistente de marketing musical especialista em mídias sociais. Responda APENAS JSON válido sem blocos markdown adicionais." },
            { role: "user", content: marketingPrompt },
          ],
          temperature: 0.7,
          maxTokens: 800,
        });

        const cleanJson = (aiResponse.content || "").trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
        const parsed = JSON.parse(cleanJson);
        if (parsed.caption) marketingCopy.caption = parsed.caption;
        if (parsed.hashtags) marketingCopy.hashtags = parsed.hashtags;
        if (parsed.storiesHook) marketingCopy.storiesHook = parsed.storiesHook;
      } catch (err) {
        console.warn("[AI Image] Não foi possível gerar cópia de marketing detalhada:", err);
        marketingCopy = {
          caption: `🚀 Vem novidade por aí! Confiram a arte oficial ${title ? `da música "${title}"` : "do meu perfil"}. Ouça em primeira mão no Portal do Artista!`,
          storiesHook: "Gente, olha essa nova identidade visual! O que acharam? 🔥",
          hashtags: `#${(genre || "musica").toLowerCase().replace(/\s+/g, "")} #novolancamento #portaldoartista #compositor #musicanova`,
        };
      }
    }

    res.json({
      success: true,
      imageUrl,
      provider,
      type,
      marketingCopy,
    });
  } catch (error: any) {
    console.error("Erro ao gerar imagem com IA:", error);
    res.status(500).json({ error: error.message || "Erro ao gerar imagem com inteligência artificial" });
  }
});

/**
 * POST /api/ai/images/set-profile
 * Aplica a imagem gerada como foto de perfil do artista
 */
router.post("/ai/images/set-profile", async (req, res): Promise<void> => {
  try {
    const artistId = (req.session as any)?.artistId;
    if (!artistId) {
      res.status(401).json({ error: "Sessão expirada." });
      return;
    }
    const { imageUrl } = req.body;
    if (!imageUrl) {
      res.status(400).json({ error: "URL da imagem é obrigatória" });
      return;
    }

    await db
      .update(artistsTable)
      .set({ capaUrl: imageUrl, updatedAt: new Date() })
      .where(eq(artistsTable.id, parseInt(artistId)));

    res.json({ success: true, message: "Foto de perfil atualizada com sucesso!", capaUrl: imageUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao atualizar foto de perfil" });
  }
});

/**
 * POST /api/ai/images/set-song-cover
 * Aplica a imagem gerada como capa de uma das músicas do artista
 */
router.post("/ai/images/set-song-cover", async (req, res): Promise<void> => {
  try {
    const artistId = (req.session as any)?.artistId;
    if (!artistId) {
      res.status(401).json({ error: "Sessão expirada." });
      return;
    }
    const { songId, imageUrl } = req.body;
    if (!songId || !imageUrl) {
      res.status(400).json({ error: "ID da música e URL da imagem são obrigatórios" });
      return;
    }

    const [updated] = await db
      .update(songsTable)
      .set({ capaPath: imageUrl, updatedAt: new Date() })
      .where(and(eq(songsTable.id, parseInt(songId)), eq(songsTable.artistaId, parseInt(artistId))))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Música não encontrada no seu perfil" });
      return;
    }

    res.json({ success: true, message: "Capa da música atualizada com sucesso!", song: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao atualizar capa da música" });
  }
});

export default router;
