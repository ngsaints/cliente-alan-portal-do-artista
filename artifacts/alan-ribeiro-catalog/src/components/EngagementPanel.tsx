import { useEffect, useMemo, useState } from "react";
import { 
  ChevronLeft, ChevronRight, RefreshCw, Search, Users, Activity, 
  AlertTriangle, Clock, Music, Eye, Share2, CheckCircle, XCircle, 
  X, Sparkles 
} from "lucide-react";

type Row = {
  id: number;
  name: string;
  songs: number;
  photo: boolean;
  profile: boolean;
  shares: number;
  views: number;
  last_active_at: string | null;
  status: string;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
const FILTERS = [
  { id: "Todos", label: "Todos" },
  { id: "Ativo", label: "Ativos" },
  { id: "Inativo", label: "Inativos" },
  { id: "Sem histórico", label: "Sem Histórico" },
  { id: "Sem músicas", label: "Sem Músicas" },
  { id: "Perfil pendente", label: "Perfil Pendente" },
  { id: "Atenção: plano pago", label: "Em Atenção" },
] as const;

function statusBadge(status: string) {
  if (status === "Ativo") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Ativo
      </span>
    );
  }
  if (status === "Inativo") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        Inativo
      </span>
    );
  }
  if (status.startsWith("Atenção")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
        <AlertTriangle className="w-3 h-3 text-rose-400" />
        Atenção (30d+)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-500/15 text-zinc-400 border border-zinc-500/30">
      <Clock className="w-3 h-3 text-zinc-400" />
      Sem histórico
    </span>
  );
}

function formatWhen(value: string | null) {
  if (!value) return "Sem registro";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Sem registro";
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  let relative = "";
  if (diffHours < 1) {
    relative = "Agora há pouco";
  } else if (diffHours < 24) {
    relative = `Há ${diffHours}h`;
  } else if (diffDays === 1) {
    relative = "Ontem";
  } else if (diffDays < 30) {
    relative = `Há ${diffDays} dias`;
  } else {
    relative = `Há ${Math.floor(diffDays / 30)} mês(es)`;
  }

  const dateStr = d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
  const timeStr = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${dateStr} ${timeStr} (${relative})`;
}

function getInitials(name: string) {
  if (!name) return "A";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function EngagementPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("Todos");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/engagement", { credentials: "include" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setError("Não foi possível carregar o histórico de atividade. Tente atualizar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filter, search, pageSize]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchFilter =
        filter === "Todos" ||
        (filter === "Sem músicas"
          ? r.songs === 0
          : filter === "Perfil pendente"
          ? !r.photo || !r.profile
          : r.status === filter);
      const matchSearch = !q || r.name.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [rows, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const from = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, filtered.length);

  const counts = useMemo(() => {
    const tally = { Ativo: 0, Inativo: 0, "Sem histórico": 0, Atenção: 0, total: rows.length };
    for (const r of rows) {
      if (r.status === "Ativo") tally.Ativo += 1;
      else if (r.status === "Inativo") tally.Inativo += 1;
      else if (r.status === "Sem histórico") tally["Sem histórico"] += 1;
      else tally.Atenção += 1;
    }
    return tally;
  }, [rows]);

  return (
    <div className="space-y-5">
      {/* Cards de Métricas e Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div 
          onClick={() => setFilter(filter === "Ativo" ? "Todos" : "Ativo")}
          className={`cursor-pointer transition-all p-4 rounded-2xl border bg-card/60 backdrop-blur-sm hover:border-emerald-500/40 ${
            filter === "Ativo" ? "ring-2 ring-emerald-500/50 border-emerald-500/50 bg-emerald-500/5" : "border-border"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Artistas Ativos</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-emerald-400">{counts.Ativo}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Atividade em até 14 dias</p>
        </div>

        <div 
          onClick={() => setFilter(filter === "Inativo" ? "Todos" : "Inativo")}
          className={`cursor-pointer transition-all p-4 rounded-2xl border bg-card/60 backdrop-blur-sm hover:border-amber-500/40 ${
            filter === "Inativo" ? "ring-2 ring-amber-500/50 border-amber-500/50 bg-amber-500/5" : "border-border"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Inativos</span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-amber-400">{counts.Inativo}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Mais de 14 dias sem uso</p>
        </div>

        <div 
          onClick={() => setFilter(filter === "Sem histórico" ? "Todos" : "Sem histórico")}
          className={`cursor-pointer transition-all p-4 rounded-2xl border bg-card/60 backdrop-blur-sm hover:border-zinc-500/40 ${
            filter === "Sem histórico" ? "ring-2 ring-zinc-500/50 border-zinc-500/50 bg-zinc-500/5" : "border-border"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Sem Histórico</span>
            <div className="w-7 h-7 rounded-xl bg-zinc-500/10 flex items-center justify-center text-zinc-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-foreground">{counts["Sem histórico"]}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Nunca registraram login</p>
        </div>

        <div 
          onClick={() => setFilter(filter === "Atenção: plano pago" ? "Todos" : "Atenção: plano pago")}
          className={`cursor-pointer transition-all p-4 rounded-2xl border bg-card/60 backdrop-blur-sm hover:border-rose-500/40 ${
            filter === "Atenção: plano pago" ? "ring-2 ring-rose-500/50 border-rose-500/50 bg-rose-500/5" : "border-border"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Atenção Prioritária</span>
            <div className="w-7 h-7 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-rose-400">{counts.Atenção}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Plano pago parado há 30d+</p>
        </div>
      </div>

      {/* Painel com Tabela e Paginação */}
      <section className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
        {/* Header do Painel */}
        <div className="p-4 sm:p-5 border-b border-border/80 bg-background/40 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold text-foreground">Acompanhamento & Histórico de Artistas</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
                  {filtered.length} filtrados
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Monitore a frequência de acesso, preenchimento de perfil, compartilhamentos e visitas ao portfólio.
              </p>
            </div>
            <button
              onClick={() => void load()}
              disabled={loading}
              className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-background border border-border hover:border-border/80 rounded-xl transition-all disabled:opacity-50"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
              <span>Atualizar</span>
            </button>
          </div>

          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            {/* Campo de Busca */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar artista por nome..."
                className="w-full pl-9 pr-9 py-2 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtro Dropdown */}
            <div className="flex items-center gap-2">
              <select
                aria-label="Filtrar acompanhamento"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-48"
              >
                {FILTERS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>

              {/* Seletor de Itens por Página */}
              <select
                aria-label="Itens por página"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-background border border-border rounded-xl px-2.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 shrink-0"
                title="Itens por página"
              >
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt} / pág
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabela de Resultados */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <RefreshCw className="w-7 h-7 animate-spin text-primary" />
            <p className="text-sm">Carregando acompanhamento dos artistas...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 text-sm">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p>{error}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead className="border-b border-border bg-background/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3">Artista</th>
                    <th className="text-left px-4 py-3">Última Atividade</th>
                    <th className="text-center px-4 py-3">Músicas</th>
                    <th className="text-left px-4 py-3">Perfil & Foto</th>
                    <th className="text-center px-4 py-3">Links Copiados</th>
                    <th className="text-center px-4 py-3">Visitas</th>
                    <th className="text-left px-4 py-3">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {pageRows.map((r) => (
                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Artista */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {getInitials(r.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate max-w-[200px]" title={r.name}>
                              {r.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">ID #{r.id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Última Atividade */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {formatWhen(r.last_active_at)}
                      </td>

                      {/* Músicas */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          r.songs > 0 ? "bg-primary/10 text-primary" : "bg-zinc-500/10 text-zinc-500"
                        }`}>
                          <Music className="w-3 h-3" />
                          {r.songs}
                        </span>
                      </td>

                      {/* Perfil & Foto */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                            r.photo ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-500/10 text-zinc-400"
                          }`}>
                            {r.photo ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            Foto
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                            r.profile ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                          }`}>
                            {r.profile ? "Completo" : "Pendente"}
                          </span>
                        </div>
                      </td>

                      {/* Links Compartilhados */}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Share2 className="w-3 h-3 text-muted-foreground/60" />
                          {r.shares}
                        </span>
                      </td>

                      {/* Visitas */}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Eye className="w-3 h-3 text-muted-foreground/60" />
                          {r.views}
                        </span>
                      </td>

                      {/* Situação */}
                      <td className="px-4 py-3">
                        {statusBadge(r.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">Nenhum artista encontrado com os filtros atuais.</p>
                  <p className="text-xs mt-1">Experimente limpar a busca ou selecionar outro filtro.</p>
                </div>
              )}
            </div>

            {/* Controles de Paginação */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 border-t border-border bg-background/30 text-xs text-muted-foreground">
              <div>
                Mostrando <strong className="text-foreground">{from}</strong> a <strong className="text-foreground">{to}</strong> de{" "}
                <strong className="text-foreground">{filtered.length}</strong> artistas
              </div>

              <div className="flex items-center gap-1.5 self-center sm:self-auto">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(1)}
                  className="px-2 py-1 rounded-lg border border-border hover:bg-white/5 disabled:opacity-25 transition-colors"
                  title="Primeira página"
                >
                  «
                </button>
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-border hover:bg-white/5 disabled:opacity-25 transition-colors"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Páginas numéricas */}
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      const showEllipsis = prev && p - prev > 1;
                      return (
                        <div key={p} className="flex items-center">
                          {showEllipsis && <span className="px-1 text-muted-foreground">…</span>}
                          <button
                            type="button"
                            onClick={() => setPage(p)}
                            className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-semibold transition-all ${
                              p === currentPage
                                ? "bg-primary text-black font-bold shadow-sm"
                                : "hover:bg-white/5 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {p}
                          </button>
                        </div>
                      );
                    })}
                </div>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-border hover:bg-white/5 disabled:opacity-25 transition-colors"
                  title="Próxima página"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(totalPages)}
                  className="px-2 py-1 rounded-lg border border-border hover:bg-white/5 disabled:opacity-25 transition-colors"
                  title="Última página"
                >
                  »
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
