import { Router, type IRouter } from "express";
import { db, audicoesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/audicoes", async (req, res): Promise<void> => {
  if (!req.session.artistId) { res.status(401).json({ error: "Não autorizado" }); return; }
  const rows = await db.select().from(audicoesTable).where(eq(audicoesTable.artistaId, req.session.artistId)).orderBy(desc(audicoesTable.createdAt));
  res.json(rows);
});

router.post("/audicoes", async (req, res): Promise<void> => {
  if (!req.session.artistId) { res.status(401).json({ error: "Não autorizado" }); return; }
  const { songId, artistaNome, data, status } = req.body;
  if (!songId || !artistaNome) { res.status(400).json({ error: "Música e nome do artista são obrigatórios" }); return; }
  const [row] = await db.insert(audicoesTable).values({ artistaId: req.session.artistId, songId: parseInt(songId), artistaNome, data: data || new Date().toISOString().split("T")[0], status: status || "em_analise" }).returning();
  res.status(201).json(row);
});

router.put("/audicoes/:id", async (req, res): Promise<void> => {
  if (!req.session.artistId) { res.status(401).json({ error: "Não autorizado" }); return; }
  const { songId, artistaNome, data, status } = req.body;
  const [row] = await db
    .update(audicoesTable)
    .set({
      ...(songId !== undefined ? { songId: parseInt(songId) } : {}),
      ...(artistaNome !== undefined ? { artistaNome } : {}),
      ...(data !== undefined ? { data } : {}),
      ...(status !== undefined ? { status } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(audicoesTable.id, parseInt(req.params.id)), eq(audicoesTable.artistaId, req.session.artistId)))
    .returning();
  if (!row) { res.status(404).json({ error: "Audição não encontrada" }); return; }
  res.json(row);
});

router.delete("/audicoes/:id", async (req, res): Promise<void> => {
  if (!req.session.artistId) { res.status(401).json({ error: "Não autorizado" }); return; }
  await db.delete(audicoesTable).where(and(eq(audicoesTable.id, parseInt(req.params.id)), eq(audicoesTable.artistaId, req.session.artistId)));
  res.sendStatus(204);
});

export default router;
