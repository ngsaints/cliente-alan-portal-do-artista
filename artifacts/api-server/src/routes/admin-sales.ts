import { Router, type IRouter } from "express";
import {
  db,
  artistsTable,
  subscriptionsTable,
  plansTable,
} from "@workspace/db";
import {
  salesStatus,
  filterSales,
  summarizeSales,
  type Sale,
  type SalesFilters,
  SALES_STATUSES,
} from "@workspace/api-zod";
import { getAsaasCredentials, getAsaasBaseUrl } from "../lib/asaas-client";

const getSalesLinks = async () => {
  const [artists, subscriptions, plans] = await Promise.all([
    db
      .select({
        id: artistsTable.id,
        name: artistsTable.name,
        email: artistsTable.email,
      })
      .from(artistsTable),
    db.select().from(subscriptionsTable),
    db
      .select({ nome: plansTable.nome, label: plansTable.label })
      .from(plansTable),
  ]);
  return { artists, subscriptions, plans };
};
export function createAdminSalesRouter(
  dependencies = {
    getCredentials: getAsaasCredentials,
    getLinks: getSalesLinks,
    fetchPayments: fetch,
  },
): IRouter {
  const router: IRouter = Router();
  router.get("/admin/sales", async (req, res): Promise<void> => {
    if (!req.session.logado) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }
    const query = req.query;
    const scalar = (key: string) =>
      typeof query[key] === "string" ? (query[key] as string) : "";
    const dateField = scalar("dateField") || "created";
    const status = scalar("status") || "all";
    const kind = scalar("kind") || "all";
    const start = scalar("start"),
      end = scalar("end"),
      billingType = scalar("billingType");
    const validDate = (date: string) =>
      !date ||
      (/^\d{4}-\d{2}-\d{2}$/.test(date) &&
        !Number.isNaN(Date.parse(date)) &&
        new Date(date).toISOString().slice(0, 10) === date);
    if (
      !["created", "due", "payment"].includes(dateField) ||
      !(status === "all" || Object.hasOwn(SALES_STATUSES, status)) ||
      !["all", "subscription", "credits"].includes(kind) ||
      !["", "PIX", "BOLETO", "CREDIT_CARD", "UNDEFINED"].includes(
        billingType,
      ) ||
      !validDate(start) ||
      !validDate(end) ||
      (start && end && start > end)
    ) {
      res
        .status(400)
        .json({
          error: "Filtros inválidos. Confira as datas e o período informado.",
        });
      return;
    }
    const filters = {
      start,
      end,
      dateField,
      status,
      kind,
      billingType,
      search: scalar("search"),
    } as SalesFilters;
    try {
      const credentials = await dependencies.getCredentials();
      if (!credentials.apiKey) {
        res
          .status(503)
          .json({
            error:
              "Configure a integração Asaas em Configurações para consultar as vendas.",
          });
        return;
      }
      const { artists, subscriptions, plans } = await dependencies.getLinks();
      const byArtist = new Map(artists.map((a) => [String(a.id), a]));
      const bySubscription = new Map(
        subscriptions
          .filter((s) => s.asaasSubscriptionId)
          .map((s) => [s.asaasSubscriptionId!, s]),
      );
      const byPayment = new Map(
        subscriptions
          .filter((s) => s.asaasPaymentId)
          .map((s) => [s.asaasPaymentId!, s]),
      );
      const planLabels = new Map(plans.map((p) => [p.nome, p.label]));
      const params = new URLSearchParams({ limit: "100" });
      const dateParam =
        dateField === "due"
          ? "dueDate"
          : dateField === "payment"
            ? "paymentDate"
            : "dateCreated";
      if (start) params.set(`${dateParam}[ge]`, start);
      if (end) params.set(`${dateParam}[le]`, end);
      if (billingType) params.set("billingType", billingType);
      const rows: Sale[] = [];
      const seen = new Set<string>();
      const deadline = Date.now() + 55_000;
      for (let offset = 0; ; offset += 100) {
        if (offset >= 10_000 || Date.now() > deadline)
          throw new Error(
            "O período possui muitas cobranças. Reduza o intervalo para obter um relatório completo.",
          );
        params.set("offset", String(offset));
        const response = await dependencies.fetchPayments(
          `${getAsaasBaseUrl(credentials.sandbox)}/v3/payments?${params}`,
          {
            headers: { access_token: credentials.apiKey },
            signal: AbortSignal.timeout(15_000),
          },
        );
        const page = await response.json();
        if (!response.ok || !Array.isArray(page.data))
          throw new Error(
            "Não foi possível consultar as cobranças no Asaas. Confira a integração e tente novamente.",
          );
        for (const payment of page.data) {
          if (seen.has(payment.id) || payment.deleted) continue;
          seen.add(payment.id);
          const local =
            byPayment.get(payment.id) ||
            bySubscription.get(payment.subscription);
          const ref = String(payment.externalReference || "");
          const creditRef = /^credits-(\d+)-(.+)$/.exec(ref);
          const planRef = /^(\d+)-(.+)$/.exec(ref);
          // Only include charges linked to this portal; never mix unrelated account sales.
          if (!local && !creditRef && !planRef) continue;
          const artistId = String(
            local?.artistId || creditRef?.[1] || planRef?.[1] || "",
          );
          const artist = byArtist.get(artistId);
          if (!artist && !local) continue;
          if (!local && !creditRef && (!planRef || !planLabels.has(planRef[2])))
            continue;
          const credit =
            !!creditRef || !!local?.planNome.startsWith("ai_credits:");
          const productId = credit
            ? creditRef?.[2] || local?.planNome.replace("ai_credits:", "")
            : local?.planNome || planRef?.[2];
          const normalized = salesStatus(payment.status);
          const refunds = Array.isArray(payment.refunds)
            ? payment.refunds
                .filter((r: any) => r.status === "DONE")
                .reduce((sum: number, r: any) => sum + Number(r.value || 0), 0)
            : 0;
          rows.push({
            id: payment.id,
            artistName: artist?.name || "Artista removido",
            artistEmail: artist?.email || "",
            kind: credit ? "credits" : "subscription",
            product:
              payment.description ||
              (credit
                ? `Créditos · ${productId}`
                : planLabels.get(productId || "") || productId || "Assinatura"),
            status: normalized,
            originalStatus: String(payment.status),
            amount: Number(payment.value || 0),
            netAmount:
              payment.netValue == null ? null : Number(payment.netValue),
            refundedAmount:
              refunds ||
              (normalized === "refunded" ? Number(payment.value || 0) : 0),
            billingType: payment.billingType || "UNDEFINED",
            createdAt: payment.dateCreated || null,
            dueDate: payment.dueDate || null,
            paymentDate:
              payment.paymentDate || payment.clientPaymentDate || null,
            invoiceUrl: /^https?:\/\//.test(payment.invoiceUrl || "")
              ? payment.invoiceUrl
              : null,
          });
        }
        if (!page.hasMore) break;
        if (!page.data.length)
          throw new Error(
            "O Asaas retornou uma paginação incompleta. Tente novamente.",
          );
      }
      const filtered = filterSales(rows, filters).sort(
        (a, b) =>
          (b.createdAt || "").localeCompare(a.createdAt || "") ||
          a.id.localeCompare(b.id),
      );
      res.json({
        rows: filtered,
        summary: summarizeSales(filtered),
        total: filtered.length,
        sandbox: credentials.sandbox,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Admin sales query failed:", error);
      res
        .status(502)
        .json({
          error:
            error instanceof Error
              ? error.message
              : "Erro ao consultar vendas.",
        });
    }
  });
  return router;
}
export default createAdminSalesRouter();
