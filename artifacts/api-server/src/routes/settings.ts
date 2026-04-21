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
  res.json({
    artistName,
    artistPhotoUrl: artistPhotoUrl || null,
    artistsSectionTitle: artistsSectionTitle || "Nossos Artistas",
    artistsSectionSubtitle: artistsSectionSubtitle || "Descubra e acompanhe artistas independentes de todo o Brasil",
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

    const { artistName, vipPassword, artistsSectionTitle, artistsSectionSubtitle } = req.body;

    if (artistName) await setSetting("artist_name", artistName);
    if (vipPassword) await setSetting("vip_password", vipPassword);
    if (artistsSectionTitle) await setSetting("artists_section_title", artistsSectionTitle);
    if (artistsSectionSubtitle) await setSetting("artists_section_subtitle", artistsSectionSubtitle);

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
