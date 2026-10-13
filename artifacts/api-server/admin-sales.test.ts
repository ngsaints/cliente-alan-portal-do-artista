import assert from "node:assert/strict";
import express from "express";
import { createAdminSalesRouter } from "./src/routes/admin-sales";
import {
  salesCsv,
  summarizeSales,
  filterSales,
  salesStatus,
  type Sale,
  type SalesFilters,
} from "@workspace/api-zod";
const filters: SalesFilters = {
  start: "",
  end: "",
  dateField: "created",
  status: "all",
  kind: "all",
  billingType: "",
  search: "",
};
const sale = (extra: Partial<Sale> = {}): Sale => ({
  id: "p1",
  artistName: "Ana",
  artistEmail: "ana@example.com",
  product: "Plano Pro",
  kind: "subscription",
  status: "received",
  originalStatus: "RECEIVED",
  amount: 19.9,
  netAmount: 18,
  refundedAmount: 0,
  billingType: "PIX",
  createdAt: "2026-10-01",
  dueDate: "2026-10-05",
  paymentDate: "2026-10-04",
  invoiceUrl: null,
  ...extra,
});
assert.equal(salesStatus("CONFIRMED"), "confirmed");
assert.equal(salesStatus("REFUND_REQUESTED"), "other");
assert.equal(salesStatus("RECEIVED_IN_CASH"), "received");
assert.equal(
  filterSales([sale()], {
    ...filters,
    dateField: "due",
    start: "2026-10-05",
    end: "2026-10-05",
  }).length,
  1,
);
assert.equal(
  filterSales([sale({ paymentDate: null })], {
    ...filters,
    dateField: "payment",
    start: "2026-10-01",
  }).length,
  0,
);
assert.equal(
  filterSales([sale()], { ...filters, search: "ANA@", kind: "credits" }).length,
  0,
);
assert.equal(
  filterSales([sale({ refundedAmount: 5 })], { ...filters, status: "refunded" })
    .length,
  1,
);
assert.equal(summarizeSales([sale(), sale()]).received.amount, 39.8);
assert.equal(summarizeSales([sale({ refundedAmount: 5 })]).refunded.amount, 5);
const csv = salesCsv([
  sale({ artistName: '=HYPERLINK("bad")', product: 'A;B\n"C"' }),
]);
assert.ok(csv.startsWith("\ufeff"));
assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));
assert.ok(csv.includes('"A;B\n""C"""'));
assert.ok(csv.includes('"19,90"'));
let calls: string[] = [],
  configured = true,
  fail = false;
const payment = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  externalReference: "1-pro",
  status: "RECEIVED",
  billingType: "PIX",
  value: 49.9,
  netValue: 47,
  dateCreated: "2026-10-01",
  dueDate: "2026-10-05",
  paymentDate: "2026-10-04",
  ...extra,
});
const app = express();
app.use((req, _res, next) => {
  req.session = { logado: req.headers["x-test-admin"] === "yes" } as any;
  next();
});
app.use(
  createAdminSalesRouter({
    getCredentials: async () => ({
      apiKey: configured ? "test" : "",
      sandbox: true,
      webhookToken: "",
      portalUrl: "https://portal.example",
    }),
    getLinks: async () => ({
      artists: [{ id: 1, name: "Ana", email: "ana@example.com" }],
      plans: [{ nome: "pro", label: "Pro" }],
      subscriptions: [
        {
          artistId: "1",
          planNome: "pro",
          asaasSubscriptionId: "sub1",
          asaasPaymentId: "old",
        },
      ] as any,
    }),
    fetchPayments: (async (url: any) => {
      calls.push(String(url));
      if (fail)
        return new Response(JSON.stringify({ errors: [] }), { status: 401 });
      const second = new URL(url).searchParams.get("offset") === "100";
      return new Response(
        JSON.stringify({
          hasMore: !second,
          data: second
            ? [
                payment("p1"),
                payment("p3", {
                  subscription: "sub1",
                  externalReference: "",
                  status: "CONFIRMED",
                }),
                payment("p4", { externalReference: "1-unknown" }),
              ]
            : [
                payment("p1"),
                payment("p2", {
                  externalReference: "credits-1-pack_5",
                  status: "REFUNDED",
                  refunds: [{ status: "DONE", value: 20 }],
                }),
                payment("unrelated", { externalReference: "other" }),
              ],
        }),
      );
    }) as typeof fetch,
  }),
);
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${(server.address() as any).port}/admin/sales`;
const get = (query = "") =>
  fetch(base + query, { headers: { "x-test-admin": "yes" } });
try {
  assert.equal((await fetch(base)).status, 401);
  assert.equal(calls.length, 0);
  for (const query of [
    "?start=2026-02-31",
    "?start=2026-10-10&end=2026-10-01",
    "?dateField=bad",
    "?status=bad",
    "?billingType=bad",
  ])
    assert.equal((await get(query)).status, 400);
  assert.equal(calls.length, 0);
  const response = await get(
    "?start=2026-10-01&end=2026-10-05&dateField=payment",
  );
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(
    result.total,
    3,
    "Include all pages, deduplicate charges, exclude unrelated sales",
  );
  assert.equal(result.summary.confirmed.count, 1);
  assert.equal(result.summary.refunded.amount, 20);
  assert.equal(result.rows.find((r: Sale) => r.id === "p2").kind, "credits");
  assert.ok(
    calls.some((url) => new URL(url).searchParams.get("offset") === "100"),
  );
  assert.equal(
    new URL(calls[0]).searchParams.get("paymentDate[ge]"),
    "2026-10-01",
  );
  configured = false;
  assert.equal((await get()).status, 503);
  configured = true;
  fail = true;
  assert.equal((await get()).status, 502);
  console.log(
    "PASS: authorization, date validation, pagination, recurring subscriptions, credits, deduplication, statuses, partial refunds, filters, CSV and integration errors",
  );
} finally {
  server.close();
}
