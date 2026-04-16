import { Router, type IRouter } from "express";
import { db, songsTable, artistsTable, interestsTable, plansTable, appSettingsTable } from "@workspace/db";
import { eq, sql, count } from "drizzle-orm";

const router: IRouter = Router();

// GET /admin/stats - Dashboard statistics
router.get("/admin/stats", async (_req, res): Promise<void> => {
  try {
    const [allSongs, allArtists, allInterests, allPlans] = await Promise.all([
      db.select().from(songsTable),
      db.select().from(artistsTable),
      db.select().from(interestsTable),
      db.select().from(plansTable),
    ]);

    const [availSongs, vipSongs, freeArtists, paidArtists] = await Promise.all([
      db.select().from(songsTable).where(eq(songsTable.status, "Disponível")),
      db.select().from(songsTable).where(eq(songsTable.isVip, true)),
      db.select().from(artistsTable).where(eq(artistsTable.plano, "free")),
      db.select().from(artistsTable).where(sql`${artistsTable.plano} != 'free'`),
    ]);

    res.json({
      totalSongs: allSongs.length,
      totalArtists: allArtists.length,
      totalInterests: allInterests.length,
      totalPlans: allPlans.length,
      availableSongs: availSongs.length,
      vipSongs: vipSongs.length,
      freeArtists: freeArtists.length,
      paidArtists: paidArtists.length,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Erro ao buscar estatísticas" });
  }
});

// GET /admin/settings - List all app settings (masked secrets)
router.get("/admin/settings", async (req, res): Promise<void> => {
  if (!req.session.logado) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const settings = await db.select().from(appSettingsTable).orderBy(appSettingsTable.category, appSettingsTable.key);

    // Mask secret values
    const result = settings.map(s => ({
      id: s.id,
      category: s.category,
      key: s.key,
      value: s.isSecret === "true" && s.value ? "••••••••" : (s.value || ""),
      isSecret: s.isSecret === "true",
      description: s.description,
      updatedAt: s.updatedAt,
    }));

    res.json(result);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ error: "Erro ao buscar configurações" });
  }
});

// PUT /admin/settings - Update app settings
router.put("/admin/settings", async (req, res): Promise<void> => {
  if (!req.session.logado) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const updates = req.body as Record<string, string>;

    for (const [key, value] of Object.entries(updates)) {
      if (!key || key === "undefined") continue;

      await db
        .update(appSettingsTable)
        .set({ value, updatedAt: new Date() })
        .where(eq(appSettingsTable.key, key));
    }

    res.json({ message: "Configurações atualizadas com sucesso" });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ error: "Erro ao atualizar configurações" });
  }
});

// GET /admin/settings/:category - Get settings by category
router.get("/admin/settings/:category", async (req, res): Promise<void> => {
  if (!req.session.logado) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const { category } = req.params;
    const settings = await db
      .select()
      .from(appSettingsTable)
      .where(eq(appSettingsTable.category, category))
      .orderBy(appSettingsTable.key);

    const result = settings.map(s => ({
      id: s.id,
      category: s.category,
      key: s.key,
      value: s.isSecret === "true" && s.value ? "••••••••" : (s.value || ""),
      rawValue: s.value || "", // For editing, send raw value
      isSecret: s.isSecret === "true",
      description: s.description,
      updatedAt: s.updatedAt,
    }));

    res.json(result);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ error: "Erro ao buscar configurações" });
  }
});

// GET /admin/recent-interests - Latest contact form submissions
router.get("/admin/recent-interests", async (req, res): Promise<void> => {
  if (!req.session.logado) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const limit = Number(req.query.limit) || 20;
    const interests = await db
      .select()
      .from(interestsTable)
      .orderBy(interestsTable.createdAt)
      .limit(limit);

    res.json(interests);
  } catch (error) {
    console.error("Error fetching interests:", error);
    res.status(500).json({ error: "Erro ao buscar interesses" });
  }
});

// PUT /admin/interests/:id/mark-read
router.put("/admin/interests/:id/mark-read", async (req, res): Promise<void> => {
  if (!req.session.logado) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const { id } = req.params;
    await db
      .update(interestsTable)
      .set({ lido: true })
      .where(eq(interestsTable.id, parseInt(id)));

    res.json({ message: "Marcado como lido" });
  } catch (error) {
    console.error("Error marking interest:", error);
    res.status(500).json({ error: "Erro ao marcar como lido" });
  }
});

// GET /admin/artists - List all artists
router.get("/admin/artists", async (req, res): Promise<void> => {
  if (!req.session.logado) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const artists = await db.select().from(artistsTable).orderBy(artistsTable.createdAt);
    res.json(artists.map(a => ({
      id: a.id,
      name: a.name,
      email: a.email,
      profissao: a.profissao,
      cidade: a.cidade,
      plano: a.plano,
      planoAtivo: a.planoAtivo,
      musicaCount: a.musicaCount,
      limiteMusicas: a.limiteMusicas,
      createdAt: a.createdAt,
    })));
  } catch (error) {
    console.error("Error fetching artists:", error);
    res.status(500).json({ error: "Erro ao buscar artistas" });
  }
});

// GET /admin/artists/:id - Get single artist
router.get("/admin/artists/:id", async (req, res): Promise<void> => {
  if (!req.session.logado) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const { id } = req.params;
    const artists = await db.select().from(artistsTable).where(eq(artistsTable.id, parseInt(id)));
    
    if (artists.length === 0) {
      res.status(404).json({ error: "Artista não encontrado" });
      return;
    }

    const a = artists[0];
    res.json({
      id: a.id,
      name: a.name,
      email: a.email,
      profissao: a.profissao,
      cidade: a.cidade,
      instagram: a.instagram,
      tiktok: a.tiktok,
      spotify: a.spotify,
      capaUrl: a.capaUrl,
      bannerUrl: a.bannerUrl,
      plano: a.plano,
      planoAtivo: a.planoAtivo,
      musicaCount: a.musicaCount,
      limiteMusicas: a.limiteMusicas,
      personalizacaoPercent: a.personalizacaoPercent,
      createdAt: a.createdAt,
    });
  } catch (error) {
    console.error("Error fetching artist:", error);
    res.status(500).json({ error: "Erro ao buscar artista" });
  }
});

// PUT /admin/artists/:id - Update artist (plan, status)
router.put("/admin/artists/:id", async (req, res): Promise<void> => {
  if (!req.session.logado) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const { id } = req.params;
    const { plano, planoAtivo, limiteMusicas, personalizacaoPercent } = req.body;

    const [updated] = await db
      .update(artistsTable)
      .set({
        plano: plano,
        planoAtivo: planoAtivo,
        limiteMusicas: limiteMusicas,
        personalizacaoPercent: personalizacaoPercent,
        updatedAt: new Date(),
      })
      .where(eq(artistsTable.id, parseInt(id)))
      .returning();

    res.json({
      id: updated.id,
      name: updated.name,
      plano: updated.plano,
      planoAtivo: updated.planoAtivo,
    });
  } catch (error) {
    console.error("Error updating artist:", error);
    res.status(500).json({ error: "Erro ao atualizar artista" });
  }
});

// DELETE /admin/artists/:id - Delete artist
router.delete("/admin/artists/:id", async (req, res): Promise<void> => {
  if (!req.session.logado) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const { id } = req.params;
    
    const [deleted] = await db
      .delete(artistsTable)
      .where(eq(artistsTable.id, parseInt(id)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Artista não encontrado" });
      return;
    }

    res.json({ message: "Artista deletado com sucesso" });
  } catch (error) {
    console.error("Error deleting artist:", error);
    res.status(500).json({ error: "Erro ao deletar artista" });
  }
});

// GET /admin/plans - List all plans
router.get("/admin/plans", async (req, res): Promise<void> => {
  if (!req.session.logado) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const plans = await db.select().from(plansTable).orderBy(plansTable.id);
    res.json(plans);
  } catch (error) {
    console.error("Error fetching plans:", error);
    res.status(500).json({ error: "Erro ao buscar planos" });
  }
});

// PUT /admin/plans/:id - Update plan
router.put("/admin/plans/:id", async (req, res): Promise<void> => {
  if (!req.session.logado) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const { id } = req.params;
    const { nome, label, preco, limiteMusicas, personalizacaoPercent, descricao, fraseEfeito, ativo } = req.body;

    const updated = await db
      .update(plansTable)
      .set({
        nome,
        label,
        preco,
        limiteMusicas,
        personalizacaoPercent,
        descricao,
        fraseEfeito,
        ativo,
      })
      .where(eq(plansTable.id, parseInt(id)))
      .returning();

    if (!updated.length) {
      res.status(404).json({ error: "Plano não encontrado" });
      return;
    }

    res.json(updated[0]);
  } catch (error) {
    console.error("Error updating plan:", error);
    res.status(500).json({ error: "Erro ao atualizar plano" });
  }
});

// POST /admin/plans - Create plan
router.post("/admin/plans", async (req, res): Promise<void> => {
  if (!req.session.logado) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const { nome, label, preco, limiteMusicas, personalizacaoPercent, descricao, fraseEfeito, ativo } = req.body;

    const created = await db
      .insert(plansTable)
      .values({
        nome,
        label,
        preco,
        limiteMusicas,
        personalizacaoPercent: personalizacaoPercent || 0,
        descricao,
        fraseEfeito,
        ativo: ativo ?? true,
      })
      .returning();

    res.status(201).json(created[0]);
  } catch (error) {
    console.error("Error creating plan:", error);
    res.status(500).json({ error: "Erro ao criar plano" });
  }
});

// DELETE /admin/plans/:id - Delete plan
router.delete("/admin/plans/:id", async (req, res): Promise<void> => {
  if (!req.session.logado) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const { id } = req.params;
    const deleted = await db
      .delete(plansTable)
      .where(eq(plansTable.id, parseInt(id)))
      .returning();

    res.json({ message: "Plano deletado com sucesso" });
  } catch (error) {
    console.error("Error deleting plan:", error);
    res.status(500).json({ error: "Erro ao deletar plano" });
  }
});

export default router;
