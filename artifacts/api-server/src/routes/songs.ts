import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { db, songsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ListSongsResponse, DeleteSongParams } from "@workspace/api-zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const uploadsDir = path.resolve(__dirname, "..", "..", "uploads");
const coversDir = path.join(uploadsDir, "covers");
const audioDir = path.join(uploadsDir, "audio");

fs.mkdirSync(coversDir, { recursive: true });
fs.mkdirSync(audioDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "capa") {
      cb(null, coversDir);
    } else {
      cb(null, audioDir);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${file.fieldname}${ext}`);
  },
});

const upload = multer({ storage });

const router: IRouter = Router();

router.get("/songs", async (req, res): Promise<void> => {
  const { genre } = req.query;

  let rows = await db.select().from(songsTable).orderBy(songsTable.createdAt);

  if (genre && genre !== "todos") {
    rows = rows.filter((s) => s.genero === genre);
  }

  const songs = rows.map((s) => ({
    id: s.id,
    titulo: s.titulo,
    descricao: s.descricao,
    genero: s.genero,
    capaUrl: s.capaPath ? `/api/uploads/${s.capaPath}` : null,
    mp3Url: s.mp3Path ? `/api/uploads/${s.mp3Path}` : null,
    createdAt: s.createdAt.toISOString(),
  }));

  res.json(ListSongsResponse.parse(songs));
});

router.post(
  "/songs",
  upload.fields([
    { name: "capa", maxCount: 1 },
    { name: "mp3", maxCount: 1 },
  ]),
  async (req, res): Promise<void> => {
    if (!req.session.logado) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }

    const { titulo, descricao, genero } = req.body;

    if (!titulo || !descricao || !genero) {
      res.status(400).json({ error: "Campos obrigatórios faltando" });
      return;
    }

    const files = req.files as Record<string, Express.Multer.File[]>;
    const capaFile = files?.["capa"]?.[0];
    const mp3File = files?.["mp3"]?.[0];

    if (!capaFile || !mp3File) {
      if (capaFile) fs.unlink(capaFile.path, () => {});
      if (mp3File) fs.unlink(mp3File.path, () => {});
      res.status(400).json({ error: "Capa e arquivo MP3 são obrigatórios" });
      return;
    }

    const capaPath = `covers/${capaFile.filename}`;
    const mp3Path = `audio/${mp3File.filename}`;

    const [song] = await db
      .insert(songsTable)
      .values({ titulo, descricao, genero, capaPath, mp3Path })
      .returning();

    res.status(201).json({
      id: song.id,
      titulo: song.titulo,
      descricao: song.descricao,
      genero: song.genero,
      capaUrl: song.capaPath ? `/api/uploads/${song.capaPath}` : null,
      mp3Url: song.mp3Path ? `/api/uploads/${song.mp3Path}` : null,
      createdAt: song.createdAt.toISOString(),
    });
  }
);

router.delete("/songs/:id", async (req, res): Promise<void> => {
  if (!req.session.logado) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  const params = DeleteSongParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [deleted] = await db
    .delete(songsTable)
    .where(eq(songsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Música não encontrada" });
    return;
  }

  if (deleted.capaPath) {
    const fullPath = path.join(uploadsDir, deleted.capaPath);
    fs.unlink(fullPath, () => {});
  }
  if (deleted.mp3Path) {
    const fullPath = path.join(uploadsDir, deleted.mp3Path);
    fs.unlink(fullPath, () => {});
  }

  res.sendStatus(204);
});

export default router;
