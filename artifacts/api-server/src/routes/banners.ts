import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import { db, ctaBannersTable } from "@workspace/db";
import { eq, asc, and } from "drizzle-orm";
import { uploadToR2, generateR2Key, r2Enabled } from "../lib/r2-storage.js";
import path from "path";
import fs from "fs";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

async function saveBannerImage(buffer: Buffer, originalName: string): Promise<string> {
  const jpgBuffer = await sharp(buffer).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  if (r2Enabled) {
    const key = generateR2Key("banners", originalName.replace(/\.\w+$/, ".jpg"));
    return uploadToR2(jpgBuffer, key, "image/jpeg");
  }
  const dir = path.join(process.cwd(), "uploads/banners");
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${Date.now()}_${originalName.replace(/\.\w+$/, ".jpg")}`;
  fs.writeFileSync(path.join(dir, filename), jpgBuffer);
  return `/api/uploads/banners/${filename}`;
}

// Get all active banners (public)
router.get("/banners", async (_req, res): Promise<void> => {
  try {
    const banners = await db
      .select()
      .from(ctaBannersTable)
      .where(eq(ctaBannersTable.ativo, true))
      .orderBy(asc(ctaBannersTable.ordem));
    res.json(banners);
  } catch (error) {
    console.error("Error getting banners:", error);
    res.status(500).json({ error: "Erro ao obter banners" });
  }
});

// Get all banners (admin)
router.get("/admin/banners", async (req, res): Promise<void> => {
  try {
    if (!req.session.logado) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }
    const banners = await db
      .select()
      .from(ctaBannersTable)
      .orderBy(asc(ctaBannersTable.ordem));
    res.json(banners);
  } catch (error) {
    console.error("Error getting banners:", error);
    res.status(500).json({ error: "Erro ao obter banners" });
  }
});

// Create banner (admin)
router.post("/admin/banners", upload.single("imagemFile"), async (req, res): Promise<void> => {
  try {
    if (!req.session.logado) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }
    const { texto, corFundo, corTexto, botaoTexto, botaoLink } = req.body;

    let imagemFundoUrl = req.body.imagemFundoUrl || null;
    if (req.file) {
      imagemFundoUrl = await saveBannerImage(req.file.buffer, req.file.originalname);
    }

    const ordem = parseInt(String(req.body.ordem)) || 0;
    const intervaloSegundos = parseInt(String(req.body.intervaloSegundos)) || 4;
    const ativo = String(req.body.ativo) !== "false";

    const [banner] = await db.insert(ctaBannersTable).values({
      texto,
      corFundo: corFundo || "#1a1a2e",
      corTexto: corTexto || "#ffffff",
      botaoTexto,
      botaoLink,
      imagemFundoUrl,
      ordem,
      ativo,
      intervaloSegundos,
    }).returning();

    res.status(201).json(banner);
  } catch (error) {
    console.error("Error creating banner:", error);
    res.status(500).json({ error: "Erro ao criar banner" });
  }
});

// Update banner (admin)
router.put("/admin/banners/:id", upload.single("imagemFile"), async (req, res): Promise<void> => {
  try {
    if (!req.session.logado) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }
    const { id } = req.params;
    const { texto, corFundo, corTexto, botaoTexto, botaoLink } = req.body;

    let imagemFundoUrl = req.body.imagemFundoUrl || undefined;
    if (req.file) {
      imagemFundoUrl = await saveBannerImage(req.file.buffer, req.file.originalname);
    }

    const ordem = parseInt(String(req.body.ordem)) || 0;
    const intervaloSegundos = parseInt(String(req.body.intervaloSegundos)) || 4;
    const ativo = String(req.body.ativo) !== "false";

    const updateData: Record<string, any> = {
      texto,
      corFundo,
      corTexto,
      botaoTexto,
      botaoLink,
      ordem,
      ativo,
      intervaloSegundos,
      updatedAt: new Date(),
    };
    if (imagemFundoUrl !== undefined) {
      updateData.imagemFundoUrl = imagemFundoUrl;
    }

    const [banner] = await db
      .update(ctaBannersTable)
      .set(updateData)
      .where(eq(ctaBannersTable.id, parseInt(String(id))))
      .returning();

    if (!banner) {
      res.status(404).json({ error: "Banner não encontrado" });
      return;
    }

    res.json(banner);
  } catch (error) {
    console.error("Error updating banner:", error);
    res.status(500).json({ error: "Erro ao atualizar banner" });
  }
});

// Delete banner (admin)
router.delete("/admin/banners/:id", async (req, res): Promise<void> => {
  try {
    if (!req.session.logado) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }
    const { id } = req.params;

    const [banner] = await db
      .delete(ctaBannersTable)
      .where(eq(ctaBannersTable.id, parseInt(String(id))))
      .returning();

    if (!banner) {
      res.status(404).json({ error: "Banner não encontrado" });
      return;
    }

    res.json({ message: "Banner deletado com sucesso" });
  } catch (error) {
    console.error("Error deleting banner:", error);
    res.status(500).json({ error: "Erro ao deletar banner" });
  }
});

export default router;
