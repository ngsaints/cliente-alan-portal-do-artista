import { Router, type IRouter } from "express";
import { db, citiesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

// ─── GET /cities — público, retorna cidades ativas ───────────────────────────

router.get("/cities", async (_req, res): Promise<void> => {
  try {
    const cities = await db
      .select()
      .from(citiesTable)
      .where(eq(citiesTable.ativo, true))
      .orderBy(asc(citiesTable.ordem), asc(citiesTable.nome));
    res.json(cities);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar cidades" });
  }
});

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

// GET /admin/cities — todos (incluindo inativos)
router.get("/admin/cities", async (req, res): Promise<void> => {
  if (!req.session.logado) { res.status(401).json({ error: "Não autorizado" }); return; }
  try {
    const cities = await db
      .select()
      .from(citiesTable)
      .orderBy(asc(citiesTable.ordem), asc(citiesTable.nome));
    res.json(cities);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar cidades" });
  }
});

// POST /admin/cities — criar
router.post("/admin/cities", async (req, res): Promise<void> => {
  if (!req.session.logado) { res.status(401).json({ error: "Não autorizado" }); return; }
  try {
    const { nome, estado, ordem } = req.body;
    if (!nome?.trim()) {
      res.status(400).json({ error: "Nome é obrigatório" });
      return;
    }

    const maxOrdem = await db.select().from(citiesTable).orderBy(asc(citiesTable.ordem));
    const nextOrdem = maxOrdem.length > 0
      ? Math.max(...maxOrdem.map(g => g.ordem)) + 1
      : 1;

    const [city] = await db
      .insert(citiesTable)
      .values({ nome: nome.trim(), estado: estado?.trim() || null, ordem: ordem ?? nextOrdem, ativo: true })
      .returning();

    res.status(201).json(city);
  } catch (error: any) {
    if (error?.code === "23505") {
      res.status(409).json({ error: "Cidade já existe" });
    } else {
      res.status(500).json({ error: "Erro ao criar cidade" });
    }
  }
});

// PUT /admin/cities/:id — atualizar nome, estado, ordem ou ativo
router.put("/admin/cities/:id", async (req, res): Promise<void> => {
  if (!req.session.logado) { res.status(401).json({ error: "Não autorizado" }); return; }
  try {
    const { id } = req.params;
    const { nome, estado, ordem, ativo } = req.body;

    const [updated] = await db
      .update(citiesTable)
      .set({
        ...(nome !== undefined ? { nome: nome.trim() } : {}),
        ...(estado !== undefined ? { estado: estado?.trim() || null } : {}),
        ...(ordem !== undefined ? { ordem } : {}),
        ...(ativo !== undefined ? { ativo } : {}),
      })
      .where(eq(citiesTable.id, parseInt(id)))
      .returning();

    if (!updated) { res.status(404).json({ error: "Cidade não encontrada" }); return; }
    res.json(updated);
  } catch (error: any) {
    if (error?.code === "23505") {
      res.status(409).json({ error: "Já existe uma cidade com esse nome" });
    } else {
      res.status(500).json({ error: "Erro ao atualizar cidade" });
    }
  }
});

// DELETE /admin/cities/:id — remover
router.delete("/admin/cities/:id", async (req, res): Promise<void> => {
  if (!req.session.logado) { res.status(401).json({ error: "Não autorizado" }); return; }
  try {
    const { id } = req.params;
    const [deleted] = await db
      .delete(citiesTable)
      .where(eq(citiesTable.id, parseInt(id)))
      .returning();

    if (!deleted) { res.status(404).json({ error: "Cidade não encontrada" }); return; }
    res.json({ message: "Cidade removida" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao remover cidade" });
  }
});

export default router;
