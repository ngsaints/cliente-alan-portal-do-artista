import { Router, type IRouter } from "express";
import { db, artistsTable, plansTable, subscriptionsTable, couponsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import {
  getAsaasCredentials,
  findOrCreateCustomer,
  createSubscription,
  getSubscriptionPayments,
  getPaymentById,
} from "../lib/asaas-client.js";

const router: IRouter = Router();

const FREE_PLAN = "free";
export { FREE_PLAN };

router.get("/payments/plans", async (_req, res): Promise<void> => {
  try {
    const plans = await db.select().from(plansTable).where(eq(plansTable.ativo, true));
    res.json(plans.map((p) => ({
      id: p.nome,
      nome: p.label,
      preco: p.preco,
      limiteMusicas: p.limiteMusicas,
      personalizacaoPercent: p.personalizacaoPercent,
      descricao: p.descricao,
      fraseEfeito: p.fraseEfeito,
    })));
  } catch (error) {
    console.error("Error fetching plans:", error);
    res.status(500).json({ error: "Erro ao buscar planos" });
  }
});

router.post("/payments/create-preference", async (req, res): Promise<void> => {
  try {
    const { planId, artistId, couponCode } = req.body;

    if (!planId || !artistId) {
      res.status(400).json({ error: "Plano e artista são obrigatórios" });
      return;
    }

    if (planId === FREE_PLAN) {
      res.status(400).json({ error: "Plano gratuito não requer pagamento" });
      return;
    }

    const [plan] = await db.select().from(plansTable).where(eq(plansTable.nome, planId));
    if (!plan) {
      res.status(404).json({ error: "Plano não encontrado" });
      return;
    }

    const { apiKey, portalUrl } = await getAsaasCredentials();
    if (!apiKey) {
      res.status(500).json({ error: "Asaas não configurado. Insira a API Key no painel admin." });
      return;
    }

    const [artist] = await db.select().from(artistsTable).where(eq(artistsTable.id, parseInt(artistId)));
    if (!artist) {
      res.status(404).json({ error: "Artista não encontrado" });
      return;
    }

    let finalPrice = Number(plan.preco);
    let discountAmount = 0;
    let appliedCoupon: { code: string; discountType: string; discountValue: string } | null = null;

    if (couponCode) {
      const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, couponCode.toUpperCase()));
      if (coupon && coupon.isActive) {
        const now = new Date();
        const isValid = (!coupon.validFrom || new Date(coupon.validFrom) <= now) &&
          (!coupon.validUntil || new Date(coupon.validUntil) >= now) &&
          (!coupon.maxUses || parseInt(String(coupon.usedCount)) < parseInt(String(coupon.maxUses)));

        if (isValid) {
          const applicablePlans = coupon.applicablePlans;
          const planApplicable = !applicablePlans || applicablePlans.length === 0 || applicablePlans.includes(planId);
          if (planApplicable) {
            finalPrice = Number(plan.preco);
            if (coupon.discountType === "percentage") {
              discountAmount = (finalPrice * parseFloat(String(coupon.discountValue))) / 100;
              finalPrice = finalPrice - discountAmount;
            } else {
              discountAmount = parseFloat(String(coupon.discountValue));
              finalPrice = Math.max(0, finalPrice - discountAmount);
            }
            appliedCoupon = {
              code: coupon.code,
              discountType: coupon.discountType,
              discountValue: coupon.discountValue,
            };
          }
        }
      }
    }

    let customerId = artist.asaasCustomerId;
    if (!customerId) {
      const customer = await findOrCreateCustomer(
        artist.name,
        artist.email,
        undefined,
        artist.contato ?? undefined
      );
      customerId = customer.id;

      await db
        .update(artistsTable)
        .set({ asaasCustomerId: customerId, updatedAt: new Date() })
        .where(eq(artistsTable.id, parseInt(artistId)));
    }

    const callbackUrl = portalUrl
      ? `${portalUrl}/artista/dashboard?pagamento=sucesso`
      : undefined;

    const subscription = await createSubscription({
      customerId: customerId!,
      value: finalPrice,
      billingType: "UNDEFINED",
      description: `Plano ${plan.label} — Portal do Artista`,
      externalReference: `${artistId}-${planId}`,
      callbackUrl,
    });

    const existingSubs = await db
      .select()
      .from(subscriptionsTable)
      .where(and(
        eq(subscriptionsTable.artistId, artistId),
        eq(subscriptionsTable.planNome, planId),
        eq(subscriptionsTable.status, "active")
      ));

    if (existingSubs.length === 0) {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      await db.insert(subscriptionsTable).values({
        artistId: artistId,
        planNome: planId,
        asaasSubscriptionId: subscription.id,
        status: "pending",
        amount: String(finalPrice),
        startedAt: new Date(),
        expiresAt,
        couponCode: appliedCoupon?.code ?? null,
      });
    }

    const payments = await getSubscriptionPayments(subscription.id);
    const firstPayment = payments.data?.[0];

    res.json({
      subscriptionId: subscription.id,
      invoiceUrl: firstPayment?.invoiceUrl ?? null,
      paymentId: firstPayment?.id ?? null,
      sandbox: (await getAsaasCredentials()).sandbox,
      appliedCoupon,
      originalPrice: Number(plan.preco).toFixed(2),
      finalPrice: finalPrice.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
    });
  } catch (error: any) {
    console.error("Error creating Asaas subscription:", error);
    res.status(500).json({ error: error.message ?? "Erro ao criar assinatura" });
  }
});

router.post("/webhooks/asaas", async (req, res): Promise<void> => {
  try {
    const { webhookToken } = await getAsaasCredentials();

    if (webhookToken) {
      const token = req.headers["asaas-access-token"] as string ?? "";
      if (token !== webhookToken) {
        console.warn("Webhook Asaas: token inválido — ignorado");
        res.status(401).json({ error: "Token inválido" });
        return;
      }
    }

    const { event, payment, subscription } = req.body;

    if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
      const paymentData = payment;
      if (!paymentData?.id) {
        res.json({ status: "ok", message: "No payment data" });
        return;
      }

      const existingSubs = await db
        .select()
        .from(subscriptionsTable)
        .where(and(
          eq(subscriptionsTable.asaasPaymentId, paymentData.id),
          eq(subscriptionsTable.status, "active")
        ));

      if (existingSubs.length > 0) {
        console.log(`Webhook Asaas: payment ${paymentData.id} já processado — idempotência OK`);
        res.json({ status: "ok", message: "Already processed" });
        return;
      }

      const externalRef = paymentData.externalReference ?? "";
      const [artistId, planId] = externalRef.split("-");

      if (artistId && planId) {
        const [plan] = await db.select().from(plansTable).where(eq(plansTable.nome, planId));
        if (plan) {
          await db
            .update(artistsTable)
            .set({
              plano: planId,
              planoAtivo: true,
              limiteMusicas: String(plan.limiteMusicas),
              personalizacaoPercent: String(plan.personalizacaoPercent),
              updatedAt: new Date(),
            })
            .where(eq(artistsTable.id, parseInt(artistId)));

          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 1);

          await db.insert(subscriptionsTable).values({
            artistId: artistId,
            planNome: planId,
            asaasSubscriptionId: paymentData.subscription ?? null,
            asaasPaymentId: paymentData.id,
            status: "active",
            amount: String(paymentData.value ?? plan.preco),
            billingType: paymentData.billingType ?? null,
            startedAt: new Date(),
            expiresAt,
          });

          console.log(`✅ Artista ${artistId} atualizado para plano ${planId} | Payment: ${paymentData.id}`);
        }
      }
    } else if (event === "SUBSCRIPTION_CREATED" || event === "SUBSCRIPTION_UPDATED") {
      console.log(`Webhook Asaas: ${event} para subscription ${subscription?.id}`);
    } else if (event === "PAYMENT_OVERDUE") {
      console.log(`Webhook Asaas: payment overdue ${payment?.id}`);
    }

    res.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Erro no processamento do webhook" });
  }
});

router.get("/payments/subscription/:artistId", async (req, res): Promise<void> => {
  try {
    const { artistId } = req.params;
    const subscriptions = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.artistId, artistId))
      .orderBy(sql`${subscriptionsTable.createdAt} DESC`);

    const active = subscriptions.find(s => s.status === "active" && (!s.expiresAt || new Date(s.expiresAt) > new Date()));
    const expired = active && new Date(active.expiresAt!) < new Date();

    if (expired) {
      await db
        .update(subscriptionsTable)
        .set({ status: "expired" })
        .where(eq(subscriptionsTable.id, active.id));

      await db
        .update(artistsTable)
        .set({
          plano: FREE_PLAN,
          planoAtivo: false,
          updatedAt: new Date(),
        })
        .where(eq(artistsTable.id, parseInt(artistId)));

      const [updated] = await db.select().from(artistsTable).where(eq(artistsTable.id, parseInt(artistId)));
      if (updated) {
        const [freePlan] = await db.select().from(plansTable).where(eq(plansTable.nome, FREE_PLAN));
        if (freePlan) {
          await db
            .update(artistsTable)
            .set({
              limiteMusicas: String(freePlan.limiteMusicas),
              personalizacaoPercent: String(freePlan.personalizacaoPercent),
            })
            .where(eq(artistsTable.id, parseInt(artistId)));
        }
      }

      console.log(`⏰ Assinatura expirada para artista ${artistId} — plano revertido para ${FREE_PLAN}`);
    }

    res.json({
      subscriptions,
      activeSubscription: active ? { ...active, expired: false } : null,
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    res.status(500).json({ error: "Erro ao buscar assinatura" });
  }
});

export default router;
