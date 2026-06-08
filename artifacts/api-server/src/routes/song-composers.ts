import { Router, type IRouter } from "express";
import { db, songComposersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/songs/:songId/composers", async (req, res): Promise<void> => {
  const { songId } = req.params;
  const rows = await db.select().from(songComposersTable).where(eq(songComposersTable.songId, parseInt(songId)));
  res.json(rows);
});

router.post("/songs/:songId/composers", async (req, res): Promise<void> => {
  if (!req.session.artistId && !req.session.logado) { res.status(401).json({ error: "Não autorizado" }); return; }
  const { nome, percentual } = req.body;
  if (!nome) { res.status(400).json({ error: "Nome é obrigatório" }); return; }
  const [row] = await db.insert(songComposersTable).values({ songId: parseInt(req.params.songId), nome, percentual: String(percentual || 0) }).returning();
  res.status(201).json(row);
});

router.put("/songs/:songId/composers/:id", async (req, res): Promise<void> => {
  if (!req.session.artistId && !req.session.logado) { res.status(401).json({ error: "Não autorizado" }); return; }
  const { nome, percentual } = req.body;
  const [row] = await db.update(songComposersTable).set({ nome, percentual: String(percentual || 0), updatedAt: new Date() }).where(eq(songComposersTable.id, parseInt(req.params.id))).returning();
  res.json(row);
});

router.delete("/songs/:songId/composers/:id", async (req, res): Promise<void> => {
  if (!req.session.artistId && !req.session.logado) { res.status(401).json({ error: "Não autorizado" }); return; }
  await db.delete(songComposersTable).where(eq(songComposersTable.id, parseInt(req.params.id)));
  res.sendStatus(204);
});

export default router;
