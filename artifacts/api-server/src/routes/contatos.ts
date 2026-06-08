import { Router, type IRouter } from "express";
import { db, contatosTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/contatos", async (req, res): Promise<void> => {
  if (!req.session.artistId) { res.status(401).json({ error: "Não autorizado" }); return; }
  const rows = await db.select().from(contatosTable).where(eq(contatosTable.artistaId, req.session.artistId)).orderBy(desc(contatosTable.createdAt));
  res.json(rows);
});

router.post("/contatos", async (req, res): Promise<void> => {
  if (!req.session.artistId) { res.status(401).json({ error: "Não autorizado" }); return; }
  const { nome, categoria, telefone, email, anotacoes } = req.body;
  if (!nome) { res.status(400).json({ error: "Nome é obrigatório" }); return; }
  const [row] = await db.insert(contatosTable).values({ artistaId: req.session.artistId, nome, categoria: categoria || "Outro", telefone, email, anotacoes }).returning();
  res.status(201).json(row);
});

router.put("/contatos/:id", async (req, res): Promise<void> => {
  if (!req.session.artistId) { res.status(401).json({ error: "Não autorizado" }); return; }
  const { nome, categoria, telefone, email, anotacoes } = req.body;
  const [row] = await db.update(contatosTable).set({ nome, categoria, telefone, email, anotacoes, updatedAt: new Date() }).where(eq(contatosTable.id, parseInt(req.params.id))).returning();
  if (!row) { res.status(404).json({ error: "Contato não encontrado" }); return; }
  res.json(row);
});

router.delete("/contatos/:id", async (req, res): Promise<void> => {
  if (!req.session.artistId) { res.status(401).json({ error: "Não autorizado" }); return; }
  await db.delete(contatosTable).where(eq(contatosTable.id, parseInt(req.params.id)));
  res.sendStatus(204);
});

export default router;
