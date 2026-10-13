export const SALES_STATUSES = {
  received: "Recebidos",
  confirmed: "Confirmados",
  pending: "Pendentes",
  overdue: "Vencidos",
  refunded: "Estornados",
  other: "Outros",
} as const;
export type SalesStatus = keyof typeof SALES_STATUSES;
export interface Sale {
  id: string;
  artistName: string;
  artistEmail: string;
  product: string;
  kind: "subscription" | "credits";
  status: SalesStatus;
  originalStatus: string;
  amount: number;
  netAmount: number | null;
  refundedAmount: number;
  billingType: string;
  createdAt: string | null;
  dueDate: string | null;
  paymentDate: string | null;
  invoiceUrl: string | null;
}
export interface SalesFilters {
  start: string;
  end: string;
  dateField: "created" | "due" | "payment";
  status: SalesStatus | "all";
  kind: "all" | Sale["kind"];
  billingType: string;
  search: string;
}
export function salesStatus(status: string): SalesStatus {
  if (["RECEIVED", "RECEIVED_IN_CASH"].includes(status)) return "received";
  if (status === "CONFIRMED") return "confirmed";
  if (status === "PENDING") return "pending";
  if (status === "OVERDUE") return "overdue";
  if (status === "REFUNDED") return "refunded";
  return "other";
}
export function matchesSalesStatus(
  row: Sale,
  status: SalesStatus | "all",
): boolean {
  return (
    status === "all" ||
    row.status === status ||
    (status === "refunded" && row.refundedAmount > 0)
  );
}
export function filterSales(rows: Sale[], f: SalesFilters): Sale[] {
  const query = f.search.trim().toLocaleLowerCase("pt-BR");
  return rows.filter((row) => {
    const date = (
      f.dateField === "due"
        ? row.dueDate
        : f.dateField === "payment"
          ? row.paymentDate
          : row.createdAt
    )?.slice(0, 10);
    return (
      (!(f.start || f.end) ||
        (!!date &&
          (!f.start || date >= f.start) &&
          (!f.end || date <= f.end))) &&
      matchesSalesStatus(row, f.status) &&
      (f.kind === "all" || row.kind === f.kind) &&
      (!f.billingType || row.billingType === f.billingType) &&
      (!query ||
        [row.artistName, row.artistEmail, row.product, row.id].some((v) =>
          v.toLocaleLowerCase("pt-BR").includes(query),
        ))
    );
  });
}
export function summarizeSales(rows: Sale[]) {
  const result = Object.fromEntries(
    Object.keys(SALES_STATUSES).map((key) => [key, { count: 0, amount: 0 }]),
  ) as Record<SalesStatus, { count: number; amount: number }>;
  for (const row of rows) {
    result[row.status].count++;
    result[row.status].amount += Math.round(
      (row.status === "refunded" ? row.refundedAmount : row.amount) * 100,
    );
    if (row.status !== "refunded" && row.refundedAmount > 0) {
      result.refunded.count++;
      result.refunded.amount += Math.round(row.refundedAmount * 100);
    }
  }
  for (const group of Object.values(result)) group.amount /= 100;
  return result;
}
export function salesCsv(rows: Sale[]): string {
  const cell = (v: unknown) => {
    let value = String(v ?? "");
    if (/^[\s]*[=+@-]/.test(value)) value = "'" + value;
    return '"' + value.replace(/"/g, '""') + '"';
  };
  const money = (v: number | null) =>
    v === null ? "" : v.toFixed(2).replace(".", ",");
  const header = [
    "Cobrança",
    "Artista",
    "E-mail",
    "Tipo",
    "Produto",
    "Status",
    "Status Asaas",
    "Valor bruto (R$)",
    "Valor líquido (R$)",
    "Estornado (R$)",
    "Forma de pagamento",
    "Criação",
    "Vencimento",
    "Pagamento",
    "Link da cobrança",
  ];
  return (
    "\ufeff" +
    [
      header,
      ...rows.map((r) => [
        r.id,
        r.artistName,
        r.artistEmail,
        r.kind === "credits" ? "Créditos" : "Assinatura",
        r.product,
        SALES_STATUSES[r.status],
        r.originalStatus,
        money(r.amount),
        money(r.netAmount),
        money(r.refundedAmount),
        r.billingType,
        r.createdAt,
        r.dueDate,
        r.paymentDate,
        r.invoiceUrl,
      ]),
    ]
      .map((row) => row.map(cell).join(";"))
      .join("\r\n")
  );
}
