import { db, artistsTable, plansTable, subscriptionsTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { getEmailConfig, getPortalUrl } from "./email.js";
import { getSubscriptionPayments } from "./asaas-client.js";

export const FREE_PLAN = "free";

type SubscriptionRow = typeof subscriptionsTable.$inferSelect;

const DAY_MS = 24 * 60 * 60 * 1000;
// Asaas reenvia PAYMENT_OVERDUE todo dia — limitamos o e-mail a uma vez por semana.
const OVERDUE_NOTIFY_INTERVAL_MS = 7 * DAY_MS;
// Evita disparar "seu plano expirou" para assinaturas vencidas há muito tempo (backfill).
const EXPIRY_NOTIFY_WINDOW_MS = 7 * DAY_MS;

async function getArtist(artistId: string | number) {
  const rows = await db
    .select({ id: artistsTable.id, name: artistsTable.name, email: artistsTable.email })
    .from(artistsTable)
    .where(eq(artistsTable.id, parseInt(String(artistId))));
  return rows[0] ?? null;
}

async function sendArtistEmail(artistId: string | number, subject: string, text: string): Promise<boolean> {
  try {
    const { resend, from } = await getEmailConfig();
    if (!resend) return false;
    const artist = await getArtist(artistId);
    if (!artist?.email) return false;
    const result = await resend.emails.send({ from, to: artist.email, subject, text });
    if (result.error) {
      console.warn(`[Assinaturas] Falha ao enviar "${subject}" para artista ${artistId}:`, result.error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[Assinaturas] Erro ao enviar e-mail para artista ${artistId}:`, err);
    return false;
  }
}

/**
 * Reverte o artista para o plano gratuito.
 * Se o plano free não existir/estiver inativo no cadastro, o perfil fica inativo
 * até ele assinar de novo (evita "free fantasma") — mesmo critério do cancelamento manual.
 * Retorna true quando o plano free foi mantido ativo.
 */
export async function revertArtistToFree(artistId: string | number): Promise<boolean> {
  const [freePlan] = await db.select().from(plansTable).where(eq(plansTable.nome, FREE_PLAN));
  const freeAllowed = !!freePlan && freePlan.ativo !== false;
  await db
    .update(artistsTable)
    .set({
      plano: FREE_PLAN,
      planoAtivo: freeAllowed,
      limiteMusicas: freeAllowed && freePlan ? String(freePlan.limiteMusicas) : "0",
      personalizacaoPercent: freeAllowed && freePlan ? String(freePlan.personalizacaoPercent) : "0",
      updatedAt: new Date(),
    })
    .where(eq(artistsTable.id, parseInt(String(artistId))));
  return freeAllowed;
}

/** Existe assinatura paga vigente (ativa e não vencida) para este artista? */
export async function hasValidSubscription(artistId: string | number): Promise<boolean> {
  const rows = await db
    .select({ id: subscriptionsTable.id })
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.artistId, String(artistId)),
        eq(subscriptionsTable.status, "active"),
        sql`${subscriptionsTable.expiresAt} > now()`
      )
    )
    .limit(1);
  return rows.length > 0;
}

async function notifyPlanExpired(sub: SubscriptionRow): Promise<void> {
  const ageMs = sub.expiresAt ? Date.now() - new Date(sub.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;
  if (ageMs > EXPIRY_NOTIFY_WINDOW_MS || ageMs < 0) return;
  const portal = await getPortalUrl();
  await sendArtistEmail(
    sub.artistId,
    "Seu plano expirou — renove para manter seu perfil ativo",
    `Olá!\n\nA assinatura do plano ${sub.planNome} venceu em ${new Date(sub.expiresAt!).toLocaleDateString("pt-BR")} e não foi renovada.\n` +
      `Seu perfil foi movido para o plano gratuito e ficará com acesso limitado até a renovação.\n\n` +
      `Renove pelo Painel do Artista (aba Plano): ${portal}/artista/dashboard\n\n` +
      `Se já pagou, aguarde alguns minutos — a confirmação chega automaticamente.\n\nPortal do Artista`
  );
}

/** Marca a assinatura como expirada e reverte o plano quando não sobra nenhuma vigente. */
export async function expireSubscription(sub: SubscriptionRow): Promise<boolean> {
  await db.update(subscriptionsTable).set({ status: "expired" }).where(eq(subscriptionsTable.id, sub.id));
  if (await hasValidSubscription(sub.artistId)) return false;
  const freeAllowed = await revertArtistToFree(sub.artistId);
  console.log(
    `⏰ Assinatura ${sub.id} expirada — artista ${sub.artistId} revertido para ${FREE_PLAN} (ativo=${freeAllowed})`
  );
  return true;
}

/**
 * Varre assinaturas ativas vencidas, expira e reverte os planos.
 * Roda na subida do servidor e depois a cada hora (substitui a expiração "lazy"
 * que só acontecia quando o artista abria a página de assinatura).
 */
export async function runSubscriptionExpiry(): Promise<{ expired: number; reverted: number }> {
  const due = await db
    .select()
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.status, "active"),
        sql`${subscriptionsTable.expiresAt} IS NOT NULL AND ${subscriptionsTable.expiresAt} < now()`
      )
    );

  let expired = 0;
  const revertedArtists = new Set<string>();
  for (const sub of due) {
    try {
      expired++;
      if (await expireSubscription(sub)) revertedArtists.add(String(sub.artistId));
      await notifyPlanExpired(sub);
    } catch (err) {
      console.error(`[Assinaturas] Falha ao expirar assinatura ${sub.id}:`, err);
    }
  }
  if (expired > 0) {
    console.log(`⏰ Expiração de assinaturas: ${expired} expirada(s), ${revertedArtists.size} artista(s) revertido(s).`);
  }
  return { expired, reverted: revertedArtists.size };
}

export function startSubscriptionExpiry(): void {
  const run = () => {
    void runSubscriptionExpiry().catch((err) => console.error("[Assinaturas] Expiração falhou:", err));
  };
  run();
  setInterval(run, 60 * 60 * 1000).unref();
}

async function resolveLocalSubscription(payment: any, subscription: any): Promise<SubscriptionRow | null> {
  const asaasSubscriptionId = payment?.subscription ?? subscription?.id ?? null;
  if (asaasSubscriptionId) {
    const [bySub] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.asaasSubscriptionId, asaasSubscriptionId))
      .orderBy(sql`${subscriptionsTable.createdAt} DESC`)
      .limit(1);
    if (bySub) return bySub;
  }

  if (payment?.id) {
    const [byPayment] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.asaasPaymentId, payment.id))
      .orderBy(sql`${subscriptionsTable.createdAt} DESC`)
      .limit(1);
    if (byPayment) return byPayment;
  }

  const externalRef = payment?.externalReference ?? "";
  const [artistId, planNome] = String(externalRef).split("-");
  if (artistId && planNome) {
    const [byRef] = await db
      .select()
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.artistId, artistId),
          eq(subscriptionsTable.planNome, planNome),
          sql`${subscriptionsTable.status} IN ('pending', 'active')`
        )
      )
      .orderBy(sql`${subscriptionsTable.createdAt} DESC`)
      .limit(1);
    if (byRef) return byRef;
  }

  return null;
}

async function invoiceLinkFor(sub: SubscriptionRow): Promise<string | null> {
  const id = sub.asaasSubscriptionId;
  if (!id || id.startsWith("direct_activation_") || id.startsWith("admin_grant_")) return null;
  try {
    const payments = await getSubscriptionPayments(id);
    return payments.data?.[0]?.invoiceUrl ?? null;
  } catch {
    return null;
  }
}

/**
 * Evento PAYMENT_OVERDUE do Asaas: antes era só um console.log.
 * Agora marca o atraso, reverte o plano se a assinatura já venceu e avisa o artista
 * (no máximo uma vez por semana, porque o Asaas reenvia o evento todo dia).
 */
export async function handleAsaasPaymentOverdue(payment: any, subscription: any): Promise<void> {
  const paymentId = payment?.id ?? "(sem payment.id)";
  const sub = await resolveLocalSubscription(payment, subscription);

  if (!sub) {
    console.warn(`[Assinaturas] PAYMENT_OVERDUE ${paymentId} sem assinatura local correspondente — nada a fazer.`);
    return;
  }

  const now = new Date();
  if (!sub.overdueAt) {
    await db.update(subscriptionsTable).set({ overdueAt: now }).where(eq(subscriptionsTable.id, sub.id));
  }

  // Assinatura já vencida: encerra o ciclo e reverte o plano na hora (não espera o artista abrir a página).
  if (sub.expiresAt && new Date(sub.expiresAt) < now) {
    await expireSubscription(sub);
    console.warn(`[Assinaturas] PAYMENT_OVERDUE ${paymentId} em assinatura vencida ${sub.id} — plano revertido.`);
    return;
  }

  const lastNotified = sub.overdueNotifiedAt ? new Date(sub.overdueNotifiedAt).getTime() : 0;
  if (now.getTime() - lastNotified < OVERDUE_NOTIFY_INTERVAL_MS) {
    console.log(`[Assinaturas] PAYMENT_OVERDUE ${paymentId} (assinatura ${sub.id}) — já notificado, throttled.`);
    return;
  }

  const invoiceUrl = await invoiceLinkFor(sub);
  const portal = await getPortalUrl();
  const vencimento = sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString("pt-BR") : "";
  const sent = await sendArtistEmail(
    sub.artistId,
    "Cobrança em atraso — renove seu plano no Portal do Artista",
    `Olá!\n\nIdentificamos uma cobrança em atraso do plano ${sub.planNome}${vencimento ? ` (período até ${vencimento})` : ""}.\n` +
      `Sem a confirmação do pagamento, seu perfil será movido para o plano gratuito ao fim do período contratado.\n\n` +
      (invoiceUrl ? `Pague pela fatura: ${invoiceUrl}\n\n` : "") +
      `Ou renove pelo Painel do Artista (aba Plano): ${portal}/artista/dashboard\n\n` +
      `Se você já pagou, desconsidere este aviso.\n\nPortal do Artista`
  );

  if (sent) {
    await db
      .update(subscriptionsTable)
      .set({ overdueNotifiedAt: now })
      .where(eq(subscriptionsTable.id, sub.id));
  }
  console.log(
    `[Assinaturas] PAYMENT_OVERDUE ${paymentId} → assinatura ${sub.id} (artista ${sub.artistId}) | notificado=${sent}`
  );
}
