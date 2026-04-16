import { Router, type IRouter } from "express";
import { createHmac } from "crypto";
import { db, artistsTable, plansTable, appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Busca as credenciais MP + URL base do portal do banco */
async function getMpCredentials(): Promise<{ accessToken: string; webhookSecret: string; portalUrl: string }> {
  const rows = await db.select().from(appSettingsTable);

  const map: Record<string, string> = {};
  rows.forEach((r) => { if (r.value) map[r.key] = r.value; });

  return {
    accessToken:   map["mp_access_token"]   ?? "",
    webhookSecret: map["mp_webhook_secret"] ?? "",
    portalUrl:     (map["portal_url"] ?? "https://94.141.97.95").replace(/\/$/, ""),
  };
}

/** Verifica assinatura do webhook MercadoPago (HMAC-SHA256) */
function verifyWebhookSignature(
  secret: string,
  xSignature: string,
  xRequestId: string,
  dataId: string
): boolean {
  try {
    // x-signature: "ts=<timestamp>,v1=<hash>"
    const parts = Object.fromEntries(
      xSignature.split(",").map((p) => p.split("=") as [string, string])
    );
    const ts = parts["ts"];
    const v1 = parts["v1"];
    if (!ts || !v1) return false;

    // Template: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
    const template = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const expected = createHmac("sha256", secret).update(template).digest("hex");

    return expected === v1;
  } catch {
    return false;
  }
}

// ─── GET /payments/plans ──────────────────────────────────────────────────────

router.get("/payments/plans", async (_req, res): Promise<void> => {
  try {
    const plans = await db.select().from(plansTable).where(eq(plansTable.ativo, true));
    res.json(plans.map((p) => ({
      id:                   p.nome,
      nome:                 p.label,
      preco:                p.preco,
      limiteMusicas:        p.limiteMusicas,
      personalizacaoPercent: p.personalizacaoPercent,
      descricao:            p.descricao,
      fraseEfeito:          p.fraseEfeito,
    })));
  } catch (error) {
    console.error("Error fetching plans:", error);
    res.status(500).json({ error: "Erro ao buscar planos" });
  }
});

// ─── POST /payments/create-preference ────────────────────────────────────────

router.post("/payments/create-preference", async (req, res): Promise<void> => {
  try {
    const { planId, artistId } = req.body;

    if (!planId || !artistId) {
      res.status(400).json({ error: "Plano e artista são obrigatórios" });
      return;
    }

    // Busca plano
    const [plan] = await db.select().from(plansTable).where(eq(plansTable.nome, planId));
    if (!plan) {
      res.status(404).json({ error: "Plano não encontrado" });
      return;
    }

    // Busca credenciais
    const { accessToken, portalUrl } = await getMpCredentials();
    if (!accessToken) {
      res.status(500).json({ error: "MercadoPago não configurado. Insira o Access Token no painel admin." });
      return;
    }

    // Detecta sandbox pelo prefixo do token
    const isSandbox = accessToken.startsWith("TEST-");
    const mpBase = isSandbox
      ? "https://api.sandbox.mercadopago.com"
      : "https://api.mercadopago.com";

    const preference = {
      items: [{
        title:       `Plano ${plan.label} — Portal do Artista`,
        description: plan.descricao ?? `Até ${plan.limiteMusicas} músicas`,
        quantity:    1,
        currency_id: "BRL",
        unit_price:  Number(plan.preco),
      }],
      external_reference: `${artistId}-${planId}`,
      notification_url:   `${portalUrl}/api/webhooks/mercadopago`,
      back_urls: {
        success: `${portalUrl}/artista/dashboard?pagamento=sucesso`,
        failure: `${portalUrl}/artista/dashboard?pagamento=erro`,
        pending: `${portalUrl}/artista/dashboard?pagamento=pendente`,
      },
      auto_return: "approved",
    };

    const mpRes = await fetch(`${mpBase}/checkout/preferences`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preference),
    });

    const data = await mpRes.json() as any;

    if (!mpRes.ok) {
      console.error("MP Error:", data);
      res.status(500).json({ error: data.message ?? "Erro no MercadoPago" });
      return;
    }

    res.json({
      preferenceId: data.id,
      initPoint:    isSandbox ? data.sandbox_init_point : data.init_point,
      sandbox:      isSandbox,
    });
  } catch (error) {
    console.error("Error creating payment preference:", error);
    res.status(500).json({ error: "Erro ao criar preferência de pagamento" });
  }
});

// ─── POST /webhooks/mercadopago ───────────────────────────────────────────────

router.post("/webhooks/mercadopago", async (req, res): Promise<void> => {
  try {
    const xSignature  = (req.headers["x-signature"]  as string) ?? "";
    const xRequestId  = (req.headers["x-request-id"] as string) ?? "";
    const { type, data } = req.body;

    const { accessToken, webhookSecret } = await getMpCredentials();

    // Verifica assinatura se a secret estiver configurada
    if (webhookSecret && data?.id) {
      const valid = verifyWebhookSignature(webhookSecret, xSignature, xRequestId, String(data.id));
      if (!valid) {
        console.warn("Webhook MP: assinatura inválida — ignorado");
        res.status(401).json({ error: "Assinatura inválida" });
        return;
      }
    }

    if (type === "payment" && data?.id && accessToken) {
      const isSandbox = accessToken.startsWith("TEST-");
      const mpBase = isSandbox
        ? "https://api.sandbox.mercadopago.com"
        : "https://api.mercadopago.com";

      const payRes  = await fetch(`${mpBase}/v1/payments/${data.id}`, {
        headers: { "Authorization": `Bearer ${accessToken}` },
      });
      const payment = await payRes.json() as any;

      if (payment.status === "approved") {
        const [artistId, planId] = (payment.external_reference ?? "").split("-");

        if (artistId && planId) {
          const [plan] = await db.select().from(plansTable).where(eq(plansTable.nome, planId));
          if (plan) {
            await db
              .update(artistsTable)
              .set({
                plano:                planId,
                planoAtivo:           true,
                limiteMusicas:        String(plan.limiteMusicas),
                personalizacaoPercent: String(plan.personalizacaoPercent),
                updatedAt:            new Date(),
              })
              .where(eq(artistsTable.id, parseInt(artistId)));

            console.log(`✅ Artista ${artistId} atualizado para plano ${planId}`);
          }
        }
      }
    }

    res.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Erro no processamento do webhook" });
  }
});

export default router;
