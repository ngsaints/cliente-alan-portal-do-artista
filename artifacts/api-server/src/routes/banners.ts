import { Router, type ISession } from "express";
import { db, ctaBannersTable } from "@workspace/db";
import { eq, asc, and } from "drizzle-orm";

const router = Router();

// Extend session type to include logado
declare module "express-session" {
  interface SessionData {
    logado?: boolean;
  }
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
router.post("/admin/banners", async (req, res): Promise<void> => {
  try {
    if (!req.session.logado) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }
    const { texto, corFundo, corTexto, botaoTexto, botaoLink, imagemFundoUrl, ordem, ativo, intervaloSegundos } = req.body;
    
    const [banner] = await db.insert(ctaBannersTable).values({
      texto,
      corFundo: corFundo || "#1a1a2e",
      corTexto: corTexto || "#ffffff",
      botaoTexto,
      botaoLink,
      imagemFundoUrl,
      ordem: ordem || 0,
      ativo: ativo !== false,
      intervaloSegundos: intervaloSegundos || 4,
    }).returning();
    
    res.status(201).json(banner);
  } catch (error) {
    console.error("Error creating banner:", error);
    res.status(500).json({ error: "Erro ao criar banner" });
  }
});

// Update banner (admin)
router.put("/admin/banners/:id", async (req, res): Promise<void> => {
  try {
    if (!req.session.logado) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }
    const { id } = req.params;
    const { texto, corFundo, corTexto, botaoTexto, botaoLink, imagemFundoUrl, ordem, ativo, intervaloSegundos } = req.body;
    
    const [banner] = await db
      .update(ctaBannersTable)
      .set({
        texto,
        corFundo,
        corTexto,
        botaoTexto,
        botaoLink,
        imagemFundoUrl,
        ordem,
        ativo,
        intervaloSegundos,
        updatedAt: new Date(),
      })
      .where(eq(ctaBannersTable.id, parseInt(id)))
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
      .where(eq(ctaBannersTable.id, parseInt(id)))
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
