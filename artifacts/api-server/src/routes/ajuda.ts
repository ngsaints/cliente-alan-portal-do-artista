import { Router, type IRouter } from "express";
import { db, ajudaTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.post("/ajuda", async (req, res): Promise<void> => {
  if (!req.session.artistId) { res.status(401).json({ error: "Não autorizado" }); return; }
  const { tipo, mensagem } = req.body;
  if (!tipo || !mensagem) { res.status(400).json({ error: "Tipo e mensagem são obrigatórios" }); return; }
  const [row] = await db.insert(ajudaTable).values({ artistaId: req.session.artistId, tipo, mensagem }).returning();
  res.status(201).json(row);
});

router.get("/ajuda", async (req, res): Promise<void> => {
  if (!req.session.artistId) { res.status(401).json({ error: "Não autorizado" }); return; }
  const rows = await db.select().from(ajudaTable).where(eq(ajudaTable.artistaId, req.session.artistId)).orderBy(desc(ajudaTable.createdAt));
  res.json(rows);
});

export default router;
