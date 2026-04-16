import { Router, type IRouter } from "express";
import { db, interestsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router: IRouter = Router();

// ─── POST /interests — salvar interesse vinculado ao artista ─────────────────

router.post("/interests", async (req, res): Promise<void> => {
  try {
    const {
      songId, artistaId,
      nome, email, telefone, mensagem,
      contratarShow, reservarMusica, agendarReuniao,
    } = req.body;

    if (!songId || !nome || !email) {
      res.status(400).json({ error: "songId, nome e email são obrigatórios" });
      return;
    }

    const [interest] = await db
      .insert(interestsTable)
      .values({
        songId: String(songId),
        artistaId: artistaId ? parseInt(artistaId) : null,
        nome,
        email,
        telefone:       telefone       || null,
        mensagem:       mensagem       || null,
        contratarShow:  Boolean(contratarShow),
        reservarMusica: Boolean(reservarMusica),
        agendarReuniao: Boolean(agendarReuniao),
      })
      .returning();

    res.status(201).json(interest);
  } catch (error) {
    console.error("Error submitting interest:", error);
    res.status(500).json({ error: "Erro ao enviar interesse" });
  }
});

// ─── GET /interests/artist/:artistId — interesses do artista logado ──────────

router.get("/interests/artist/:artistId", async (req, res): Promise<void> => {
  try {
    const { artistId } = req.params;

    // Verifica autenticação: artista logado ou admin
    const isAdmin  = req.session.logado;
    const isArtist = req.session.artistaId && String(req.session.artistaId) === artistId;

    if (!isAdmin && !isArtist) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }

    const interests = await db
      .select()
      .from(interestsTable)
      .where(eq(interestsTable.artistaId, parseInt(artistId)))
      .orderBy(desc(interestsTable.createdAt));

    res.json(interests);
  } catch (error) {
    console.error("Error getting artist interests:", error);
    res.status(500).json({ error: "Erro ao obter interesses" });
  }
});

// ─── GET /interests — todos (admin) ──────────────────────────────────────────

router.get("/interests", async (req, res): Promise<void> => {
  try {
    if (!req.session.logado) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }
    const interests = await db
      .select()
      .from(interestsTable)
      .orderBy(desc(interestsTable.createdAt));
    res.json(interests);
  } catch (error) {
    res.status(500).json({ error: "Erro ao obter interesses" });
  }
});

// ─── GET /interests/unread-count ──────────────────────────────────────────────

router.get("/interests/unread-count", async (_req, res): Promise<void> => {
  try {
    const interests = await db
      .select()
      .from(interestsTable)
      .where(eq(interestsTable.lido, false));
    res.json({ count: interests.length });
  } catch (error) {
    res.status(500).json({ error: "Erro ao obter contagem" });
  }
});

// ─── PATCH /interests/:id/read — marcar como lido ────────────────────────────

router.patch("/interests/:id/read", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;

    const [interest] = await db
      .select()
      .from(interestsTable)
      .where(eq(interestsTable.id, parseInt(id)));

    if (!interest) {
      res.status(404).json({ error: "Interesse não encontrado" });
      return;
    }

    // Permite artista dono ou admin
    const isAdmin  = req.session.logado;
    const isArtist = req.session.artistaId && req.session.artistaId === interest.artistaId;
    if (!isAdmin && !isArtist) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }

    await db
      .update(interestsTable)
      .set({ lido: true })
      .where(eq(interestsTable.id, parseInt(id)));

    res.json({ message: "Marcado como lido" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao marcar como lido" });
  }
});

// ─── DELETE /interests/:id — cancelar/excluir ─────────────────────────────────

router.delete("/interests/:id", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;

    const [interest] = await db
      .select()
      .from(interestsTable)
      .where(eq(interestsTable.id, parseInt(id)));

    if (!interest) {
      res.status(404).json({ error: "Interesse não encontrado" });
      return;
    }

    // Permite artista dono ou admin
    const isAdmin  = req.session.logado;
    const isArtist = req.session.artistaId && req.session.artistaId === interest.artistaId;
    if (!isAdmin && !isArtist) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }

    await db.delete(interestsTable).where(eq(interestsTable.id, parseInt(id)));
    res.json({ message: "Interesse excluído" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao excluir interesse" });
  }
});

export default router;
