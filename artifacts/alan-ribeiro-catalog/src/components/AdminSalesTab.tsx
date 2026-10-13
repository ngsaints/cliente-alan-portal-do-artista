import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Download,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import {
  SALES_STATUSES,
  salesCsv,
  matchesSalesStatus,
  type Sale,
  type SalesFilters,
  type SalesStatus,
} from "../../../../lib/api-zod/src/sales";

const dateString = (date: Date) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(
    date,
  );
const today = () => dateString(new Date());
function initialFilters(): SalesFilters {
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return {
    start: dateString(start),
    end: today(),
    dateField: "created",
    status: "all",
    kind: "all",
    billingType: "",
    search: "",
  };
}
const currency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const displayDate = (value: string | null) =>
  value ? value.slice(0, 10).split("-").reverse().join("/") : "—";
const billingLabels: Record<string, string> = {
  PIX: "Pix",
  BOLETO: "Boleto",
  CREDIT_CARD: "Cartão",
  UNDEFINED: "Não definida",
};
const colors: Record<SalesStatus, string> = {
  received: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  confirmed: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  pending: "text-primary bg-primary/10 border-primary/20",
  overdue: "text-red-400 bg-red-500/10 border-red-500/20",
  refunded: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  other: "text-muted-foreground bg-muted border-border",
};
interface SalesResponse {
  rows: Sale[];
  summary: Record<SalesStatus, { count: number; amount: number }>;
  total: number;
  sandbox: boolean;
  updatedAt: string;
}

export function AdminSalesTab() {
  const [filters, setFilters] = useState(initialFilters);
  const [applied, setApplied] = useState(filters);
  const [data, setData] = useState<SalesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [page, setPage] = useState(1);
  const [validation, setValidation] = useState("");
  const requestQuery = new URLSearchParams({
    ...applied,
    status: "all",
  }).toString();
  useEffect(() => setPage(1), [applied.status]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    setPage(1);
    fetch(`/api/admin/sales?${requestQuery}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (res) => {
        const result = await res.json();
        if (!res.ok)
          throw new Error(
            result.error || "Não foi possível carregar as vendas.",
          );
        return result;
      })
      .then(setData)
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [requestQuery, revision]);
  const rows = useMemo(
    () =>
      data?.rows.filter((row) => matchesSalesStatus(row, applied.status)) || [],
    [data, applied.status],
  );
  const pages = Math.max(1, Math.ceil(rows.length / 25));
  const change = <K extends keyof SalesFilters>(
    key: K,
    value: SalesFilters[K],
  ) => setFilters((current) => ({ ...current, [key]: value }));
  const apply = () => {
    if (filters.start && filters.end && filters.start > filters.end) {
      setValidation("A data inicial deve ser anterior ou igual à data final.");
      return;
    }
    setValidation("");
    setApplied({ ...filters });
  };
  const quickPeriod = (period: string) => {
    const end = today();
    const start =
      period === "today"
        ? end
        : period === "month"
          ? end.slice(0, 7) + "-01"
          : period === "all"
            ? ""
            : initialFilters().start;
    setFilters((current) => ({
      ...current,
      start,
      end: period === "all" ? "" : end,
    }));
  };
  const exportCsv = () => {
    const url = URL.createObjectURL(
      new Blob([salesCsv(rows)], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `vendas-portal-${applied.start || "inicio"}-${applied.end || today()}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const inputClass =
    "w-full bg-input border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary [color-scheme:dark]";
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            Vendas e cobranças
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe as assinaturas e os pacotes de créditos vendidos no
            Portal.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => setRevision((r) => r + 1)}
            className="px-4 py-2.5 border border-border rounded-xl text-sm flex items-center gap-2 hover:border-primary disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={loading || !rows.length || !!error}
            className="px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
        className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground mr-1">
            Período rápido
          </span>
          {[
            ["today", "Hoje"],
            ["month", "Este mês"],
            ["30", "Últimos 30 dias"],
            ["all", "Todo o histórico"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => quickPeriod(value)}
              className="px-3 py-1.5 rounded-lg border border-border text-xs hover:text-primary hover:border-primary"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="text-xs font-medium space-y-2">
            <span>Filtrar período por</span>
            <select
              aria-label="Filtrar período por"
              value={filters.dateField}
              onChange={(e) =>
                change("dateField", e.target.value as SalesFilters["dateField"])
              }
              className={inputClass}
            >
              <option value="created">Data de criação</option>
              <option value="due">Vencimento</option>
              <option value="payment">Pagamento</option>
            </select>
          </label>
          <label className="text-xs font-medium space-y-2">
            <span>Data inicial</span>
            <input
              type="date"
              aria-label="Data inicial"
              value={filters.start}
              onChange={(e) => change("start", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="text-xs font-medium space-y-2">
            <span>Data final</span>
            <input
              type="date"
              aria-label="Data final"
              value={filters.end}
              onChange={(e) => change("end", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="text-xs font-medium space-y-2">
            <span>Tipo de venda</span>
            <select
              aria-label="Tipo de venda"
              value={filters.kind}
              onChange={(e) =>
                change("kind", e.target.value as SalesFilters["kind"])
              }
              className={inputClass}
            >
              <option value="all">Assinaturas e créditos</option>
              <option value="subscription">Assinaturas</option>
              <option value="credits">Pacotes de créditos</option>
            </select>
          </label>
          <label className="text-xs font-medium space-y-2">
            <span>Status</span>
            <select
              aria-label="Status"
              value={filters.status}
              onChange={(e) =>
                change("status", e.target.value as SalesFilters["status"])
              }
              className={inputClass}
            >
              <option value="all">Todos os status</option>
              {Object.entries(SALES_STATUSES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium space-y-2">
            <span>Forma de pagamento</span>
            <select
              aria-label="Forma de pagamento"
              value={filters.billingType}
              onChange={(e) => change("billingType", e.target.value)}
              className={inputClass}
            >
              <option value="">Todas as formas</option>
              {Object.entries(billingLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium space-y-2">
            <span>Buscar artista ou cobrança</span>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <input
                aria-label="Buscar artista ou cobrança"
                value={filters.search}
                onChange={(e) => change("search", e.target.value)}
                placeholder="Nome, e-mail, produto ou ID"
                className={`${inputClass} pl-9`}
              />
            </div>
          </label>
          <div className="flex items-end">
            <button
              disabled={loading}
              type="submit"
              className="w-full bg-primary text-primary-foreground font-bold rounded-xl py-2.5 text-sm disabled:opacity-50"
            >
              Aplicar filtros
            </button>
          </div>
        </div>
        {validation && (
          <p role="alert" className="text-sm text-red-400">
            {validation}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          O filtro por pagamento considera apenas cobranças com data de
          pagamento. Os cartões resumem o período e os demais filtros; selecione
          um status para ver sua lista.
        </p>
      </form>
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="text-sm">{error}</p>
            <button
              type="button"
              onClick={() => setRevision((r) => r + 1)}
              className="text-xs underline mt-2"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}
      {data?.sandbox && (
        <div className="text-sm text-primary bg-primary/10 border border-primary/20 rounded-xl p-3">
          Ambiente de testes do Asaas. Estas cobranças não representam vendas em
          produção.
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {(Object.keys(SALES_STATUSES) as SalesStatus[])
          .filter((s) => s !== "other")
          .map((status) => (
            <button
              type="button"
              key={status}
              disabled={loading || !data}
              onClick={() => {
                const next = {
                  ...applied,
                  status: applied.status === status ? ("all" as const) : status,
                };
                setFilters(next);
                setApplied(next);
              }}
              className={`text-left bg-card border rounded-2xl p-4 transition-colors ${applied.status === status ? "border-primary ring-1 ring-primary/20" : "border-border hover:border-primary/50"}`}
            >
              <span
                className={`inline-block text-xs rounded-full px-2 py-1 border ${colors[status]}`}
              >
                {SALES_STATUSES[status]}
              </span>
              <div className="text-xl sm:text-2xl font-bold mt-3">
                {loading || !data ? "—" : currency(data.summary[status].amount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {data && !loading
                  ? `${data.summary[status].count} cobrança(s)`
                  : "Aguardando consulta"}
              </p>
            </button>
          ))}
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-6 flex flex-wrap items-center justify-between gap-2 border-b border-border">
          <div>
            <h3 className="font-semibold">Lista de cobranças</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {rows.length} resultado(s) · CSV inclui todas as páginas
            </p>
          </div>
          {data && (
            <span className="text-xs text-muted-foreground">
              Atualizado às{" "}
              {new Date(data.updatedAt).toLocaleTimeString("pt-BR", {
                timeZone: "America/Sao_Paulo",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
        {loading ? (
          <div
            role="status"
            className="p-12 flex justify-center items-center gap-2 text-muted-foreground"
          >
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            Consultando cobranças…
          </div>
        ) : !rows.length ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            {error
              ? "A consulta não foi concluída."
              : "Nenhuma cobrança encontrada para os filtros selecionados."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-background/40 text-xs text-muted-foreground">
                <tr>
                  {[
                    "Artista / cobrança",
                    "Produto",
                    "Status",
                    "Valor",
                    "Pagamento",
                    "Criação",
                    "Vencimento",
                    "Pago em",
                    "",
                  ].map((title, i) => (
                    <th key={i} className="px-4 py-3 text-left font-medium">
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.slice((page - 1) * 25, page * 25).map((row) => (
                  <tr key={row.id} className="hover:bg-background/30">
                    <td className="px-4 py-4">
                      <p className="font-medium">{row.artistName}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.artistEmail}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-1">
                        {row.id}
                      </p>
                    </td>
                    <td className="px-4 py-4 max-w-[240px]">
                      <span className="text-[10px] uppercase tracking-wider text-primary">
                        {row.kind === "credits" ? "Créditos" : "Assinatura"}
                      </span>
                      <p className="mt-1">{row.product}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        title={row.originalStatus}
                        className={`text-xs whitespace-nowrap border rounded-full px-2 py-1 ${colors[row.status]}`}
                      >
                        {SALES_STATUSES[row.status]}
                      </span>
                      {row.status === "other" && (
                        <p className="text-[10px] text-muted-foreground mt-2">
                          {row.originalStatus}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap font-semibold">
                      {currency(row.amount)}
                      {row.refundedAmount > 0 && (
                        <p className="text-[10px] text-violet-400 font-normal">
                          Estorno: {currency(row.refundedAmount)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {billingLabels[row.billingType] || row.billingType}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {displayDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {displayDate(row.dueDate)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {displayDate(row.paymentDate)}
                    </td>
                    <td className="px-4 py-4">
                      {row.invoiceUrl && (
                        <a
                          href={row.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Abrir cobrança ${row.id}`}
                          className="inline-flex text-primary hover:underline items-center gap-1 text-xs"
                        >
                          Abrir
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && rows.length > 0 && (
          <div className="border-t border-border p-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Página {page} de {pages}
            </span>
            <div className="flex gap-2">
              <button
                aria-label="Página anterior"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-2 border border-border rounded-lg disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                aria-label="Próxima página"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="p-2 border border-border rounded-lg disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Valores brutos das cobranças; estornos incluem devoluções parciais
        concluídas. Confirmados aguardam compensação; recebidos já foram
        compensados ou registrados como recebidos em dinheiro. Outros inclui
        cancelamentos, análise e estornos em processamento. Não inclui
        liberações gratuitas de planos ou créditos.
      </p>
    </div>
  );
}
