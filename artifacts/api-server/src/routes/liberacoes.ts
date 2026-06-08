import { Router, type IRouter } from "express";
import { db, liberacoesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/liberacoes", async (req, res): Promise<void> => {
  if (!req.session.artistId) { res.status(401).json({ error: "Não autorizado" }); return; }
  const rows = await db.select().from(liberacoesTable).where(eq(liberacoesTable.artistaId, req.session.artistId)).orderBy(desc(liberacoesTable.createdAt));
  res.json(rows);
});

router.post("/liberacoes", async (req, res): Promise<void> => {
  if (!req.session.artistId) { res.status(401).json({ error: "Não autorizado" }); return; }
  const { songId, artistaNome, dataInicio, dataLiberacao } = req.body;
  if (!songId || !artistaNome) { res.status(400).json({ error: "Música e nome do artista são obrigatórios" }); return; }
  const [row] = await db.insert(liberacoesTable).values({ artistaId: req.session.artistId, songId: parseInt(songId), artistaNome, dataInicio: dataInicio || new Date().toISOString().split("T")[0], dataLiberacao }).returning();
  res.status(201).json(row);
});

router.put("/liberacoes/:id", async (req, res): Promise<void> => {
  if (!req.session.artistId) { res.status(401).json({ error: "Não autorizado" }); return; }
  const { dataLiberacao } = req.body;
  const [row] = await db.update(liberacoesTable).set({ dataLiberacao, updatedAt: new Date() }).where(eq(liberacoesTable.id, parseInt(req.params.id))).returning();
  if (!row) { res.status(404).json({ error: "Liberação não encontrada" }); return; }
  res.json(row);
});

router.delete("/liberacoes/:id", async (req, res): Promise<void> => {
  if (!req.session.artistId) { res.status(401).json({ error: "Não autorizado" }); return; }
  await db.delete(liberacoesTable).where(eq(liberacoesTable.id, parseInt(req.params.id)));
  res.sendStatus(204);
});

export default router;
