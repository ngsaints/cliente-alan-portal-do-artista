import { Router, type IRouter } from "express";
import { db, couponsTable, subscriptionsTable, artistsTable, plansTable } from "@workspace/db";
import { eq, sql, and, gte, lte } from "drizzle-orm";

const router: IRouter = Router();

export const FREE_PLAN = "free";

export const PLANOS_PAGOS = ["basico", "intermediario", "pro", "premium"] as const;

router.get("/coupons", async (req, res): Promise<void> => {
  try {
    const coupons = await db.select().from(couponsTable).orderBy(couponsTable.createdAt);
    res.json(coupons);
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({ error: "Erro ao buscar cupons" });
  }
});

router.post("/coupons", async (req, res): Promise<void> => {
  if (!req.session.logado) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }
  try {
    const data = req.body;
    const created = await db.insert(couponsTable).values({
      code: data.code.toUpperCase(),
      discountType: data.discountType,
      discountValue: String(data.discountValue),
      minAmount: data.minAmount ? String(data.minAmount) : "0",
      maxUses: data.maxUses ? String(data.maxUses) : null,
      usedCount: "0",
      validFrom: data.validFrom ? new Date(data.validFrom) : new Date(),
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      isActive: data.isActive ?? true,
      applicablePlans: data.applicablePlans || null,
      description: data.description || null,
    }).returning();
    res.status(201).json(created[0]);
  } catch (error) {
    console.error("Error creating coupon:", error);
    res.status(500).json({ error: "Erro ao criar cupom" });
  }
});

router.put("/coupons/:id", async (req, res): Promise<void> => {
  if (!req.session.logado) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }
  try {
    const { id } = req.params;
    const data = req.body;
    const updated = await db.update(couponsTable).set({
      code: data.code ? data.code.toUpperCase() : undefined,
      discountType: data.discountType,
      discountValue: data.discountValue ? String(data.discountValue) : undefined,
      minAmount: data.minAmount ? String(data.minAmount) : undefined,
      maxUses: data.maxUses ? String(data.maxUses) : undefined,
      validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
      isActive: data.isActive,
      applicablePlans: data.applicablePlans,
      description: data.description,
    }).where(eq(couponsTable.id, parseInt(id))).returning();
    if (!updated.length) {
      res.status(404).json({ error: "Cupom não encontrado" });
      return;
    }
    res.json(updated[0]);
  } catch (error) {
    console.error("Error updating coupon:", error);
    res.status(500).json({ error: "Erro ao atualizar cupom" });
  }
});

router.delete("/coupons/:id", async (req, res): Promise<void> => {
  if (!req.session.logado) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }
  try {
    const { id } = req.params;
    const deleted = await db.delete(couponsTable).where(eq(couponsTable.id, parseInt(id))).returning();
    if (!deleted.length) {
      res.status(404).json({ error: "Cupom não encontrado" });
      return;
    }
    res.json({ message: "Cupom deletado com sucesso" });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    res.status(500).json({ error: "Erro ao deletar cupom" });
  }
});

router.post("/coupons/validate", async (req, res): Promise<void> => {
  try {
    const { code, planId } = req.body;
    if (!code) {
      res.status(400).json({ error: "Código do cupom é obrigatório" });
      return;
    }

    const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, code.toUpperCase()));

    if (!coupon) {
      res.status(404).json({ error: "Cupom não encontrado", valid: false });
      return;
    }

    if (!coupon.isActive) {
      res.status(400).json({ error: "Cupom inativo", valid: false });
      return;
    }

    const now = new Date();
    if (coupon.validFrom && new Date(coupon.validFrom) > now) {
      res.status(400).json({ error: "Cupom ainda não está válido", valid: false });
      return;
    }

    if (coupon.validUntil && new Date(coupon.validUntil) < now) {
      res.status(400).json({ error: "Cupom expirado", valid: false });
      return;
    }

    if (coupon.maxUses && parseInt(String(coupon.usedCount)) >= parseInt(String(coupon.maxUses))) {
      res.status(400).json({ error: "Cupom atingilimitou de usos", valid: false });
      return;
    }

    const [plan] = await db.select().from(plansTable).where(eq(plansTable.nome, planId));
    if (!plan) {
      res.status(404).json({ error: "Plano não encontrado", valid: false });
      return;
    }

    if (coupon.applicablePlans && coupon.applicablePlans.length > 0) {
      if (!coupon.applicablePlans.includes(planId)) {
        res.status(400).json({ error: "Cupom não aplicável a este plano", valid: false });
        return;
      }
    }

    const minAmount = parseFloat(String(coupon.minAmount || "0"));
    const planPrice = parseFloat(String(plan.preco));
    if (minAmount > 0 && planPrice < minAmount) {
      res.status(400).json({ error: `Valor mínimo do plano: R$ ${minAmount.toFixed(2)}`, valid: false });
      return;
    }

    let discountAmount = 0;
    let finalPrice = planPrice;

    if (coupon.discountType === "percentage") {
      discountAmount = (planPrice * parseFloat(String(coupon.discountValue))) / 100;
      finalPrice = planPrice - discountAmount;
    } else {
      discountAmount = parseFloat(String(coupon.discountValue));
      finalPrice = Math.max(0, planPrice - discountAmount);
    }

    res.json({
      valid: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: discountAmount.toFixed(2),
        finalPrice: finalPrice.toFixed(2),
        originalPrice: planPrice.toFixed(2),
      },
    });
  } catch (error) {
    console.error("Error validating coupon:", error);
    res.status(500).json({ error: "Erro ao validar cupom" });
  }
});

router.post("/coupons/redeem", async (req, res): Promise<void> => {
  try {
    const { code, artistId, planId, asaasPaymentId } = req.body;
    if (!code || !artistId || !planId) {
      res.status(400).json({ error: "Dados incompletos" });
      return;
    }

    const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, code.toUpperCase()));
    if (!coupon) {
      res.status(404).json({ error: "Cupom não encontrado" });
      return;
    }

    if (!coupon.isActive) {
      res.status(400).json({ error: "Cupom inativo" });
      return;
    }

    const now = new Date();
    if (coupon.validUntil && new Date(coupon.validUntil) < now) {
      res.status(400).json({ error: "Cupom expirado" });
      return;
    }

    if (coupon.maxUses && parseInt(String(coupon.usedCount)) >= parseInt(String(coupon.maxUses))) {
      res.status(400).json({ error: "Cupom atingiu limite de usos" });
      return;
    }

    await db.update(couponsTable).set({
      usedCount: sql`${couponsTable.usedCount} + 1`,
    }).where(eq(couponsTable.id, coupon.id));

    if (asaasPaymentId) {
      await db.update(subscriptionsTable).set({
        couponCode: code.toUpperCase(),
      }).where(eq(subscriptionsTable.asaasPaymentId, asaasPaymentId));
    }

    res.json({ message: "Cupom resgatado com sucesso", couponCode: code.toUpperCase() });
  } catch (error) {
    console.error("Error redeeming coupon:", error);
    res.status(500).json({ error: "Erro ao resgatar cupom" });
  }
});

export default router;