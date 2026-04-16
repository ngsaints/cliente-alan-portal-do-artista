import { Router, type IRouter } from "express";
import { db, genresTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

// ─── GET /genres — público, retorna gêneros ativos ───────────────────────────

router.get("/genres", async (_req, res): Promise<void> => {
  try {
    const genres = await db
      .select()
      .from(genresTable)
      .where(eq(genresTable.ativo, true))
      .orderBy(asc(genresTable.ordem), asc(genresTable.nome));
    res.json(genres);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar gêneros" });
  }
});

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

// GET /admin/genres — todos (incluindo inativos)
router.get("/admin/genres", async (req, res): Promise<void> => {
  if (!req.session.logado) { res.status(401).json({ error: "Não autorizado" }); return; }
  try {
    const genres = await db
      .select()
      .from(genresTable)
      .orderBy(asc(genresTable.ordem), asc(genresTable.nome));
    res.json(genres);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar gêneros" });
  }
});

// POST /admin/genres — criar
router.post("/admin/genres", async (req, res): Promise<void> => {
  if (!req.session.logado) { res.status(401).json({ error: "Não autorizado" }); return; }
  try {
    const { nome, ordem } = req.body;
    if (!nome?.trim()) {
      res.status(400).json({ error: "Nome é obrigatório" });
      return;
    }

    const maxOrdem = await db.select().from(genresTable).orderBy(asc(genresTable.ordem));
    const nextOrdem = maxOrdem.length > 0
      ? Math.max(...maxOrdem.map(g => g.ordem)) + 1
      : 1;

    const [genre] = await db
      .insert(genresTable)
      .values({ nome: nome.trim(), ordem: ordem ?? nextOrdem, ativo: true })
      .returning();

    res.status(201).json(genre);
  } catch (error: any) {
    if (error?.code === "23505") {
      res.status(409).json({ error: "Gênero já existe" });
    } else {
      res.status(500).json({ error: "Erro ao criar gênero" });
    }
  }
});

// PUT /admin/genres/:id — atualizar nome, ordem ou ativo
router.put("/admin/genres/:id", async (req, res): Promise<void> => {
  if (!req.session.logado) { res.status(401).json({ error: "Não autorizado" }); return; }
  try {
    const { id } = req.params;
    const { nome, ordem, ativo } = req.body;

    const [updated] = await db
      .update(genresTable)
      .set({
        ...(nome  !== undefined ? { nome: nome.trim() } : {}),
        ...(ordem !== undefined ? { ordem }             : {}),
        ...(ativo !== undefined ? { ativo }             : {}),
      })
      .where(eq(genresTable.id, parseInt(id)))
      .returning();

    if (!updated) { res.status(404).json({ error: "Gênero não encontrado" }); return; }
    res.json(updated);
  } catch (error: any) {
    if (error?.code === "23505") {
      res.status(409).json({ error: "Já existe um gênero com esse nome" });
    } else {
      res.status(500).json({ error: "Erro ao atualizar gênero" });
    }
  }
});

// DELETE /admin/genres/:id — remover
router.delete("/admin/genres/:id", async (req, res): Promise<void> => {
  if (!req.session.logado) { res.status(401).json({ error: "Não autorizado" }); return; }
  try {
    const { id } = req.params;
    const [deleted] = await db
      .delete(genresTable)
      .where(eq(genresTable.id, parseInt(id)))
      .returning();

    if (!deleted) { res.status(404).json({ error: "Gênero não encontrado" }); return; }
    res.json({ message: "Gênero removido" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao remover gênero" });
  }
});

export default router;
