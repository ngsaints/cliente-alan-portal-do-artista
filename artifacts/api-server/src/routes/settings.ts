import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, "..", "..", "uploads");
const photosDir = path.join(uploadsDir, "photos");
fs.mkdirSync(photosDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, photosDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `artist_photo${ext}`);
  },
});
const upload = multer({ storage });

const router: IRouter = Router();

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
  const artistPhotoPath = await getSetting("artist_photo_path");
  res.json({
    artistName,
    artistPhotoUrl: artistPhotoPath ? `/api/uploads/${artistPhotoPath}` : null,
  });
});

router.put(
  "/settings",
  upload.single("photo"),
  async (req, res): Promise<void> => {
    if (!req.session.logado) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }

    const { artistName, vipPassword } = req.body;

    if (artistName) await setSetting("artist_name", artistName);
    if (vipPassword) await setSetting("vip_password", vipPassword);

    if (req.file) {
      const photoPath = `photos/${req.file.filename}`;
      await setSetting("artist_photo_path", photoPath);
    }

    const updatedName = (await getSetting("artist_name")) ?? "Alan Ribeiro";
    const updatedPhotoPath = await getSetting("artist_photo_path");
    res.json({
      artistName: updatedName,
      artistPhotoUrl: updatedPhotoPath ? `/api/uploads/${updatedPhotoPath}` : null,
    });
  }
);

export { getSetting };
export default router;
