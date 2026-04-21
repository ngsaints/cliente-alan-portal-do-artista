import { Router, type IRouter } from "express";
import multer from "multer";
import { db, songsTable, artistsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { uploadToR2, deleteFromR2, generateR2Key, r2Enabled } from "../lib/r2-storage.js";
import sharp from "sharp";
import path from "path";
import fs from "fs";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const router: IRouter = Router();

declare module "express-session" {
  interface SessionData {
    artistId?: number;
    artistEmail?: string;
    artistName?: string;
  }
}

const useR2 = !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);

// Get songs for a specific artist
router.get("/artist/:artistId/songs", async (req, res): Promise<void> => {
  try {
    const { artistId } = req.params;
    const { genre, vip } = req.query;

    // For now, all songs are visible. In future, filter by artist
    let rows = await db.select().from(songsTable).orderBy(songsTable.createdAt);

    if (vip === "true") {
      rows = rows.filter((s) => s.isVip === true);
    } else if (vip === "false") {
      rows = rows.filter((s) => s.isVip === false);
    }

    if (genre && genre !== "todos") {
      rows = rows.filter((s) => s.genero === genre);
    }

    res.json(rows.map(s => ({
      id: s.id,
      titulo: s.titulo,
      descricao: s.descricao,
      genero: s.genero,
      subgenero: s.subgenero,
      compositor: s.compositor,
      status: s.status,
      precoX: s.precoX,
      precoY: s.precoY,
      isVip: s.isVip,
      capaUrl: s.capaPath || null,
      mp3Url: s.mp3Path || null,
      createdAt: s.createdAt,
    })));
  } catch (error) {
    console.error("Error getting artist songs:", error);
    res.status(500).json({ error: "Erro ao obter músicas do artista" });
  }
});

// Add new song for artist (with R2 upload)
router.post(
  "/artist/:artistId/songs",
  upload.fields([
    { name: "capa", maxCount: 1 },
    { name: "mp3", maxCount: 1 },
  ]),
  async (req, res): Promise<void> => {
    try {
      const sessionArtistId = req.session.artistId;
      if (!sessionArtistId) {
        res.status(401).json({ error: "Não autorizado" });
        return;
      }

      const { artistId } = req.params;
      if (sessionArtistId !== parseInt(artistId)) {
        res.status(403).json({ error: "Você só pode adicionar músicas no seu próprio perfil" });
        return;
      }

      const { titulo, descricao, genero, subgenero, compositor, status, precoX, precoY, isVip } = req.body;

      if (!titulo || !descricao || !genero) {
        res.status(400).json({ error: "Campos obrigatórios faltando" });
        return;
      }

      // Check artist exists and has capacity
      const artists = await db.select().from(artistsTable).where(eq(artistsTable.id, parseInt(artistId)));
      if (artists.length === 0) {
        res.status(404).json({ error: "Artista não encontrado" });
        return;
      }

      const artist = artists[0];
      if (parseInt(artist.musicaCount) >= parseInt(artist.limiteMusicas)) {
        res.status(403).json({ 
          error: "Limite de músicas atingido para este plano",
          limite: artist.limiteMusicas,
          atual: artist.musicaCount,
        });
        return;
      }

      const files = req.files as Record<string, Express.Multer.File[]>;
      const capaFile = files?.["capa"]?.[0];
      const mp3File = files?.["mp3"]?.[0];

      if (!capaFile || !mp3File) {
        res.status(400).json({ error: "Capa e arquivo MP3 são obrigatórios" });
        return;
      }

      let capaPath: string;
      let mp3Path: string;

      if (r2Enabled) {
        const capaKey = generateR2Key("covers", capaFile.originalname.replace(/\.\w+$/, ".jpg"));
        const mp3Key = generateR2Key("audio", mp3File.originalname);
        const capaJpg = await sharp(capaFile.buffer).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
        capaPath = await uploadToR2(capaJpg, capaKey, "image/jpeg");
        mp3Path = await uploadToR2(mp3File.buffer, mp3Key, mp3File.mimetype);
      } else {
        const coversDir = path.join(process.cwd(), "uploads/covers");
        const audioDir = path.join(process.cwd(), "uploads/audio");
        fs.mkdirSync(coversDir, { recursive: true });
        fs.mkdirSync(audioDir, { recursive: true });
        const capaJpg = await sharp(capaFile.buffer).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
        const capaName = `${Date.now()}_${capaFile.originalname.replace(/\.\w+$/, ".jpg")}`;
        const mp3Name = `${Date.now()}_${mp3File.originalname}`;
        fs.writeFileSync(path.join(coversDir, capaName), capaJpg);
        fs.writeFileSync(path.join(audioDir, mp3Name), mp3File.buffer);
        capaPath = `/api/uploads/covers/${capaName}`;
        mp3Path = `/api/uploads/audio/${mp3Name}`;
      }

      const vipFlag = isVip === "true" || isVip === "1";

      const [song] = await db
        .insert(songsTable)
        .values({
          artistaId: artistId,
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
          isVip: vipFlag,
        })
        .returning();

      // Update artist music count
      await db
        .update(artistsTable)
        .set({
          musicaCount: (parseInt(artist.musicaCount) + 1).toString(),
        })
        .where(eq(artistsTable.id, parseInt(artistId)));

      res.status(201).json({
        id: song.id,
        titulo: song.titulo,
        descricao: song.descricao,
        genero: song.genero,
        subgenero: song.subgenero,
        compositor: song.compositor,
        status: song.status,
        precoX: song.precoX,
        precoY: song.precoY,
        isVip: song.isVip,
        capaUrl: song.capaPath || null,
        mp3Url: song.mp3Path || null,
        createdAt: song.createdAt,
      });
    } catch (error) {
      console.error("Error adding song:", error);
      res.status(500).json({ 
        error: "Erro ao adicionar música",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);

// Delete song
router.delete("/artist/:artistId/songs/:songId", async (req, res): Promise<void> => {
  try {
    const { songId } = req.params;

    const [deleted] = await db
      .delete(songsTable)
      .where(eq(songsTable.id, parseInt(songId)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Música não encontrada" });
      return;
    }

    // Delete files from R2 or local
    if (r2Enabled) {
      if (deleted.capaPath && deleted.capaPath.startsWith("http")) {
        const key = deleted.capaPath.split("/").slice(-2).join("/");
        deleteFromR2(key).catch(err => console.error("Error deleting cover:", err));
      }
      if (deleted.mp3Path && deleted.mp3Path.startsWith("http")) {
        const key = deleted.mp3Path.split("/").slice(-2).join("/");
        deleteFromR2(key).catch(err => console.error("Error deleting audio:", err));
      }
    } else {
      if (deleted.capaPath) {
        const localPath = path.join(process.cwd(), deleted.capaPath.replace("/api/", ""));
        fs.unlink(localPath, (err) => { if (err) console.error("Error deleting cover:", err); });
      }
      if (deleted.mp3Path) {
        const localPath = path.join(process.cwd(), deleted.mp3Path.replace("/api/", ""));
        fs.unlink(localPath, (err) => { if (err) console.error("Error deleting audio:", err); });
      }
    }

    // Update artist music count (find artist and decrement)
    // Note: This is simplified. In production, link songs to artists explicitly
    res.json({ message: "Música excluída com sucesso" });
  } catch (error) {
    console.error("Error deleting song:", error);
    res.status(500).json({ error: "Erro ao excluir música" });
  }
});

export default router;
