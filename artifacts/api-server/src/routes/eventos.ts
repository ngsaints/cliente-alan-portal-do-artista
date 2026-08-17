import { Router, type IRouter } from "express";
import { db, eventosTable } from "@workspace/db";
import { eq, desc, and, gte, lte } from "drizzle-orm";

const router: IRouter = Router();

router.get("/eventos", async (req, res): Promise<void> => {
  if (!req.session.artistId) { res.status(401).json({ error: "Não autorizado" }); return; }
  const { start, end } = req.query;
  let query = db.select().from(eventosTable).where(eq(eventosTable.artistaId, req.session.artistId));
  if (start && end) {
    query = db.select().from(eventosTable).where(and(eq(eventosTable.artistaId, req.session.artistId), gte(eventosTable.data, start as string), lte(eventosTable.data, end as string)));
  }
  const rows = await query.orderBy(eventosTable.data);
  res.json(rows);
});

router.post("/eventos", async (req, res): Promise<void> => {
  if (!req.session.artistId) { res.status(401).json({ error: "Não autorizado" }); return; }
  const { titulo, descricao, data, horarioInicial, horarioFinal } = req.body;
  if (!titulo || !data) { res.status(400).json({ error: "Título e data são obrigatórios" }); return; }
  const [row] = await db.insert(eventosTable).values({ artistaId: req.session.artistId, titulo, descricao, data, horarioInicial, horarioFinal }).returning();
  res.status(201).json(row);
});

router.put("/eventos/:id", async (req, res): Promise<void> => {
  if (!req.session.artistId) { res.status(401).json({ error: "Não autorizado" }); return; }
  const { titulo, descricao, data, horarioInicial, horarioFinal } = req.body;
  const [row] = await db.update(eventosTable).set({ titulo, descricao, data, horarioInicial, horarioFinal, updatedAt: new Date() }).where(and(eq(eventosTable.id, parseInt(req.params.id)), eq(eventosTable.artistaId, req.session.artistId))).returning();
  if (!row) { res.status(404).json({ error: "Evento não encontrado" }); return; }
  res.json(row);
});

router.delete("/eventos/:id", async (req, res): Promise<void> => {
  if (!req.session.artistId) { res.status(401).json({ error: "Não autorizado" }); return; }
  await db.delete(eventosTable).where(and(eq(eventosTable.id, parseInt(req.params.id)), eq(eventosTable.artistaId, req.session.artistId)));
  res.sendStatus(204);
});

export default router;
