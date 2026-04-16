import { Router, type IRouter } from "express";
import { db, artistsTable, passwordResetsTable } from "@workspace/db";
import { eq, and, gt, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Resend } from "resend";

const router: IRouter = Router();

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const PORTAL_URL = process.env.PORTAL_URL || "https://94.141.97.95";

router.post("/artists/forgot-password", async (req, res): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email é obrigatório" });
      return;
    }

    const artists = await db.select().from(artistsTable).where(eq(artistsTable.email, email));
    if (artists.length === 0) {
      res.json({ message: "Se o email estiver cadastrado, você receberá um link de recuperação." });
      return;
    }

    const artist = artists[0];

    // Delete any existing unused tokens for this artist
    await db
      .delete(passwordResetsTable)
      .where(eq(passwordResetsTable.artistId, artist.id));

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(passwordResetsTable).values({
      artistId: artist.id,
      token,
      expiresAt,
    });

    const resetUrl = `${PORTAL_URL}/artista/reset/${token}`;

    if (resend) {
      try {
        await resend.emails.send({
          from: "Portal do Artista <onboarding@resend.dev>",
          to: artist.email,
          subject: "Recuperação de Senha - Portal do Artista",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #7c3aed;">Recuperação de Senha</h2>
              <p>Olá, <strong>${artist.name}</strong>!</p>
              <p>Recebemos uma solicitação para redefinir sua senha no Portal do Artista.</p>
              <p>Clique no botão abaixo para criar uma nova senha:</p>
              <a href="${resetUrl}" style="display: inline-block; background-color: #7c3aed; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
                Redefinir Senha
              </a>
              <p style="color: #666; font-size: 14px;">Ou copie e cole este link no navegador:</p>
              <p style="color: #7c3aed; font-size: 14px; word-break: break-all;">${resetUrl}</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
              <p style="color: #999; font-size: 12px;">Este link expira em 1 hora. Se você não solicitou a recuperação, ignore este email.</p>
              <p style="color: #999; font-size: 12px;">Portal do Artista</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Error sending email via Resend:", emailErr);
      }
    }

    // Always return success to not leak whether email exists
    // In dev mode, return the token for testing
    const isDev = !resend;
    res.json({
      message: "Se o email estiver cadastrado, você receberá um link de recuperação.",
      ...(isDev && { devToken: token, resetUrl }),
    });
  } catch (error) {
    console.error("Error in forgot-password:", error);
    res.status(500).json({ error: "Erro ao processar solicitação" });
  }
});

router.post("/artists/reset-password", async (req, res): Promise<void> => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).json({ error: "Token e nova senha são obrigatórios" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres" });
      return;
    }

    // Find valid token
    const resets = await db
      .select()
      .from(passwordResetsTable)
      .where(
        and(
          eq(passwordResetsTable.token, token),
          gt(passwordResetsTable.expiresAt, new Date()),
          isNull(passwordResetsTable.usedAt)
        )
      );

    if (resets.length === 0) {
      res.status(400).json({ error: "Token inválido ou expirado. Solicite uma nova recuperação." });
      return;
    }

    const resetEntry = resets[0];

    // Find artist
    const artists = await db.select().from(artistsTable).where(eq(artistsTable.id, resetEntry.artistId));
    if (artists.length === 0) {
      res.status(404).json({ error: "Artista não encontrado" });
      return;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update artist password
    await db
      .update(artistsTable)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(artistsTable.id, resetEntry.artistId));

    // Mark token as used
    await db
      .update(passwordResetsTable)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetsTable.id, resetEntry.id));

    res.json({ message: "Senha atualizada com sucesso!" });
  } catch (error) {
    console.error("Error in reset-password:", error);
    res.status(500).json({ error: "Erro ao redefinir senha" });
  }
});

// Validate token without resetting
router.get("/artists/validate-reset-token/:token", async (req, res): Promise<void> => {
  try {
    const { token } = req.params;

    const resets = await db
      .select()
      .from(passwordResetsTable)
      .where(
        and(
          eq(passwordResetsTable.token, token),
          gt(passwordResetsTable.expiresAt, new Date()),
          isNull(passwordResetsTable.usedAt)
        )
      );

    if (resets.length === 0) {
      res.status(400).json({ valid: false, error: "Token inválido ou expirado" });
      return;
    }

    res.json({ valid: true });
  } catch (error) {
    console.error("Error validating token:", error);
    res.status(500).json({ error: "Erro ao validar token" });
  }
});

export default router;