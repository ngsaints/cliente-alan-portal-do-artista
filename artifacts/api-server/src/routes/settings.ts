import { Router, type IRouter } from "express";
import multer from "multer";
import { db, settingsTable, appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { uploadToR2, generateR2Key, r2Enabled } from "../lib/r2-storage.js";
import path from "path";
import fs from "fs";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router: IRouter = Router();

// Check if R2 is enabled
const useR2 = !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  return row?.value ?? null;
}

async function setSetting(key: string, value: string | null): Promise<void> {
  await db
    .insert(settingsTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value } });
}

router.get("/settings", async (_req, res): Promise<void> => {
  const artistName = (await getSetting("artist_name")) ?? "Alan Ribeiro";
  const artistPhotoUrl = await getSetting("artist_photo_url");
  const artistsSectionTitle = await getSetting("artists_section_title");
  const artistsSectionSubtitle = await getSetting("artists_section_subtitle");
  const heroTitle = await getSetting("hero_title");
  const heroSubtitle = await getSetting("hero_subtitle");
  const heroCTA = await getSetting("hero_cta");

  let clarityProjectId: string | null = null;
  try {
    const [claritySetting] = await db
      .select({ value: appSettingsTable.value })
      .from(appSettingsTable)
      .where(eq(appSettingsTable.key, "clarity_project_id"));
    clarityProjectId = claritySetting?.value || null;
  } catch (err) {
    console.error("Error fetching clarity_project_id setting:", err);
  }

  let suporteInstagram: string | null = null;
  let suporteWhatsapp: string | null = null;
  let suporteEmail: string | null = null;
  let openaiEnabled = false;
  let footerCopyright: string | null = null;
  let footerFounderDescription: string | null = null;
  let footerCopyrightProtection: string | null = null;
  let footerPlatformTagline: string | null = null;
  let landingVideoUrl: string | null = null;
  let landingHeroVideoUrl: string | null = null;
  let landingHeroTitle: string | null = null;
  let landingHeroSubtitle: string | null = null;
  let landingHeroCta: string | null = null;
  let heroFeaturedPlan: string | null = null;

  try {
    const rows = await db
      .select({ key: appSettingsTable.key, value: appSettingsTable.value })
      .from(appSettingsTable)
      .where(eq(appSettingsTable.category, "portal"));
    
    for (const r of rows) {
      if (r.key === "suporte_instagram") suporteInstagram = r.value;
      if (r.key === "suporte_whatsapp") suporteWhatsapp = r.value;
      if (r.key === "suporte_email") suporteEmail = r.value;
      if (r.key === "openai_enabled") openaiEnabled = r.value === "true";
      if (r.key === "landing_video_url") landingVideoUrl = r.value;
      if (r.key === "landing_hero_video_url") landingHeroVideoUrl = r.value;
      if (r.key === "landing_hero_title") landingHeroTitle = r.value;
      if (r.key === "landing_hero_subtitle") landingHeroSubtitle = r.value;
      if (r.key === "landing_hero_cta") landingHeroCta = r.value;
      if (r.key === "hero_featured_plan") heroFeaturedPlan = r.value;
    }
  } catch (err) {
    console.error("Error fetching support/openai settings:", err);
  }

  let pixelMetaId: string | null = null;
  let pixelGoogleId: string | null = null;
  let pixelTiktokId: string | null = null;
  let pixelCustomHeadScript: string | null = null;
  let pixelCustomBodyScript: string | null = null;

  try {
    const pixelRows = await db
      .select({ key: appSettingsTable.key, value: appSettingsTable.value })
      .from(appSettingsTable)
      .where(eq(appSettingsTable.category, "pixel"));
    for (const r of pixelRows) {
      if (r.key === "pixel_meta_id") pixelMetaId = r.value;
      if (r.key === "pixel_google_id") pixelGoogleId = r.value;
      if (r.key === "pixel_tiktok_id") pixelTiktokId = r.value;
      if (r.key === "pixel_custom_head_script") pixelCustomHeadScript = r.value;
      if (r.key === "pixel_custom_body_script") pixelCustomBodyScript = r.value;
    }
  } catch (err) {
    console.error("Error fetching pixel settings:", err);
  }

  res.json({
    artistName,
    artistPhotoUrl: artistPhotoUrl || null,
    artistsSectionTitle: artistsSectionTitle || "Nossos Artistas",
    artistsSectionSubtitle: artistsSectionSubtitle || "Descubra e acompanhe cantores e compositores de todo o Brasil",
    heroTitle: heroTitle || null,
    heroSubtitle: heroSubtitle || null,
    heroCTA: heroCTA || null,
    clarityProjectId,
    pixelMetaId,
    pixelGoogleId,
    pixelTiktokId,
    pixelCustomHeadScript,
    pixelCustomBodyScript,
    suporteInstagram: suporteInstagram || "@Portaldoartista.oficial",
    suporteWhatsapp: suporteWhatsapp || "21 99589 7040",
    suporteEmail: suporteEmail || "portaldoartistaoficial@gmail.com",
    openaiEnabled,
    landingVideoUrl: landingVideoUrl || "",
    landingHeroVideoUrl: landingHeroVideoUrl || "",
    landingHeroTitle: landingHeroTitle || "Sua música pode ser incrível. Mas ela está sendo apresentada como merece?",
    landingHeroSubtitle: landingHeroSubtitle || "Pare de enviar apenas um MP3. Crie sua página profissional, organize sua carreira e apresente suas músicas como um artista profissional.",
    landingHeroCta: landingHeroCta || "COMEÇAR AGORA",
    heroFeaturedPlan: heroFeaturedPlan || "premium",
  });
});

router.get("/demo-settings", async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select({ key: appSettingsTable.key, value: appSettingsTable.value })
      .from(appSettingsTable)
      .where(eq(appSettingsTable.category, "demo"));

    const settings: Record<string, string> = {};
    for (const row of rows) {
      if (row.value) settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (error) {
    console.error("Error fetching demo settings:", error);
    res.json({});
  }
});

router.post("/vip-verify", async (req, res): Promise<void> => {
  const { senha } = req.body;
  if (!senha) {
    res.status(400).json({ error: "Senha é obrigatória" });
    return;
  }
  const vipPassword = await getSetting("vip_password");
  if (!vipPassword) {
    res.status(403).json({ error: "Área VIP não configurada" });
    return;
  }
  if (senha === vipPassword) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Senha incorreta" });
  }
});

router.put(
  "/settings",
  upload.single("photo"),
  async (req, res): Promise<void> => {
    if (!req.session.logado) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }

    const { artistName, vipPassword, artistsSectionTitle, artistsSectionSubtitle, heroTitle, heroSubtitle, heroCTA } = req.body;

    if (artistName) await setSetting("artist_name", artistName);
    if (vipPassword) await setSetting("vip_password", vipPassword);
    if (artistsSectionTitle) await setSetting("artists_section_title", artistsSectionTitle);
    if (artistsSectionSubtitle) await setSetting("artists_section_subtitle", artistsSectionSubtitle);
    if (heroTitle) await setSetting("hero_title", heroTitle);
    if (heroSubtitle) await setSetting("hero_subtitle", heroSubtitle);
    if (heroCTA) await setSetting("hero_cta", heroCTA);

    if (req.file) {
      try {
        let photoUrl: string;

        if (r2Enabled) {
          const photoKey = generateR2Key("photos", req.file.originalname);
          photoUrl = await uploadToR2(req.file.buffer, photoKey, req.file.mimetype);
        } else {
          const dir = path.join(process.cwd(), "uploads/photos");
          fs.mkdirSync(dir, { recursive: true });
          const filename = `${Date.now()}_${req.file.originalname}`;
          fs.writeFileSync(path.join(dir, filename), req.file.buffer);
          photoUrl = `/api/uploads/photos/${filename}`;
        }
        await setSetting("artist_photo_url", photoUrl);
      } catch (error) {
        console.error("Error uploading photo:", error);
        res.status(500).json({
          error: "Erro no upload da foto",
          details: error instanceof Error ? error.message : "Unknown error"
        });
        return;
      }
    }

    const updatedName = (await getSetting("artist_name")) ?? "Alan Ribeiro";
    const updatedPhotoUrl = await getSetting("artist_photo_url");
    res.json({
      artistName: updatedName,
      artistPhotoUrl: updatedPhotoUrl || null,
    });
  }
);

export { getSetting };
export default router;
