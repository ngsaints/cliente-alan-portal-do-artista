import { Router, type IRouter } from "express";
import { db, artistsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { uploadToR2, generateR2Key, r2Enabled } from "../lib/r2-storage.js";
import sharp from "sharp";
import multer from "multer";
import path from "path";
import fs from "fs";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router: IRouter = Router();

// Check if R2 is enabled
const useR2 = !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);

// Update artist profile
router.put("/artists/:id/profile", upload.single("capa"), async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { 
      name, 
      profissao, 
      contato, 
      instagram, 
      email: artistEmail,
      tiktok, 
      spotify, 
      fonte, 
      cor, 
      layout, 
      player 
    } = req.body;

    // Get current artist
    const artists = await db.select().from(artistsTable).where(eq(artistsTable.id, parseInt(id)));
    if (artists.length === 0) {
      res.status(404).json({ error: "Artista não encontrado" });
      return;
    }

    const currentArtist = artists[0];
    let capaUrl = currentArtist.capaUrl;

    // Upload cover if provided
    if (req.file) {
      try {
        const jpgBuffer = await sharp(req.file.buffer).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
        const jpgName = req.file.originalname.replace(/\.\w+$/, ".jpg");
        if (r2Enabled) {
          const photoKey = generateR2Key("covers", jpgName);
          capaUrl = await uploadToR2(jpgBuffer, photoKey, "image/jpeg");
        } else {
          const dir = path.join(process.cwd(), "uploads/covers");
          fs.mkdirSync(dir, { recursive: true });
          const filename = `${Date.now()}_${jpgName}`;
          fs.writeFileSync(path.join(dir, filename), jpgBuffer);
          capaUrl = `/api/uploads/covers/${filename}`;
        }
      } catch (error) {
        console.error("Error uploading cover:", error);
        res.status(500).json({
          error: "Erro no upload da capa",
          details: error instanceof Error ? error.message : "Unknown error"
        });
        return;
      }
    }

    // Update artist
    const [updatedArtist] = await db
      .update(artistsTable)
      .set({
        name: name || currentArtist.name,
        profissao: profissao || currentArtist.profissao,
        contato: contato || currentArtist.contato,
        instagram: instagram || currentArtist.instagram,
        email: artistEmail || currentArtist.email,
        tiktok: tiktok || currentArtist.tiktok,
        spotify: spotify || currentArtist.spotify,
        capaUrl: capaUrl,
        fonte: fonte || currentArtist.fonte,
        cor: cor || currentArtist.cor,
        layout: layout || currentArtist.layout,
        player: player || currentArtist.player,
      })
      .where(eq(artistsTable.id, parseInt(id)))
      .returning();

    res.json({
      id: updatedArtist.id,
      name: updatedArtist.name,
      email: updatedArtist.email,
      profissao: updatedArtist.profissao,
      contato: updatedArtist.contato,
      instagram: updatedArtist.instagram,
      tiktok: updatedArtist.tiktok,
      spotify: updatedArtist.spotify,
      capaUrl: updatedArtist.capaUrl,
      fonte: updatedArtist.fonte,
      cor: updatedArtist.cor,
      layout: updatedArtist.layout,
      player: updatedArtist.player,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Erro ao atualizar perfil" });
  }
});

export default router;
