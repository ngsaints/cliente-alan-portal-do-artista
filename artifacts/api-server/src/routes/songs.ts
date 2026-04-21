import { Router, type IRouter } from "express";
import multer from "multer";
import { db, songsTable, songLikesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { ListSongsResponse, DeleteSongParams } from "@workspace/api-zod";
import { uploadToR2, deleteFromR2, generateR2Key, r2Enabled } from "../lib/r2-storage.js";
import sharp from "sharp";
import path from "path";
import fs from "fs";

// Multer: always use memoryStorage so file.buffer is available for both R2 and local disk writes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

const router: IRouter = Router();

/** Salva buffer em disco (convertido para JPG) e retorna a URL local (/api/uploads/…) */
async function saveLocal(buffer: Buffer, folder: string, originalname: string): Promise<string> {
  const jpgBuffer = await sharp(buffer).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  const dir = path.join(process.cwd(), "uploads", folder);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}_${originalname.replace(/\.\w+$/, ".jpg")}`;
  fs.writeFileSync(path.join(dir, filename), jpgBuffer);
  return `/api/uploads/${folder}/${filename}`;
}

function mapSong(s: typeof songsTable.$inferSelect) {
  return {
    id: s.id,
    titulo: s.titulo,
    descricao: s.descricao,
    genero: s.genero,
    subgenero: s.subgenero ?? null,
    compositor: s.compositor ?? null,
    status: s.status,
    precoX: s.precoX ?? null,
    precoY: s.precoY ?? null,
    capaUrl: s.capaPath || null,
    mp3Url: s.mp3Path || null,
    youtubeUrl: s.youtubeUrl ?? null,
    tipoMidia: s.tipoMidia ?? "audio",
    isVip: s.isVip,
    vipCode: s.vipCode ?? null,
    artistaId: s.artistaId ?? null,
    likes: s.likes ?? "0",
    plays: s.plays ?? "0",
    createdAt: s.createdAt,
  };
}

router.get("/songs", async (req, res): Promise<void> => {
  const { genre, vip } = req.query;

  let rows = await db.select().from(songsTable).orderBy(songsTable.createdAt);

  if (vip === "true") {
    rows = rows.filter((s) => s.isVip === true);
  } else if (vip === "false") {
    rows = rows.filter((s) => s.isVip === false);
  }

  if (genre && genre !== "todos") {
    rows = rows.filter((s) => s.genero === genre);
  }

  res.json(ListSongsResponse.parse(rows.map(mapSong)));
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

    const { 
      titulo, descricao, genero, subgenero, compositor, status, 
      precoX, precoY, isVip, youtubeUrl, tipoMidia, vipCode 
    } = req.body;

    if (!titulo || !descricao || !genero) {
      res.status(400).json({ error: "Campos obrigatórios faltando" });
      return;
    }

    const tipo = tipoMidia || "audio";
    const files = req.files as Record<string, Express.Multer.File[]>;
    const capaFile = files?.["capa"]?.[0];
    const mp3File = files?.["mp3"]?.[0];

    // Validação: áudio precisa de MP3, vídeo precisa de YouTube
    if (tipo === "audio" && !mp3File) {
      res.status(400).json({ error: "Para áudio, arquivo MP3 é obrigatório" });
      return;
    }
    if (tipo === "video" && !youtubeUrl) {
      res.status(400).json({ error: "Para vídeo, link do YouTube é obrigatório" });
      return;
    }

    let capaPath: string | null = null;
    let mp3Path: string | null = null;

    // Upload da capa (opcional para vídeo com YouTube)
    if (capaFile) {
      try {
        if (r2Enabled) {
          const capaKey = generateR2Key("covers", capaFile.originalname);
          capaPath = await uploadToR2(capaFile.buffer, capaKey, capaFile.mimetype);
        } else {
          capaPath = await saveLocal(capaFile.buffer, "covers", capaFile.originalname);
        }
      } catch (error) {
        console.error("Error uploading cover:", error);
        res.status(500).json({ error: "Erro no upload da capa" });
        return;
      }
    }

    // Upload do MP3 (apenas para tipo áudio)
    if (tipo === "audio" && mp3File) {
      try {
        if (r2Enabled) {
          const mp3Key = generateR2Key("audio", mp3File.originalname);
          mp3Path = await uploadToR2(mp3File.buffer, mp3Key, mp3File.mimetype);
        } else {
          mp3Path = saveLocal(mp3File.buffer, "audio", mp3File.originalname);
        }
      } catch (error) {
        console.error("Error uploading audio:", error);
        res.status(500).json({ error: "Erro no upload do áudio" });
        return;
      }
    }

    try {
      const vipFlag = isVip === "true" || isVip === "1";

      const [song] = await db
        .insert(songsTable)
        .values({
          titulo,
          descricao,
          genero,
          subgenero: subgenero || null,
          compositor: compositor || null,
          status: status || "Disponível",
          precoX: precoX || null,
          precoY: precoY || null,
          capaPath,
          mp3Path,
          youtubeUrl: youtubeUrl || null,
          tipoMidia: tipo,
          isVip: vipFlag,
          vipCode: vipFlag ? (vipCode || null) : null,
        })
        .returning();

      res.status(201).json(mapSong(song));
    } catch (error) {
      console.error("Error creating song:", error);
      res.status(500).json({ 
        error: "Erro ao salvar música",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);

// PUT /songs/:id - Update song (accepts multipart/form-data with optional capa)
router.put(
  "/songs/:id",
  upload.single("capa"),
  async (req, res): Promise<void> => {
    if (!req.session.logado) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }

    const { id } = req.params;
    const { titulo, descricao, genero, subgenero, compositor, status,
            tipoMidia, youtubeUrl, isVip, vipCode } = req.body;

    try {
      // Se uma nova capa foi enviada, faz o upload
      let capaPath: string | undefined = undefined;
      if (req.file) {
        try {
          if (r2Enabled) {
            const key = generateR2Key("covers", req.file.originalname);
            capaPath = await uploadToR2(req.file.buffer, key, req.file.mimetype);
          } else {
            capaPath = await saveLocal(req.file.buffer, "covers", req.file.originalname);
          }
        } catch (err) {
          console.error("Error uploading cover:", err);
          res.status(500).json({ error: "Erro no upload da capa" });
          return;
        }
      }

      const vipFlag = isVip === "true" || isVip === true;

      const [updated] = await db
        .update(songsTable)
        .set({
          ...(titulo      ? { titulo }                                : {}),
          ...(descricao   ? { descricao }                            : {}),
          ...(genero      ? { genero }                               : {}),
          subgenero:    subgenero  !== undefined ? (subgenero  || null) : undefined,
          compositor:   compositor !== undefined ? (compositor || null) : undefined,
          ...(status      ? { status }                               : {}),
          ...(tipoMidia   ? { tipoMidia }                            : {}),
          youtubeUrl:   youtubeUrl !== undefined ? (youtubeUrl || null) : undefined,
          isVip:        isVip      !== undefined ? vipFlag           : undefined,
          vipCode:      vipCode    !== undefined ? (vipCode    || null) : undefined,
          ...(capaPath    ? { capaPath }                             : {}),
        })
        .where(eq(songsTable.id, parseInt(id)))
        .returning();

      if (!updated) {
        res.status(404).json({ error: "Música não encontrada" });
        return;
      }

      res.json(mapSong(updated));
    } catch (error) {
      console.error("Error updating song:", error);
      res.status(500).json({ error: "Erro ao atualizar música" });
    }
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

  // Delete files from R2 if using R2 storage
  if (r2Enabled) {
    if (deleted.capaPath && deleted.capaPath.startsWith("http")) {
      // Extract key from URL
      const key = deleted.capaPath.split("/").slice(-2).join("/");
      deleteFromR2(key).catch(err => console.error("Error deleting cover:", err));
    }
    if (deleted.mp3Path && deleted.mp3Path.startsWith("http")) {
      const key = deleted.mp3Path.split("/").slice(-2).join("/");
      deleteFromR2(key).catch(err => console.error("Error deleting audio:", err));
    }
  } else {
    // Delete local files
    if (deleted.capaPath) {
      const localPath = path.join(process.cwd(), deleted.capaPath.replace("/api/", ""));
      fs.unlink(localPath, (err) => { if (err) console.error("Error deleting cover:", err); });
    }
    if (deleted.mp3Path) {
      const localPath = path.join(process.cwd(), deleted.mp3Path.replace("/api/", ""));
      fs.unlink(localPath, (err) => { if (err) console.error("Error deleting audio:", err); });
    }
  }

  res.sendStatus(204);
});

// POST /songs/:id/like - Like a song (1 per IP per song)
router.post("/songs/:id/like", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const ip = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "unknown").split(",")[0].trim();

    const existing = await db
      .select()
      .from(songLikesTable)
      .where(eq(songLikesTable.songId, id))
      .where(eq(songLikesTable.ipAddress, ip))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Você já curtiu esta música", likes: "0" });
      return;
    }

    try {
      await db.insert(songLikesTable).values({ songId: id, ipAddress: ip });
    } catch {
      res.status(409).json({ error: "Você já curtiu esta música", likes: "0" });
      return;
    }

    const [updated] = await db
      .update(songsTable)
      .set({
        likes: sql`${songsTable.likes} + 1`,
      })
      .where(eq(songsTable.id, parseInt(id)))
      .returning();

    res.json({ likes: updated.likes });
  } catch (error) {
    console.error("Error liking song:", error);
    res.status(500).json({ error: "Erro ao curtir música" });
  }
});

// POST /songs/:id/play - Register a play
router.post("/songs/:id/play", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    
    const [updated] = await db
      .update(songsTable)
      .set({
        plays: sql`${songsTable.plays} + 1`,
      })
      .where(eq(songsTable.id, parseInt(id)))
      .returning();

    res.json({ plays: updated.plays });
  } catch (error) {
    console.error("Error registering play:", error);
    res.status(500).json({ error: "Erro ao registrar reprodução" });
  }
});

export default router;
