import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, X, Trash2, Calculator, ChevronDown, Check } from "lucide-react";

const CUSTO_CAT = ["Guia", "Distribuidora", "Publicidade", "Produção", "Outros"] as const;
const RECEITA_CAT = ["Música Liberada", "Royalties", "Cachês", "Direitos", "Outros"] as const;

export function FinanceiroSpreadsheet({ artistId }: { artistId: number }) {
  const [custos, setCustos] = useState<any[]>([]);
  const [receitas, setReceitas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"despesas" | "receitas">("despesas");
  const [addCat, setAddCat] = useState<string | null>(null);
  const [addDesc, setAddDesc] = useState("");
  const [addValor, setAddValor] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cR, rR] = await Promise.all([
        fetch("/api/custos", { credentials: "include" }),
        fetch("/api/receitas", { credentials: "include" }),
      ]);
      const [cD, rD] = await Promise.all([cR.json(), rR.json()]);
      setCustos(Array.isArray(cD) ? cD : []);
      setReceitas(Array.isArray(rD) ? rD : []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!addDesc || !addValor || !addCat) return;
    const ep = tab === "despesas" ? "/api/custos" : "/api/receitas";
    try {
      const r = await fetch(ep, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ categoria: addCat, descricao: addDesc, valor: addValor, data: new Date().toISOString().split("T")[0] }) });
      if (r.ok) { setAddCat(null); setAddDesc(""); setAddValor(""); load(); }
    } catch {}
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir?")) return;
    const ep = tab === "despesas" ? `/api/custos/${id}` : `/api/receitas/${id}`;
    await fetch(ep, { method: "DELETE", credentials: "include" });
    load();
  };

  const totalCustos = custos.reduce((a, c) => a + Math.abs(parseFloat(c.valor || "0")), 0);
  const totalReceitas = receitas.reduce((a, r) => a + Math.abs(parseFloat(r.valor || "0")), 0);
  const lucro = totalReceitas - totalCustos;

  const cats = tab === "despesas" ? CUSTO_CAT : RECEITA_CAT;
  const items = tab === "despesas" ? custos : receitas;

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Plano de Contas</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${lucro >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
            {lucro >= 0 ? "+" : ""}R$ {lucro.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Tabs: Despesas / Receitas */}
      <div className="flex gap-1">
        <button onClick={() => { setTab("despesas"); setAddCat(null); }}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            tab === "despesas" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "text-muted-foreground hover:text-foreground"
          }`}>
          DESPESAS
        </button>
        <button onClick={() => { setTab("receitas"); setAddCat(null); }}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
            tab === "receitas" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "text-muted-foreground hover:text-foreground"
          }`}>
          RECEITAS
        </button>
      </div>

      {/* Planilha de colunas */}
      <div className="overflow-x-auto rounded-xl border border-border/40" style={{WebkitOverflowScrolling:"touch"}}>
        <div className="flex gap-0 min-w-max">
          {cats.map((cat, catIdx) => {
            const catItems = items.filter(i => (i.categoria || "Outros") === cat);
            const catTotal = catItems.reduce((a, i) => a + Math.abs(parseFloat(i.valor || "0")), 0);
            const isAdding = addCat === cat;

            return (
              <div key={cat} className="w-[220px] shrink-0 border-r border-border/40 last:border-r-0 bg-card">
                {/* Cabeçalho da Coluna */}
                <div className={`px-3 py-2.5 text-center border-b border-border/40 ${tab === "despesas" ? "bg-red-500/5" : "bg-green-500/5"}`}>
                  <p className="text-[11px] font-bold text-foreground uppercase tracking-wide">
                    {tab === "despesas" ? `2.${catIdx + 1}` : `1.${catIdx + 1}`} {cat}
                  </p>
                  <p className={`text-[10px] font-medium mt-0.5 ${tab === "despesas" ? "text-red-400" : "text-green-400"}`}>
                    {tab === "despesas" ? "-" : "+"}R$ {catTotal.toFixed(2)}
                  </p>
                </div>

                {/* Itens */}
                {catItems.map((item, idx) => (
                  <div key={item.id} className="flex border-b border-border/10 group hover:bg-primary/[0.03] transition-colors relative">
                    <div className="w-[42px] shrink-0 bg-muted/30 border-r border-border/10 text-center py-2 text-[10px] text-muted-foreground">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0 px-2.5 py-2">
                      <p className="text-[11px] text-foreground leading-tight truncate">{item.descricao}</p>
                      <p className={`text-[10px] font-medium ${tab === "despesas" ? "text-red-400" : "text-green-400"}`}>
                        {tab === "despesas" ? "-" : "+"}R$ {Math.abs(parseFloat(item.valor || "0")).toFixed(2)}
                      </p>
                    </div>
                    <button onClick={() => handleDelete(item.id)}
                      className="absolute top-1 right-1 p-0.5 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Linha Add */}
                {isAdding ? (
                  <div className="flex border-b border-border/10 bg-primary/5">
                    <div className="w-[42px] shrink-0 bg-muted/30 border-r border-border/10 text-center py-2 text-[10px] text-muted-foreground">+</div>
                    <div className="flex-1 px-2 py-1.5 space-y-1">
                      <input value={addDesc} onChange={e => setAddDesc(e.target.value)} autoFocus
                        placeholder="Descrição" className="w-full bg-background border border-border rounded px-2 py-1 text-[10px] text-foreground" />
                      <div className="flex gap-1 items-center">
                        <input value={addValor} onChange={e => setAddValor(e.target.value)}
                          type="number" step="0.01" placeholder="0,00"
                          className="flex-1 bg-background border border-border rounded px-2 py-1 text-[10px] text-foreground text-right" />
                        <button onClick={handleAdd} className="px-2 py-1 rounded bg-primary text-primary-foreground text-[10px] font-bold">
                          <Check className="w-3 h-3" />
                        </button>
                        <button onClick={() => { setAddCat(null); setAddDesc(""); setAddValor(""); }} className="p-1 text-muted-foreground">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddCat(cat); setAddDesc(""); setAddValor(""); }}
                    className="w-full flex items-center justify-center gap-1 px-4 py-2.5 text-[10px] text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors border-b border-border/10">
                    <Plus className="w-3 h-3" /> Adicionar
                  </button>
                )}
              </div>
            );
          })}

          {/* Coluna TOTAL */}
          <div className="w-[200px] shrink-0 bg-card border-r-0">
            <div className="px-3 py-2.5 text-center border-b border-border/40 bg-muted/10">
              <p className="text-[11px] font-bold text-foreground uppercase tracking-wide">TOTAL</p>
            </div>
            <div className="flex flex-col">
              <div className="flex border-b border-border/10">
                <div className="w-[42px] shrink-0 bg-muted/30 border-r border-border/10 text-center py-2 text-[10px] text-muted-foreground"></div>
                <div className="flex-1 px-2.5 py-2 space-y-1">
                  <p className="text-[11px] text-foreground">Despesas</p>
                  <p className="text-[10px] font-medium text-red-400">-R$ {totalCustos.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex border-b border-border/10">
                <div className="w-[42px] shrink-0 bg-muted/30 border-r border-border/10 text-center py-2 text-[10px] text-muted-foreground"></div>
                <div className="flex-1 px-2.5 py-2 space-y-1">
                  <p className="text-[11px] text-foreground">Receitas</p>
                  <p className="text-[10px] font-medium text-green-400">+R$ {totalReceitas.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex border-b-2 border-border/60 bg-muted/5">
                <div className="w-[42px] shrink-0 bg-muted/30 border-r border-border/10 text-center py-2 text-[10px] text-muted-foreground"></div>
                <div className="flex-1 px-2.5 py-2 space-y-1">
                  <p className="text-[11px] font-bold text-foreground">Total</p>
                  <p className={`text-[10px] font-bold ${lucro >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {lucro >= 0 ? "+" : ""}R$ {lucro.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resumo Mensal */}
      {(() => {
        const meses: Record<string, { c: number; r: number }> = {};
        custos.forEach(c => { const m = (c.data || c.createdAt).slice(0,7); if(!meses[m]) meses[m]={c:0,r:0}; meses[m].c += Math.abs(parseFloat(c.valor||"0")); });
        receitas.forEach(r => { const m = (r.data || r.createdAt).slice(0,7); if(!meses[r.data||r.createdAt]) meses[r.data||r.createdAt]={c:0,r:0}; meses[r.data||r.createdAt].r += Math.abs(parseFloat(r.valor||"0")); });
        const sorted = Object.entries(meses).sort((a,b) => b[0].localeCompare(a[0]));
        if (sorted.length === 0) return null;
        return (
          <details className="bg-card border border-border/40 rounded-xl overflow-hidden">
            <summary className="p-2.5 cursor-pointer text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1.5">
              <ChevronDown className="w-3.5 h-3.5" /> 📊 Resumo Mensal
            </summary>
            <div className="border-t border-border/20 overflow-x-auto">
              <table className="w-full text-[11px] min-w-[400px]">
                <thead><tr className="border-b border-border/20 text-muted-foreground">
                  <th className="text-left py-1.5 px-3">Mês</th><th className="text-right py-1.5 px-3">Receitas</th><th className="text-right py-1.5 px-3">Custos</th><th className="text-right py-1.5 px-3">Saldo</th>
                </tr></thead>
                <tbody>
                  {sorted.map(([m, v]) => { const s = v.r - v.c; const [y, mo] = m.split("-"); const nome = new Date(+y, +mo-1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
                  return <tr key={m} className="border-b border-border/10">
                    <td className="py-1.5 px-3 capitalize">{nome}</td>
                    <td className="text-right py-1.5 px-3 text-green-400">+R$ {v.r.toFixed(2)}</td>
                    <td className="text-right py-1.5 px-3 text-red-400">-R$ {v.c.toFixed(2)}</td>
                    <td className={`text-right py-1.5 px-3 font-bold ${s>=0?"text-green-400":"text-red-400"}`}>{s>=0?"+":""}R$ {s.toFixed(2)}</td>
                  </tr>; })}
                </tbody>
              </table>
            </div>
          </details>
        );
      })()}
    </div>
  );
}
