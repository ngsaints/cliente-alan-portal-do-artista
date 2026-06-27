import { Router, type IRouter } from "express";
import multer from "multer";
import sharp from "sharp";
import { db, songsTable, artistsTable, interestsTable, plansTable, appSettingsTable, subscriptionsTable } from "@workspace/db";
import { eq, ne, sql, count, and, inArray } from "drizzle-orm";
import { FREE_PLAN } from "./payments";
import { uploadToR2, generateR2Key, r2Enabled } from "../lib/r2-storage.js";
import { getAsaasCredentials } from "../lib/asaas-client.js";
import path from "path";
import fs from "fs";

function inferCategory(key: string): string {
  if (key.startsWith("demo_")) return "demo";
  if (key.startsWith("asaas_")) return "asaas";
  if (key.startsWith("r2_")) return "r2";
  if (key.startsWith("portal_")) return "portal";
  if (key.startsWith("mp_")) return "mercadopago";
  if (key.startsWith("smtp_") || key.startsWith("email_")) return "email";
  return "geral";
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

async function saveDemoImage(buffer: Buffer, originalName: string): Promise<string> {
  const jpgBuffer = await sharp(buffer).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  if (r2Enabled) {
    const key = generateR2Key("demo", originalName.replace(/\.\w+$/, ".jpg"));
    return uploadToR2(jpgBuffer, key, "image/jpeg");
  }
  const dir = path.join(process.cwd(), "uploads/demo");
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${Date.now()}_${originalName.replace(/\.\w+$/, ".jpg")}`;
  fs.writeFileSync(path.join(dir, filename), jpgBuffer);
  return `/api/uploads/demo/${filename}`;
}

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
      db.select().from(artistsTable).where(eq(artistsTable.plano, FREE_PLAN)),
      db.select().from(artistsTable).where(sql`${artistsTable.plano} != ${FREE_PLAN}`),
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
router.put("/admin/settings", upload.fields([
  { name: "demo_capa_url", maxCount: 1 },
  { name: "demo_banner_url", maxCount: 10 },
]), async (req, res): Promise<void> => {
  if (!req.session.logado) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const files = req.files as Record<string, Express.Multer.File[]>;

    // Handle file uploads (demo images)
    if (files?.["demo_capa_url"]?.[0]) {
      const url = await saveDemoImage(files["demo_capa_url"][0].buffer, files["demo_capa_url"][0].originalname);
      await db
        .insert(appSettingsTable)
        .values({ key: "demo_capa_url", value: url, category: "demo", isSecret: "false", description: "Foto de perfil do artista", updatedAt: new Date() })
        .onConflictDoUpdate({ target: appSettingsTable.key, set: { value: url, description: "Foto de perfil do artista", updatedAt: new Date() } });
    }

    if (req.body.demo_banners_metadata) {
      let rawMetadata = req.body.demo_banners_metadata;
      if (Array.isArray(rawMetadata)) {
        rawMetadata = rawMetadata[rawMetadata.length - 1];
      }
      const metadata = JSON.parse(rawMetadata);
      const uploadedFiles = files?.["demo_banner_url"] || [];
      let newFileIdx = 0;
      const demoBanners: { url: string; link: string }[] = [];

      for (const item of metadata) {
        if (item.isNew) {
          const file = uploadedFiles[newFileIdx];
          if (file) {
            const url = await saveDemoImage(file.buffer, file.originalname);
            demoBanners.push({ url, link: item.link || "" });
            newFileIdx++;
          }
        } else if (item.url) {
          demoBanners.push({ url: item.url, link: item.link || "" });
        }
      }

      const value = JSON.stringify(demoBanners);
      await db
        .insert(appSettingsTable)
        .values({ key: "demo_banner_url", value, category: "demo", isSecret: "false", description: "Carrossel de banners da página demo", updatedAt: new Date() })
        .onConflictDoUpdate({ target: appSettingsTable.key, set: { value, updatedAt: new Date() } });
    } else if (files?.["demo_banner_url"]?.[0]) {
      const url = await saveDemoImage(files["demo_banner_url"][0].buffer, files["demo_banner_url"][0].originalname);
      await db
        .insert(appSettingsTable)
        .values({ key: "demo_banner_url", value: url, category: "demo", isSecret: "false", description: "Banner da página demo", updatedAt: new Date() })
        .onConflictDoUpdate({ target: appSettingsTable.key, set: { value: url, updatedAt: new Date() } });
    }

    // Handle regular text fields
    const updates = req.body as Record<string, string>;
    for (const [key, value] of Object.entries(updates)) {
      if (!key || key === "undefined") continue;
      if (key === "demo_capa_url" || key === "demo_banner_url" || key === "demo_banners_metadata") continue;

      await db
        .insert(appSettingsTable)
        .values({ key, value, category: inferCategory(key), isSecret: "false", updatedAt: new Date() })
        .onConflictDoUpdate({ target: appSettingsTable.key, set: { value, updatedAt: new Date() } });
    }

    // Clean up any accidental metadata rows from the database
    await db
      .delete(appSettingsTable)
      .where(eq(appSettingsTable.key, "demo_banners_metadata"));

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
    if (category === "demo") {
      await db
        .update(appSettingsTable)
        .set({ description: "Foto de perfil do artista" })
        .where(eq(appSettingsTable.key, "demo_capa_url"));
    }

    if (category === "clarity") {
      const existing = await db
        .select()
        .from(appSettingsTable)
        .where(eq(appSettingsTable.key, "clarity_project_id"));
      if (existing.length === 0) {
        await db.insert(appSettingsTable).values({
          category: "clarity",
          key: "clarity_project_id",
          value: "",
          isSecret: "false",
          description: "Microsoft Clarity Project ID para análise de comportamento e mapa de calor."
        });
      }
    }

    const settings = await db
      .select()
      .from(appSettingsTable)
      .where(
        and(
          eq(appSettingsTable.category, category),
          ne(appSettingsTable.key, "demo_banners_metadata")
        )
      )
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

    const artistIds = artists.map(a => a.id);
    const subs = artistIds.length > 0
      ? await db
          .select({ artistId: subscriptionsTable.artistId, couponCode: subscriptionsTable.couponCode })
          .from(subscriptionsTable)
          .where(and(
            inArray(subscriptionsTable.artistId, artistIds.map(String)),
            sql`${subscriptionsTable.couponCode} IS NOT NULL`
          ))
          .orderBy(sql`${subscriptionsTable.createdAt} DESC`)
      : [];

    const couponByArtist: Record<string, string> = {};
    for (const s of subs) {
      if (!couponByArtist[s.artistId]) {
        couponByArtist[s.artistId] = s.couponCode!;
      }
    }

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
      couponCode: couponByArtist[String(a.id)] || null,
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

// POST /admin/artists/:id/grant-plan - Admin grants a plan with expiration
router.post("/admin/artists/:id/grant-plan", async (req, res): Promise<void> => {
  if (!req.session.logado) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const { id } = req.params;
    const { plano, duracaoMeses } = req.body;

    if (!plano || !duracaoMeses) {
      res.status(400).json({ error: "Plano e duração são obrigatórios" });
      return;
    }

    const [plan] = await db.select().from(plansTable).where(eq(plansTable.nome, plano));
    if (!plan) {
      res.status(404).json({ error: "Plano não encontrado" });
      return;
    }

    const meses = parseInt(duracaoMeses) || 1;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + meses);

    await db.insert(subscriptionsTable).values({
      artistId: id,
      planNome: plano,
      asaasSubscriptionId: "admin_grant_" + Date.now(),
      status: "active",
      amount: "0",
      billingType: "ADMIN_GRANT",
      startedAt: new Date(),
      expiresAt,
    });

    await db
      .update(artistsTable)
      .set({
        plano,
        planoAtivo: true,
        limiteMusicas: String(plan.limiteMusicas),
        personalizacaoPercent: String(plan.personalizacaoPercent),
        updatedAt: new Date(),
      })
      .where(eq(artistsTable.id, parseInt(id)));

    res.json({
      success: true,
      plano,
      expiresAt: expiresAt.toISOString(),
      message: `Plano ${plano} concedido por ${meses} mes(es)`,
    });
  } catch (error) {
    console.error("Error granting plan:", error);
    res.status(500).json({ error: "Erro ao conceder plano" });
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
    const { 
      nome, label, preco, limiteMusicas, personalizacaoPercent, 
      descricao, fraseEfeito, ativo,
      canCustomizeFont, canCustomizeBackground, canCustomizeTextColor,
      canCustomizePlayerStyle, canCustomizePlayerColor,
      canUploadBanner, canUploadProfilePhoto
    } = req.body;

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
        canCustomizeFont,
        canCustomizeBackground,
        canCustomizeTextColor,
        canCustomizePlayerStyle,
        canCustomizePlayerColor,
        canUploadBanner,
        canUploadProfilePhoto,
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
    const { 
      nome, label, preco, limiteMusicas, personalizacaoPercent, 
      descricao, fraseEfeito, ativo,
      canCustomizeFont, canCustomizeBackground, canCustomizeTextColor,
      canCustomizePlayerStyle, canCustomizePlayerColor,
      canUploadBanner, canUploadProfilePhoto
    } = req.body;

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
        canCustomizeFont: canCustomizeFont ?? true,
        canCustomizeBackground: canCustomizeBackground ?? true,
        canCustomizeTextColor: canCustomizeTextColor ?? true,
        canCustomizePlayerStyle: canCustomizePlayerStyle ?? true,
        canCustomizePlayerColor: canCustomizePlayerColor ?? true,
        canUploadBanner: canUploadBanner ?? false,
        canUploadProfilePhoto: canUploadProfilePhoto ?? false,
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

// ─── Sincronizar assinaturas pendentes com Asaas (manual / admin) ──────────
router.post("/admin/sync-subscriptions", async (req, res): Promise<void> => {
  try {
    if (!req.session.logado) { res.status(401).json({ error: "Não autorizado" }); return; }
    const { apiKey: hasKey } = await getAsaasCredentials();
    if (!hasKey) { res.status(500).json({ error: "Asaas não configurado" }); return; }

    const pendings = await db.select().from(subscriptionsTable).where(
      and(eq(subscriptionsTable.status, "pending"), sql`${subscriptionsTable.asaasSubscriptionId} IS NOT NULL`)
    );

    const results: any[] = [];

    for (const sub of pendings) {
      if (!sub.asaasSubscriptionId || sub.asaasSubscriptionId.startsWith("direct_")) continue;

      try {
        const { getSubscriptionPayments } = await import("../lib/asaas-client.js");
        const payments = await getSubscriptionPayments(sub.asaasSubscriptionId!);
        const firstPayment = payments.data?.[0];

        if (firstPayment) {
          if (firstPayment.status === "RECEIVED" || firstPayment.status === "CONFIRMED") {
            const externalRef = firstPayment.externalReference ?? "";
            const [artistId, planId] = externalRef.split("-");

            const existing = await db.select().from(subscriptionsTable).where(
              and(eq(subscriptionsTable.asaasPaymentId, firstPayment.id), eq(subscriptionsTable.status, "active"))
            );

            if (existing.length === 0 && artistId && planId) {
              const [plan] = await db.select().from(plansTable).where(eq(plansTable.nome, planId));
              if (plan) {
                await db.update(artistsTable).set({
                  plano: planId, planoAtivo: true,
                  limiteMusicas: String(plan.limiteMusicas),
                  personalizacaoPercent: String(plan.personalizacaoPercent),
                  updatedAt: new Date(),
                }).where(eq(artistsTable.id, parseInt(artistId)));

                await db.update(subscriptionsTable).set({
                  status: "active", asaasPaymentId: firstPayment.id,
                  billingType: firstPayment.billingType ?? null,
                }).where(eq(subscriptionsTable.id, sub.id));

                results.push({ subscriptionId: sub.id, artistId, planId, status: "activated", paymentId: firstPayment.id });
              }
            } else {
              results.push({ subscriptionId: sub.id, status: "already_processed" });
            }
          } else {
            results.push({ subscriptionId: sub.id, status: firstPayment.status });
          }
        } else {
          results.push({ subscriptionId: sub.id, status: "no_payments_found" });
        }
      } catch (err: any) {
        results.push({ subscriptionId: sub.id, error: err.message });
      }
    }

    res.json({ processed: results.length, results });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? "Erro na sincronização" });
  }
});

export default router;
