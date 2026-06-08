import { Router, type IRouter } from "express";
import { db, receitasTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/receitas", async (req, res): Promise<void> => {
  if (!req.session.artistId) { res.status(401).json({ error: "Não autorizado" }); return; }
  const rows = await db.select().from(receitasTable).where(eq(receitasTable.artistaId, req.session.artistId)).orderBy(desc(receitasTable.createdAt));
  res.json(rows);
});

router.post("/receitas", async (req, res): Promise<void> => {
  if (!req.session.artistId) { res.status(401).json({ error: "Não autorizado" }); return; }
  const { categoria, descricao, valor, data } = req.body;
  if (!categoria || !descricao || !valor) { res.status(400).json({ error: "Categoria, descrição e valor são obrigatórios" }); return; }
  const positivo = String(Math.abs(parseFloat(String(valor))));
  const [row] = await db.insert(receitasTable).values({ artistaId: req.session.artistId, categoria, descricao, valor: positivo, data: data || new Date().toISOString().split("T")[0] }).returning();
  res.status(201).json(row);
});

router.delete("/receitas/:id", async (req, res): Promise<void> => {
  if (!req.session.artistId) { res.status(401).json({ error: "Não autorizado" }); return; }
  await db.delete(receitasTable).where(eq(receitasTable.id, parseInt(req.params.id)));
  res.sendStatus(204);
});

export default router;
