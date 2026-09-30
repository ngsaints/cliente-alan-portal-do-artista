import type { Request, Response, NextFunction } from "express";
import { db, artistsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

/**
 * Artista reservado usado pelo Painel Administrativo quando o admin abre o
 * Estúdio Vivi. Sem ele, os endpoints de geração responderiam 401 (eles pedem
 * `session.artistId`, que o admin não tem).
 */
export const ADMIN_STUDIO_EMAIL = "studio-admin@portal-do-artista.local";

async function findOrCreateAdminArtist(): Promise<number> {
  const existing = await db.select().from(artistsTable).where(eq(artistsTable.email, ADMIN_STUDIO_EMAIL));
  if (existing.length > 0) return existing[0].id;

  const [created] = await db
    .insert(artistsTable)
    .values({
      name: "Studio de Testes (Admin)",
      slug: "studio-de-testes-admin",
      email: ADMIN_STUDIO_EMAIL,
      password: randomBytes(24).toString("hex"), // nunca usado: e-mail inválido p/ login
      plano: "premium",
      planoAtivo: false, // some da listagem pública de artistas
      limiteMusicas: "40",
      personalizacaoPercent: "100",
      aiMusicExtraCredits: 999, // admin nunca trava no meio de um teste
      profissao: "Painel administrativo",
    })
    .returning();

  console.log(`[Admin Studio] Artista de teste criado (id ${created.id}).`);
  return created.id;
}

/**
 * Se quem está chamando é o admin (sessão `logado`) e não tem artista associado,
 * associa o artista de teste — assim o Estúdio Vivi funciona no admin exatamente
 * como para o usuário final (mesma interface, mesmos endpoints).
 */
export async function ensureAdminStudioArtist(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const session = req.session as any;
    if (session?.logado && !session.artistId) {
      session.artistId = await findOrCreateAdminArtist();
    }
  } catch (err) {
    console.warn("[Admin Studio] Não consegui montar o artista de teste:", err);
  }
  next();
}
