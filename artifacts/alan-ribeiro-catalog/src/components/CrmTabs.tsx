import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, X, Pencil, Trash2, Users, Phone, Mail, Wallet, DollarSign, TrendingUpDown, CheckCheck, Send, HelpCircle, Calendar, ShieldCheck } from "lucide-react";
import { FinanceiroSpreadsheet } from "./FinanceiroSpreadsheet";
import { LiberacoesTab } from "./LiberacoesTab";

// ─── CONTATOS ──────────────────────────────────────────────────────────────────

const CONTATO_CATEGORIAS = ["Artista", "Produtor", "Editor", "Empresário", "Gravadora", "Outro"] as const;

export function ContatosTab({ artistId }: { artistId: number }) {
  const [contatos, setContatos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("Outro");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [anotacoes, setAnotacoes] = useState("");

  const resetForm = useCallback(() => {
    setNome(""); setCategoria("Outro"); setTelefone(""); setEmail(""); setAnotacoes("");
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/contatos", { credentials: "include" });
      const data = await res.json();
      if (Array.isArray(data)) setContatos(data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!nome) return;
    const payload = { nome, categoria, telefone, email, anotacoes };
    const url = editing ? `/api/contatos/${(editing as any).id}` : "/api/contatos";
    const method = editing ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
      if (res.ok) { setShowForm(false); setEditing(null); resetForm(); load(); }
    } catch {}
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir?")) return;
    await fetch(`/api/contatos/${id}`, { method: "DELETE", credentials: "include" });
    setContatos(p => p.filter(c => c.id !== id));
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setNome(c.nome || ""); setCategoria(c.categoria || "Outro"); setTelefone(c.telefone || ""); setEmail(c.email || ""); setAnotacoes(c.anotacoes || "");
    setShowForm(true);
  };

  const openNew = () => { setEditing(null); resetForm(); setShowForm(true); };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-foreground">Contatos ({contatos.length})</h3>
        <button onClick={openNew} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shrink-0">
          <Plus className="w-3 h-3" /> Novo
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border/40 rounded-xl p-3 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-foreground text-xs sm:text-sm">{editing ? "Editar" : "Novo"} Contato</h4>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-0.5">Nome *</label>
              <input value={nome} onChange={e => setNome(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-0.5">Categoria</label>
              <select value={categoria} onChange={e => setCategoria(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground">
                {CONTATO_CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-0.5">Telefone</label>
              <input value={telefone} onChange={e => setTelefone(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-0.5">Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-muted-foreground mb-0.5">Anotações</label>
              <textarea value={anotacoes} onChange={e => setAnotacoes(e.target.value)} rows={2} className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg text-muted-foreground text-xs">Cancelar</button>
            <button onClick={handleSave} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90">{editing ? "Salvar" : "Adicionar"}</button>
          </div>
        </div>
      )}

      {contatos.length === 0 ? (
        <div className="text-center py-8 bg-card border border-dashed border-border/40 rounded-xl">
          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-xs">Nenhum contato cadastrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {contatos.map(c => (
            <div key={c.id} className="bg-card border border-border/40 rounded-xl p-3 hover:border-primary/30 transition-colors group">
              <div className="flex items-start justify-between gap-1 mb-1.5">
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-foreground text-sm truncate">{c.nome}</h4>
                  <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary mt-0.5">{c.categoria}</span>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => openEdit(c)} className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10"><Pencil className="w-3 h-3" /></button>
                  <button onClick={() => handleDelete(c.id)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
              {c.telefone && <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate"><Phone className="w-3 h-3 shrink-0" />{c.telefone}</p>}
              {c.email && <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate"><Mail className="w-3 h-3 shrink-0" />{c.email}</p>}
              {c.anotacoes && <p className="text-[11px] text-muted-foreground mt-1.5 italic line-clamp-2">{c.anotacoes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CUSTOS ────────────────────────────────────────────────────────────────────

const CUSTO_CATEGORIAS = ["Guia", "Distribuidora", "Publicidade", "Produção", "Outros"] as const;

export function CustosTab({ artistId }: { artistId: number }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [categoria, setCategoria] = useState("Outros");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");

  const resetForm = useCallback(() => { setCategoria("Outros"); setDescricao(""); setValor(""); }, []);

  const load = useCallback(async () => {
    try { setLoading(true); const r = await fetch("/api/custos", { credentials: "include" }); const d = await r.json(); if (Array.isArray(d)) setItems(d); } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!descricao || !valor) return;
    try {
      const r = await fetch("/api/custos", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ categoria, descricao, valor, data: new Date().toISOString().split("T")[0] }) });
      if (r.ok) { setShowForm(false); resetForm(); load(); }
    } catch {}
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir?")) return;
    await fetch(`/api/custos/${id}`, { method: "DELETE", credentials: "include" });
    setItems(p => p.filter(i => i.id !== id));
  };

  const total = items.reduce((acc, i) => acc + parseFloat(i.valor || "0"), 0);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div><h3 className="text-sm font-bold text-foreground">Gestão de Custos</h3><p className="text-[11px] text-muted-foreground">Total: <span className="text-red-400 font-bold">R$ {total.toFixed(2)}</span></p></div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shrink-0"><Plus className="w-3 h-3" /> Novo</button>
      </div>

      {showForm && (
        <div className="bg-card border border-border/40 rounded-xl p-3 sm:p-5 space-y-3">
          <div className="flex items-center justify-between"><h4 className="font-bold text-foreground text-xs sm:text-sm">Novo Custo</h4><button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div><label className="block text-[11px] font-medium text-muted-foreground mb-0.5">Categoria</label><select value={categoria} onChange={e => setCategoria(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground">{CUSTO_CATEGORIAS.map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label className="block text-[11px] font-medium text-muted-foreground mb-0.5">Descrição</label><input value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground" /></div>
            <div><label className="block text-[11px] font-medium text-muted-foreground mb-0.5">Valor (R$)</label><input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground" /></div>
          </div>
          <div className="flex gap-2 justify-end"><button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg text-muted-foreground text-xs">Cancelar</button><button onClick={handleAdd} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs">Adicionar</button></div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-8 bg-card border border-dashed border-border/40 rounded-xl"><Wallet className="w-8 h-8 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground text-xs">Nenhum custo registrado</p></div>
      ) : (
        <div className="space-y-1.5">
          {items.map(i => (
            <div key={i.id} className="flex items-center justify-between bg-card border border-border/40 rounded-lg p-2.5 group gap-2">
              <div className="flex-1 min-w-0"><div className="flex items-center gap-1.5 flex-wrap"><span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-400">{i.categoria}</span><span className="font-medium text-foreground truncate text-xs">{i.descricao}</span></div><p className="text-[10px] text-muted-foreground mt-0.5">{new Date(i.data || i.createdAt).toLocaleDateString("pt-BR")}</p></div>
              <div className="flex items-center gap-2 shrink-0"><span className="text-red-400 font-bold text-xs">- R$ {parseFloat(i.valor).toFixed(2)}</span><button onClick={() => handleDelete(i.id)} className="p-1 rounded text-muted-foreground sm:opacity-0 sm:group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-3 h-3" /></button></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── RECEITAS ──────────────────────────────────────────────────────────────────

const RECEITA_CATEGORIAS = ["Música Liberada", "Royalties", "Cachês", "Direitos", "Outros"] as const;

export function ReceitasTab({ artistId }: { artistId: number }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [categoria, setCategoria] = useState("Outros");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");

  const resetForm = useCallback(() => { setCategoria("Outros"); setDescricao(""); setValor(""); }, []);

  const load = useCallback(async () => {
    try { setLoading(true); const r = await fetch("/api/receitas", { credentials: "include" }); const d = await r.json(); if (Array.isArray(d)) setItems(d); } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!descricao || !valor) return;
    try {
      const r = await fetch("/api/receitas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ categoria, descricao, valor, data: new Date().toISOString().split("T")[0] }) });
      if (r.ok) { setShowForm(false); resetForm(); load(); }
    } catch {}
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir?")) return;
    await fetch(`/api/receitas/${id}`, { method: "DELETE", credentials: "include" });
    setItems(p => p.filter(i => i.id !== id));
  };

  const total = items.reduce((acc, i) => acc + parseFloat(i.valor || "0"), 0);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div><h3 className="text-sm font-bold text-foreground">Gestão de Receitas</h3><p className="text-[11px] text-muted-foreground">Total: <span className="text-green-400 font-bold">R$ {total.toFixed(2)}</span></p></div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shrink-0"><Plus className="w-3 h-3" /> Nova</button>
      </div>

      {showForm && (
        <div className="bg-card border border-border/40 rounded-xl p-3 sm:p-5 space-y-3">
          <div className="flex items-center justify-between"><h4 className="font-bold text-foreground text-xs sm:text-sm">Nova Receita</h4><button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div><label className="block text-[11px] font-medium text-muted-foreground mb-0.5">Categoria</label><select value={categoria} onChange={e => setCategoria(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground">{RECEITA_CATEGORIAS.map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label className="block text-[11px] font-medium text-muted-foreground mb-0.5">Descrição</label><input value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground" /></div>
            <div><label className="block text-[11px] font-medium text-muted-foreground mb-0.5">Valor (R$)</label><input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground" /></div>
          </div>
          <div className="flex gap-2 justify-end"><button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg text-muted-foreground text-xs">Cancelar</button><button onClick={handleAdd} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs">Adicionar</button></div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-8 bg-card border border-dashed border-border/40 rounded-xl"><DollarSign className="w-8 h-8 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground text-xs">Nenhuma receita registrada</p></div>
      ) : (
        <div className="space-y-1.5">
          {items.map(i => (
            <div key={i.id} className="flex items-center justify-between bg-card border border-border/40 rounded-lg p-2.5 group gap-2">
              <div className="flex-1 min-w-0"><div className="flex items-center gap-1.5 flex-wrap"><span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-400">{i.categoria}</span><span className="font-medium text-foreground truncate text-xs">{i.descricao}</span></div><p className="text-[10px] text-muted-foreground mt-0.5">{new Date(i.data || i.createdAt).toLocaleDateString("pt-BR")}</p></div>
              <div className="flex items-center gap-2 shrink-0"><span className="text-green-400 font-bold text-xs">+ R$ {parseFloat(i.valor).toFixed(2)}</span><button onClick={() => handleDelete(i.id)} className="p-1 rounded text-muted-foreground sm:opacity-0 sm:group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-3 h-3" /></button></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── FINANCEIRO ────────────────────────────────────────────────────────────────

export function FinanceiroTab({ artistId }: { artistId: number }) {
  const [data, setData] = useState<{ totalCustos: number; totalReceitas: number; lucroLiquido: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setLoading(true); const r = await fetch("/api/financeiro/resumo", { credentials: "include" }); setData(await r.json()); } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;

  const c = data?.totalCustos ?? 0, r = data?.totalReceitas ?? 0, l = data?.lucroLiquido ?? 0;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-foreground">Resumo Financeiro</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="bg-card border border-red-500/20 rounded-xl p-3 sm:p-5"><div className="flex items-center gap-2 mb-1.5"><Wallet className="w-4 h-4 text-red-400 shrink-0" /><span className="text-[11px] sm:text-xs text-muted-foreground">Total de Custos</span></div><p className="text-xl sm:text-2xl font-bold text-red-400">R$ {c.toFixed(2)}</p></div>
        <div className="bg-card border border-green-500/20 rounded-xl p-3 sm:p-5"><div className="flex items-center gap-2 mb-1.5"><DollarSign className="w-4 h-4 text-green-400 shrink-0" /><span className="text-[11px] sm:text-xs text-muted-foreground">Total de Receitas</span></div><p className="text-xl sm:text-2xl font-bold text-green-400">R$ {r.toFixed(2)}</p></div>
        <div className={`bg-card border rounded-xl p-3 sm:p-5 ${l>=0?"border-green-500/20":"border-red-500/20"}`}><div className="flex items-center gap-2 mb-1.5"><TrendingUpDown className={`w-4 h-4 shrink-0 ${l>=0?"text-green-400":"text-red-400"}`} /><span className="text-[11px] sm:text-xs text-muted-foreground">Lucro Líquido</span></div><p className={`text-xl sm:text-2xl font-bold ${l>=0?"text-green-400":"text-red-400"}`}>{l>=0?"+":""}R$ {l.toFixed(2)}</p></div>
      </div>
    </div>
  );
}

// ─── CALENDÁRIO ────────────────────────────────────────────────────────────────

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"] as const;

export function CalendarioTab({ artistId }: { artistId: number }) {
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [titulo, setTitulo] = useState("");
  const [desc, setDesc] = useState("");
  const [horaIni, setHoraIni] = useState("");
  const [horaFim, setHoraFim] = useState("");

  const resetForm = useCallback(() => { setTitulo(""); setDesc(""); setHoraIni(""); setHoraFim(""); }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const start = `${currentYear}-${String(currentMonth+1).padStart(2,"0")}-01`;
      const lastDay = new Date(currentYear, currentMonth+1, 0).getDate();
      const end = `${currentYear}-${String(currentMonth+1).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`;
      const r = await fetch(`/api/eventos?start=${start}&end=${end}`, { credentials: "include" });
      const d = await r.json();
      if (Array.isArray(d)) setEventos(d);
    } catch {} finally { setLoading(false); }
  }, [currentMonth, currentYear]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!titulo || !selectedDate) return;
    const payload = { titulo, descricao: desc, data: selectedDate, horarioInicial: horaIni, horarioFinal: horaFim };
    const url = editing ? `/api/eventos/${(editing as any).id}` : "/api/eventos";
    const method = editing ? "PUT" : "POST";
    try {
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
      if (r.ok) { setShowForm(false); setEditing(null); resetForm(); load(); }
    } catch {}
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir?")) return;
    await fetch(`/api/eventos/${id}`, { method: "DELETE", credentials: "include" });
    setEventos(p => p.filter(e => e.id !== id));
  };

  const openDateForm = (date: string) => { setEditing(null); resetForm(); setSelectedDate(date); setShowForm(true); };
  const openEditEvent = (e: any) => {
    setEditing(e);
    setTitulo(e.titulo || ""); setDesc(e.descricao || ""); setSelectedDate(e.data); setHoraIni(e.horarioInicial || ""); setHoraFim(e.horarioFinal || "");
    setShowForm(true);
  };

  const diasNoMes = new Date(currentYear, currentMonth+1, 0).getDate();
  const primeiroDiaSemana = new Date(currentYear, currentMonth, 1).getDay();
  const eventosMap: Record<string, any[]> = {};
  eventos.forEach(e => { const d = e.data; if (!eventosMap[d]) eventosMap[d] = []; eventosMap[d].push(e); });
  const prevMonth = () => { if (currentMonth===0) { setCurrentMonth(11); setCurrentYear(y=>y-1); } else setCurrentMonth(m=>m-1); };
  const nextMonth = () => { if (currentMonth===11) { setCurrentMonth(0); setCurrentYear(y=>y+1); } else setCurrentMonth(m=>m+1); };
  const eventosDoDia = eventosMap[selectedDate] || [];

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-foreground">Calendário</h3>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_1fr] gap-3">
        <div className="bg-card border border-border/40 rounded-xl p-3 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-primary/10 text-sm">◀</button>
            <h4 className="text-sm sm:text-base font-bold text-foreground">{MESES[currentMonth]} {currentYear}</h4>
            <button onClick={nextMonth} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-primary/10 text-sm">▶</button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1">
            {DIAS.map(d => <div key={d} className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {Array.from({length: primeiroDiaSemana}).map((_,i) => <div key={`e${i}`} />)}
            {Array.from({length: diasNoMes}).map((_,i)=>{
              const day=i+1;
              const ds=`${currentYear}-${String(currentMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const te=!!eventosMap[ds], sel=ds===selectedDate, td=ds===new Date().toISOString().split("T")[0];
              return <button key={day} onClick={()=>{setSelectedDate(ds); if(!te) openDateForm(ds);}}
                className={`relative aspect-square rounded-lg sm:rounded-xl flex items-center justify-center text-xs sm:text-sm transition-all ${
                  sel?"bg-primary text-primary-foreground font-bold ring-2 ring-primary":te?"bg-primary/20 text-foreground font-bold hover:bg-primary/30":td?"border border-primary/50 text-foreground font-medium":"text-muted-foreground hover:bg-primary/10 hover:text-foreground"}`}>
                {day}{te&&<span className="absolute bottom-0.5 sm:bottom-1 w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-primary"/>}
              </button>;
            })}
          </div>
        </div>
        <div className="bg-card border border-border/40 rounded-xl p-3 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h4 className="font-bold text-foreground text-xs sm:text-sm">{new Date(selectedDate+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})}</h4>
            <button onClick={()=>openDateForm(selectedDate)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shrink-0"><Plus className="w-3 h-3"/> Novo</button>
          </div>
          {eventosDoDia.length===0 ? <p className="text-xs text-muted-foreground text-center py-4">Nenhum evento neste dia.</p> : (
            <div className="space-y-1.5">
              {eventosDoDia.map(e => (
                <div key={e.id} className="flex items-center justify-between bg-background/50 border border-border/30 rounded-lg p-2.5 group gap-1">
                  <div className="flex-1 min-w-0"><h5 className="font-medium text-foreground truncate text-xs">{e.titulo}</h5>{e.descricao&&<p className="text-[11px] text-muted-foreground truncate">{e.descricao}</p>}{(e.horarioInicial||e.horarioFinal)&&<p className="text-[11px] text-muted-foreground mt-0.5">{e.horarioInicial}{e.horarioInicial&&e.horarioFinal?" - ":""}{e.horarioFinal}</p>}</div>
                  <div className="flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={()=>openEditEvent(e)} className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10"><Pencil className="w-3 h-3"/></button>
                    <button onClick={()=>handleDelete(e.id)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-3 h-3"/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-card border border-border/40 rounded-t-2xl sm:rounded-xl w-full max-w-md p-4 sm:p-5 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between"><h4 className="font-bold text-foreground text-xs sm:text-sm">{editing?"Editar":"Novo"} Evento</h4><button onClick={()=>{setShowForm(false);setEditing(null);}} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4"/></button></div>
            <div><label className="block text-[11px] font-medium text-muted-foreground mb-0.5">Título *</label><input value={titulo} onChange={e=>setTitulo(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground"/></div>
            <div><label className="block text-[11px] font-medium text-muted-foreground mb-0.5">Observação</label><textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={2} className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground"/></div>
            <div className="grid grid-cols-2 gap-2.5"><div><label className="block text-[11px] font-medium text-muted-foreground mb-0.5">Horário Inicial</label><input type="time" value={horaIni} onChange={e=>setHoraIni(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground"/></div><div><label className="block text-[11px] font-medium text-muted-foreground mb-0.5">Horário Final</label><input type="time" value={horaFim} onChange={e=>setHoraFim(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground"/></div></div>
            <div className="flex gap-2 justify-end"><button onClick={()=>{setShowForm(false);setEditing(null);}} className="px-3 py-1.5 rounded-lg text-muted-foreground text-xs">Cancelar</button><button onClick={handleSave} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs">{editing?"Salvar":"Adicionar"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AJUDA ─────────────────────────────────────────────────────────────────────

export function AjudaTab({ artistId }: { artistId: number }) {
  const [tipo, setTipo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const handleSend = async () => {
    if (!tipo || !mensagem) return;
    setSending(true);
    try {
      const r = await fetch("/api/ajuda", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ tipo, mensagem }) });
      if (r.ok) { setSent(true); setTipo(""); setMensagem(""); }
    } catch {} finally { setSending(false); }
  };

  const faq = [
    { q: "Como adicionar uma música?", a: "Vá até a aba Músicas, clique em 'Adicionar' e preencha os campos solicitados. O arquivo MP3 e a capa são os itens principais." },
    { q: "Como funciona o limite de músicas?", a: "Cada plano tem um limite de músicas. O plano gratuito permite 2 músicas. Para aumentar, faça upgrade na aba Plano." },
    { q: "Como registrar um custo ou receita?", a: "Na aba CRM > Financeiro, clique em 'Custo' ou 'Receita' e preencha a descrição e o valor. O sistema calcula o saldo automaticamente." },
    { q: "Como usar o calendário?", a: "Na aba CRM > Calendário, clique em qualquer data para adicionar um evento com título, horário e observações." },
    { q: "O que são liberações?", a: "Liberações são o controle de músicas que você enviou para outros artistas. Registre a data de envio e quando for liberada para não perder prazos." },
    { q: "Como funciona o upgrade de plano?", a: "Vá na aba Plano, escolha o plano desejado e clique em Atualizar. Você será redirecionado para o checkout do Asaas para pagamento com cartão." },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* FAQ */}
      <div className="bg-card border border-border/40 rounded-xl p-3 sm:p-5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
          <HelpCircle className="w-4 h-4 text-primary shrink-0" />
          Perguntas Frequentes
        </h3>
        <div className="space-y-1">
          {faq.map((item, i) => (
            <div key={i} className="border border-border/20 rounded-lg overflow-hidden">
              <button
                onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                className="w-full flex items-center justify-between p-2.5 text-left hover:bg-primary/5 transition-colors"
              >
                <span className="text-[11px] sm:text-xs font-medium text-foreground pr-2">{item.q}</span>
                <span className={`text-muted-foreground transition-transform shrink-0 ${faqOpen === i ? "rotate-180" : ""}`}>▼</span>
              </button>
              {faqOpen === i && (
                <div className="px-2.5 pb-2.5 pt-0">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contato */}
      <div className="bg-card border border-border/40 rounded-xl p-3 sm:p-5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
          <Send className="w-4 h-4 text-primary shrink-0" />
          Fale Conosco
        </h3>
        {sent ? (
          <div className="text-center py-8">
            <CheckCheck className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h4 className="text-base font-bold text-foreground mb-1">Mensagem enviada!</h4>
            <p className="text-[11px] text-muted-foreground mb-4">Responderemos em até 48h no seu email de cadastro.</p>
            <button onClick={() => setSent(false)} className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs">Enviar outra</button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">Qual o assunto?</label>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { v: "suporte_tecnico", l: "🛠️ Suporte Técnico", d: "Problemas com o site, upload, player" },
                  { v: "suporte_financeiro", l: "💰 Financeiro", d: "Planos, pagamentos, cobranças" },
                  { v: "duvida_sugestao", l: "💡 Dúvidas ou Sugestões", d: "Melhorias, novas ideias, perguntas gerais" },
                ].map(o => (
                  <button
                    key={o.v}
                    onClick={() => setTipo(o.v)}
                    className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                      tipo === o.v ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="text-[11px] sm:text-xs font-medium text-foreground block">{o.l}</span>
                    <span className="text-[10px] text-muted-foreground">{o.d}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-0.5">
                Descreva o que está acontecendo
              </label>
              <textarea
                value={mensagem}
                onChange={e => setMensagem(e.target.value)}
                rows={4}
                placeholder="Quanto mais detalhes, melhor conseguimos te ajudar. Ex: qual página, o que tentou fazer, que erro apareceu..."
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground resize-none"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Sua dúvida será enviada para nossa equipe e respondida por email.</p>
            </div>

            <button
              onClick={handleSend}
              disabled={sending || !tipo || !mensagem}
              className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 disabled:opacity-50 text-xs"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Enviar Mensagem
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CRM HUB (unifica todas as abas CRM) ────────────────────────────────────────

type CrmSubTab = "contatos" | "financeiro" | "liberacoes" | "calendario" | "ajuda";

export function CrmHub({ artistId, songs }: { artistId: number; songs?: any[] }) {
  const [subTab, setSubTab] = useState<CrmSubTab>("contatos");

  const subTabs: { id: CrmSubTab; label: string; icon: any }[] = [
    { id: "contatos",   label: "Contatos",    icon: Users          },
    { id: "financeiro", label: "Financeiro",  icon: DollarSign     },
    { id: "liberacoes", label: "Liberações",  icon: ShieldCheck    },
    { id: "calendario", label: "Calendário",  icon: Calendar       },
    { id: "ajuda",      label: "Ajuda",       icon: HelpCircle     },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <TrendingUpDown className="w-4 h-4 text-primary" />
        CRM — Gestão de Carreira
      </h3>

      {/* Sub-tabs */}
      <div className="flex gap-1 overflow-x-auto sm:overflow-visible sm:flex-wrap" style={{scrollbarWidth:"none",msOverflowStyle:"none",WebkitOverflowScrolling:"touch"}}>
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 sm:shrink transition-all ${
              subTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground border border-border hover:border-primary/50"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5 shrink-0" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-tab Content */}
      {subTab === "contatos"   && <ContatosTab   artistId={artistId} />}
      {subTab === "financeiro" && <FinanceiroSpreadsheet artistId={artistId} />}
      {subTab === "liberacoes" && <LiberacoesTab artistId={artistId} songs={songs || []} />}
      {subTab === "calendario" && <CalendarioTab artistId={artistId} />}
      {subTab === "ajuda"      && <AjudaTab      artistId={artistId} />}
    </div>
  );
}
