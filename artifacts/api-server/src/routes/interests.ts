import { Router, type IRouter } from "express";
import { db, interestsTable, artistsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getEmailConfig, getPortalUrl } from "../lib/email.js";

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

    // Send notification email to artist if artistaId exists
    if (artistaId) {
      try {
        const artists = await db.select().from(artistsTable).where(eq(artistsTable.id, parseInt(artistaId)));
        if (artists.length > 0) {
          const artist = artists[0];
          const { resend, from } = await getEmailConfig();
          const portalUrl = await getPortalUrl();
          if (!resend) {
            console.log("Resend not configured, skipping email notification");
          } else {
            const interestUrl = `${portalUrl}/artista/dashboard?tab=interesses`;
            const contatoMsg = contratarShow ? "Sim" : "Não";
            await resend.emails.send({
              from,
              to: artist.email,
              subject: `🔔 Novo interesse recebido - ${nome}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #7c3aed;">🔔 Novo Interesse Recebido</h2>
                  <p>Olá, <strong>${artist.name}</strong>!</p>
                  <p>Você recebeu um novo interesse no seu perfil:</p>
                  <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
                    <tr><td style="padding: 8px; border: 1px solid #eee; font-weight: bold;">Nome</td><td style="padding: 8px; border: 1px solid #eee;">${nome}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #eee; font-weight: bold;">Email</td><td style="padding: 8px; border: 1px solid #eee;">${email}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #eee; font-weight: bold;">Telefone</td><td style="padding: 8px; border: 1px solid #eee;">${telefone || "Não informado"}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #eee; font-weight: bold;">Mensagem</td><td style="padding: 8px; border: 1px solid #eee;">${mensagem || "Não informada"}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #eee; font-weight: bold;">Quer contratar show</td><td style="padding: 8px; border: 1px solid #eee;">${contatoMsg}</td></tr>
                  </table>
                  <a href="${interestUrl}" style="display: inline-block; background-color: #7c3aed; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
                    Ver Interesses
                  </a>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                  <p style="color: #999; font-size: 12px;">Portal do Artista</p>
                </div>
              `,
            });
          }
        }
      } catch (emailErr) {
        console.error("Error sending interest notification email:", emailErr);
      }
    }

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
    const isArtist = req.session.artistId && String(req.session.artistId) === artistId;

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
    const isArtist = req.session.artistId && req.session.artistId === interest.artistaId;
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
    const isArtist = req.session.artistId && req.session.artistId === interest.artistaId;
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
