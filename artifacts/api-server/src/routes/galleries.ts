import { Router, type IRouter } from "express";
import { db, galleriesTable, galleryPhotosTable, artistsTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import multer from "multer";
import path from "path";
import { existsSync, mkdirSync, readFileSync, unlinkSync } from "fs";
import { uploadToR2, generateR2Key, r2Enabled } from "../lib/r2-storage.js";

const uploadDir = "/var/www/portal-do-artista/uploads/gallery";
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "_" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const router: IRouter = Router();

// Helper to resolve artist numeric ID from ID or slug
async function resolveArtistId(param: string): Promise<string | null> {
  const num = parseInt(param);
  if (!isNaN(num)) {
    return param;
  }
  
  const artists = await db
    .select({ id: artistsTable.id })
    .from(artistsTable)
    .where(eq(artistsTable.slug, param))
    .limit(1);
    
  if (artists.length > 0) {
    return String(artists[0].id);
  }
  
  return null;
}

// GET /galleries/:artistId - Get gallery for artist
router.get("/galleries/:artistId", async (req, res): Promise<void> => {
  try {
    const { artistId: artistIdParam } = req.params;
    const artistId = await resolveArtistId(artistIdParam);
    
    if (!artistId) {
      res.json({ photos: [], total: 0, page: 1, totalPages: 0 });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 6;
    const page = parseInt(req.query.page as string) || 1;
    const offset = (page - 1) * limit;

    const galleries = await db
      .select()
      .from(galleriesTable)
      .where(eq(galleriesTable.artistaId, artistId))
      .limit(1);

    if (galleries.length === 0) {
      res.json({ photos: [], total: 0, page: 1, totalPages: 0 });
      return;
    }

    const gallery = galleries[0];

    const photos = await db
      .select()
      .from(galleryPhotosTable)
      .where(eq(galleryPhotosTable.galleryId, gallery.id))
      .orderBy(asc(galleryPhotosTable.ordem))
      .limit(limit)
      .offset(offset);

    const allPhotos = await db
      .select()
      .from(galleryPhotosTable)
      .where(eq(galleryPhotosTable.galleryId, gallery.id));

    const total = allPhotos.length;
    const totalPages = Math.ceil(total / limit);

    res.json({
      id: gallery.id,
      titulo: gallery.titulo,
      photos,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching gallery:", error);
    res.status(500).json({ error: "Erro ao buscar galeria" });
  }
});

// GET /galleries/:artistId/all - Get all photos (for full gallery page)
router.get("/galleries/:artistId/all", async (req, res): Promise<void> => {
  try {
    const { artistId: artistIdParam } = req.params;
    const artistId = await resolveArtistId(artistIdParam);

    if (!artistId) {
      res.json({ photos: [], titulo: "Galeria" });
      return;
    }

    const galleries = await db
      .select()
      .from(galleriesTable)
      .where(eq(galleriesTable.artistaId, artistId))
      .limit(1);

    if (galleries.length === 0) {
      res.json({ photos: [], titulo: "Galeria" });
      return;
    }

    const gallery = galleries[0];

    const photos = await db
      .select()
      .from(galleryPhotosTable)
      .where(eq(galleryPhotosTable.galleryId, gallery.id))
      .orderBy(asc(galleryPhotosTable.ordem));

    res.json({
      id: gallery.id,
      titulo: gallery.titulo,
      photos,
    });
  } catch (error) {
    console.error("Error fetching gallery:", error);
    res.status(500).json({ error: "Erro ao buscar galeria" });
  }
});

// GET /galleries/admin - Get all galleries (admin)
router.get("/galleries/admin", async (req, res): Promise<void> => {
  try {
    const galleries = await db
      .select()
      .from(galleriesTable)
      .orderBy(asc(galleriesTable.createdAt));

    const galleriesWithPhotos = await Promise.all(
      galleries.map(async (g) => {
        const photos = await db
          .select()
          .from(galleryPhotosTable)
          .where(eq(galleryPhotosTable.galleryId, g.id));
        return { ...g, photoCount: photos.length, photos: photos.slice(0, 4) };
      })
    );

    res.json(galleriesWithPhotos);
  } catch (error) {
    console.error("Error fetching galleries:", error);
    res.status(500).json({ error: "Erro ao buscar galerias" });
  }
});

// POST /galleries - Create gallery
router.post("/galleries", async (req, res): Promise<void> => {
  const isAuthenticated = req.session.artistId || req.session.logado;
  if (!isAuthenticated) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const { artistaId, titulo } = req.body;

    if (!artistaId) {
      res.status(400).json({ error: "artistaId é obrigatório" });
      return;
    }

    const [gallery] = await db
      .insert(galleriesTable)
      .values({
        artistaId,
        titulo: titulo || "Galeria",
      })
      .returning();

    res.status(201).json(gallery);
  } catch (error) {
    console.error("Error creating gallery:", error);
    res.status(500).json({ error: "Erro ao criar galeria" });
  }
});

// POST /galleries/:id/photos - Add photo to gallery
router.post("/galleries/:id/photos", async (req, res): Promise<void> => {
  const isAuthenticated = req.session.artistId || req.session.logado;
  if (!isAuthenticated) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const { id } = req.params;
    const { fotoUrl, legenda } = req.body;

    if (!fotoUrl) {
      res.status(400).json({ error: "fotoUrl é obrigatório" });
      return;
    }

    const [gallery] = await db
      .select()
      .from(galleriesTable)
      .where(eq(galleriesTable.id, parseInt(id)));

    if (!gallery) {
      res.status(404).json({ error: "Galeria não encontrada" });
      return;
    }

    const isAdmin = req.session.logado && !req.session.artistId;
    if (!isAdmin && gallery.artistaId !== String(req.session.artistId)) {
      res.status(403).json({ error: "Não autorizado" });
      return;
    }

    const [photo] = await db
      .insert(galleryPhotosTable)
      .values({
        galleryId: parseInt(id),
        fotoUrl,
        legenda: legenda || null,
      })
      .returning();

    res.status(201).json(photo);
  } catch (error) {
    console.error("Error adding photo:", error);
    res.status(500).json({ error: "Erro ao adicionar foto" });
  }
});

// POST /galleries/:id/photos/upload - Upload photo to gallery
router.post("/galleries/:id/photos/upload", upload.single("foto"), async (req, res): Promise<void> => {
  const isAuthenticated = req.session.artistId || req.session.logado;
  if (!isAuthenticated) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "Nenhum arquivo enviado" });
    return;
  }

  try {
    const { id } = req.params;
    const legenda = req.body.legenda || null;

    const [gallery] = await db
      .select()
      .from(galleriesTable)
      .where(eq(galleriesTable.id, parseInt(id as string)));

    if (!gallery) {
      res.status(404).json({ error: "Galeria não encontrada" });
      return;
    }

    const isAdmin = req.session.logado && !req.session.artistId;
    if (!isAdmin && gallery.artistaId !== String(req.session.artistId)) {
      res.status(403).json({ error: "Não autorizado" });
      return;
    }

    let fotoUrl: string;
    const localPath = req.file.path;

    if (r2Enabled) {
      try {
        const buffer = readFileSync(localPath);
        const ext = path.extname(req.file.originalname);
        const key = generateR2Key("gallery", req.file.filename + ext);
        fotoUrl = await uploadToR2(buffer, key, "image/jpeg");
        unlinkSync(localPath);
      } catch (e) {
        console.error("R2 upload failed, falling back to local:", e);
        fotoUrl = `/uploads/gallery/${req.file.filename}`;
      }
    } else {
      fotoUrl = `/uploads/gallery/${req.file.filename}`;
    }

    const [photo] = await db
      .insert(galleryPhotosTable)
      .values({
        galleryId: parseInt(id as string),
        fotoUrl,
        legenda,
      })
      .returning();

    res.status(201).json(photo);
  } catch (error) {
    console.error("Error uploading photo:", error);
    res.status(500).json({ error: "Erro ao fazer upload da foto" });
  }
});

// DELETE /galleries/:id/photos/:photoId - Remove photo
router.delete("/galleries/:id/photos/:photoId", async (req, res): Promise<void> => {
  const isAuthenticated = req.session.artistId || req.session.logado;
  if (!isAuthenticated) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const { id, photoId } = req.params;

    const [gallery] = await db
      .select()
      .from(galleriesTable)
      .where(eq(galleriesTable.id, parseInt(id)));

    if (!gallery) {
      res.status(404).json({ error: "Galeria não encontrada" });
      return;
    }

    const isAdmin = req.session.logado && !req.session.artistId;
    if (!isAdmin && gallery.artistaId !== String(req.session.artistId)) {
      res.status(403).json({ error: "Não autorizado" });
      return;
    }

    await db
      .delete(galleryPhotosTable)
      .where(eq(galleryPhotosTable.id, parseInt(photoId)));

    res.json({ message: "Foto removida" });
  } catch (error) {
    console.error("Error removing photo:", error);
    res.status(500).json({ error: "Erro ao remover foto" });
  }
});

// DELETE /galleries/:id - Delete gallery
router.delete("/galleries/:id", async (req, res): Promise<void> => {
  const isAuthenticated = req.session.artistId || req.session.logado;
  if (!isAuthenticated) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const { id } = req.params;

    const [gallery] = await db
      .select()
      .from(galleriesTable)
      .where(eq(galleriesTable.id, parseInt(id)));

    if (!gallery) {
      res.status(404).json({ error: "Galeria não encontrada" });
      return;
    }

    const isAdmin = req.session.logado && !req.session.artistId;
    if (!isAdmin && gallery.artistaId !== String(req.session.artistId)) {
      res.status(403).json({ error: "Não autorizado" });
      return;
    }

    await db.delete(galleriesTable).where(eq(galleriesTable.id, parseInt(id)));

    res.json({ message: "Galeria removida" });
  } catch (error) {
    console.error("Error deleting gallery:", error);
    res.status(500).json({ error: "Erro ao remover galeria" });
  }
});

export default router;
