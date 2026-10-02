import { Router, type IRouter } from "express";
import { db, portalTvEpisodesTable, appSettingsTable, type PortalTvEpisode } from "@workspace/db";
import { eq, desc, asc } from "drizzle-orm";

const router: IRouter = Router();

async function getSettingValue(key: string, defaultValue = ""): Promise<string> {
  try {
    const rows = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, key));
    return rows[0]?.value?.trim() ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

async function setSettingValue(key: string, value: string, category = "portal", description = ""): Promise<void> {
  await db
    .insert(appSettingsTable)
    .values({ key, value, category, isSecret: "false", description, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettingsTable.key, set: { value, updatedAt: new Date() } });
}

// ─── Rotas Públicas / do Artista ───────────────────────────────────────────

// GET /api/tv/episodes - Lista os episódios ativos e verifica se a TV está habilitada
router.get("/tv/episodes", async (_req, res): Promise<void> => {
  try {
    const enabledSetting = await getSettingValue("portal_tv_enabled", "true");
    const enabled = enabledSetting !== "false";

    if (!enabled) {
      res.json({ enabled: false, episodes: [] });
      return;
    }

    const title = await getSettingValue("portal_tv_title", "TV do Portal & Tutoriais");
    const badge = await getSettingValue("portal_tv_badge", "Novidades");

    const episodes = await db
      .select()
      .from(portalTvEpisodesTable)
      .where(eq(portalTvEpisodesTable.active, true))
      .orderBy(asc(portalTvEpisodesTable.order), desc(portalTvEpisodesTable.id));

    res.json({
      enabled: true,
      title,
      badge,
      episodes,
    });
  } catch (error: any) {
    console.error("Erro ao carregar episódios da TV:", error);
    res.status(500).json({ error: "Erro ao buscar episódios da TV" });
  }
});

// ─── Rotas Administrativas ─────────────────────────────────────────────────

// Middleware simples de autenticação admin
function requireAdmin(req: any, res: any, next: any) {
  if (!req.session?.logado && !req.session?.admin) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }
  next();
}

// GET /api/admin/tv/episodes - Lista todos os episódios (inclusive inativos) e o status geral
router.get("/admin/tv/episodes", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const enabledSetting = await getSettingValue("portal_tv_enabled", "true");
    const title = await getSettingValue("portal_tv_title", "TV do Portal & Tutoriais");
    const badge = await getSettingValue("portal_tv_badge", "Novidades");

    const episodes = await db
      .select()
      .from(portalTvEpisodesTable)
      .orderBy(asc(portalTvEpisodesTable.order), desc(portalTvEpisodesTable.id));

    res.json({
      enabled: enabledSetting !== "false",
      title,
      badge,
      episodes,
    });
  } catch (error: any) {
    console.error("Erro ao listar episódios no admin:", error);
    res.status(500).json({ error: "Erro ao listar episódios" });
  }
});

// POST /api/admin/tv/episodes - Cria um novo episódio (vídeo ou texto)
router.post("/admin/tv/episodes", requireAdmin, async (req, res): Promise<void> => {
  try {
    const {
      title,
      description,
      type = "video",
      videoUrl,
      contentText,
      ctaText,
      ctaUrl,
      thumbnailUrl,
      badge = "Novidade",
      active = true,
      order = 0,
    } = req.body || {};

    if (!title || !String(title).trim()) {
      res.status(400).json({ error: "O título do episódio é obrigatório." });
      return;
    }

    if (type === "video" && (!videoUrl || !String(videoUrl).trim())) {
      res.status(400).json({ error: "Para episódios em vídeo, informe a URL do vídeo (YouTube, Vimeo ou MP4)." });
      return;
    }

    if (type === "text" && (!contentText || !String(contentText).trim())) {
      res.status(400).json({ error: "Para comunicados em texto, informe o conteúdo da mensagem." });
      return;
    }

    const [created] = await db
      .insert(portalTvEpisodesTable)
      .values({
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        type: type === "text" ? "text" : "video",
        videoUrl: videoUrl ? String(videoUrl).trim() : null,
        contentText: contentText ? String(contentText).trim() : null,
        ctaText: ctaText ? String(ctaText).trim() : null,
        ctaUrl: ctaUrl ? String(ctaUrl).trim() : null,
        thumbnailUrl: thumbnailUrl ? String(thumbnailUrl).trim() : null,
        badge: badge ? String(badge).trim() : "Novidade",
        active: Boolean(active),
        order: Number(order) || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    res.status(201).json(created);
  } catch (error: any) {
    console.error("Erro ao criar episódio da TV:", error);
    res.status(500).json({ error: error.message || "Erro ao criar episódio" });
  }
});

// PUT /api/admin/tv/episodes/:id - Edita um episódio existente
router.put("/admin/tv/episodes/:id", requireAdmin, async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID de episódio inválido." });
      return;
    }

    const {
      title,
      description,
      type,
      videoUrl,
      contentText,
      ctaText,
      ctaUrl,
      thumbnailUrl,
      badge,
      active,
      order,
    } = req.body || {};

    const updates: Partial<PortalTvEpisode> = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updates.title = String(title).trim();
    if (description !== undefined) updates.description = description ? String(description).trim() : null;
    if (type !== undefined) updates.type = type === "text" ? "text" : "video";
    if (videoUrl !== undefined) updates.videoUrl = videoUrl ? String(videoUrl).trim() : null;
    if (contentText !== undefined) updates.contentText = contentText ? String(contentText).trim() : null;
    if (ctaText !== undefined) updates.ctaText = ctaText ? String(ctaText).trim() : null;
    if (ctaUrl !== undefined) updates.ctaUrl = ctaUrl ? String(ctaUrl).trim() : null;
    if (thumbnailUrl !== undefined) updates.thumbnailUrl = thumbnailUrl ? String(thumbnailUrl).trim() : null;
    if (badge !== undefined) updates.badge = badge ? String(badge).trim() : "Novidade";
    if (active !== undefined) updates.active = Boolean(active);
    if (order !== undefined) updates.order = Number(order) || 0;

    const [updated] = await db
      .update(portalTvEpisodesTable)
      .set(updates)
      .where(eq(portalTvEpisodesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Episódio não encontrado." });
      return;
    }

    res.json(updated);
  } catch (error: any) {
    console.error("Erro ao atualizar episódio da TV:", error);
    res.status(500).json({ error: error.message || "Erro ao atualizar episódio" });
  }
});

// DELETE /api/admin/tv/episodes/:id - Deleta um episódio
router.delete("/admin/tv/episodes/:id", requireAdmin, async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID de episódio inválido." });
      return;
    }

    const [deleted] = await db
      .delete(portalTvEpisodesTable)
      .where(eq(portalTvEpisodesTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Episódio não encontrado." });
      return;
    }

    res.json({ success: true, message: "Episódio removido com sucesso." });
  } catch (error: any) {
    console.error("Erro ao deletar episódio da TV:", error);
    res.status(500).json({ error: "Erro ao deletar episódio" });
  }
});

// POST /api/admin/tv/toggle - Liga ou desliga a TVzinha no portal inteiro
router.post("/admin/tv/toggle", requireAdmin, async (req, res): Promise<void> => {
  try {
    const { enabled, title, badge } = req.body || {};
    if (enabled !== undefined) {
      await setSettingValue(
        "portal_tv_enabled",
        enabled ? "true" : "false",
        "portal",
        "Ativar ou desativar a TVzinha retrô de novidades e tutoriais no portal"
      );
    }
    if (title !== undefined) {
      await setSettingValue("portal_tv_title", String(title).trim(), "portal", "Título da TV do Portal");
    }
    if (badge !== undefined) {
      await setSettingValue("portal_tv_badge", String(badge).trim(), "portal", "Selo da TV do Portal");
    }

    res.json({
      success: true,
      enabled: enabled !== undefined ? Boolean(enabled) : true,
    });
  } catch (error: any) {
    console.error("Erro ao alterar status da TV:", error);
    res.status(500).json({ error: "Erro ao alterar configuração da TV" });
  }
});

export default router;
