import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, X, Pencil, Trash2, ShieldCheck, Clock, AlertTriangle, CheckCircle } from "lucide-react";

export function LiberacoesTab({ artistId, songs }: { artistId: number; songs: any[] }) {
  const [liberacoes, setLiberacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ songId: "", artistaNome: "", dataInicio: new Date().toISOString().split("T")[0], dataLiberacao: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/liberacoes", { credentials: "include" });
      const d = await r.json();
      setLiberacoes(Array.isArray(d) ? d : []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.songId || !form.artistaNome) return;
    const url = editing ? `/api/liberacoes/${(editing as any).id}` : "/api/liberacoes";
    const method = editing ? "PUT" : "POST";
    try {
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(form) });
      if (r.ok) { setShowForm(false); setEditing(null); setForm({ songId: "", artistaNome: "", dataInicio: new Date().toISOString().split("T")[0], dataLiberacao: "" }); load(); }
    } catch {}
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir?")) return;
    await fetch(`/api/liberacoes/${id}`, { method: "DELETE", credentials: "include" });
    setLiberacoes(p => p.filter(l => l.id !== id));
  };

  const handleUpdateLiberacao = async (id: number, data: string) => {
    await fetch(`/api/liberacoes/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ dataLiberacao: data }) });
    load();
  };

  const openEdit = (l: any) => { setEditing(l); setForm({ songId: String(l.songId), artistaNome: l.artistaNome, dataInicio: l.dataInicio, dataLiberacao: l.dataLiberacao || "" }); setShowForm(true); };

  const hoje = new Date().toISOString().split("T")[0];
  const pendentes = liberacoes.filter(l => !l.dataLiberacao);
  const concluidas = liberacoes.filter(l => l.dataLiberacao);
  const atrasadas = pendentes.filter(l => l.dataInicio < hoje);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Liberações
          </h3>
          <p className="text-[10px] text-muted-foreground">Controle de prazos — não perca oportunidades</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ songId: "", artistaNome: "", dataInicio: hoje, dataLiberacao: "" }); setShowForm(true); }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shrink-0">
          <Plus className="w-3 h-3" /> Nova
        </button>
      </div>

      {atrasadas.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-[11px] text-red-400">{atrasadas.length} liberação{atrasadas.length > 1 ? "ões" : ""} sem data de liberação definida — atenção!</span>
        </div>
      )}

      {showForm && (
        <div className="bg-card border border-border/40 rounded-xl p-3 sm:p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-foreground text-xs">{editing ? "Editar" : "Nova"} Liberação</h4>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Música</label>
              <select value={form.songId} onChange={e => setForm({...form, songId: e.target.value})} className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-[11px] text-foreground">
                <option value="">Selecione...</option>
                {songs.map(s => <option key={s.id} value={s.id}>{s.titulo}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Artista</label>
              <input value={form.artistaNome} onChange={e => setForm({...form, artistaNome: e.target.value})} placeholder="Nome do artista" className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-[11px] text-foreground" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Data de Início</label>
              <input type="date" value={form.dataInicio} onChange={e => setForm({...form, dataInicio: e.target.value})} className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-[11px] text-foreground" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-muted-foreground mb-0.5">Data de Liberação (quando sair)</label>
              <input type="date" value={form.dataLiberacao} onChange={e => setForm({...form, dataLiberacao: e.target.value})} className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-[11px] text-foreground" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-lg text-muted-foreground text-[11px]">Cancelar</button>
            <button onClick={handleSave} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-[11px]">{editing ? "Salvar" : "Adicionar"}</button>
          </div>
        </div>
      )}

      {liberacoes.length === 0 ? (
        <div className="text-center py-8 bg-card border border-dashed border-border/40 rounded-xl">
          <ShieldCheck className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-xs">Nenhuma liberação cadastrada</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Registre as músicas enviadas para artistas e acompanhe os prazos</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {pendentes.map(l => {
            const song = songs.find(s => s.id === l.songId);
            const diasAtraso = Math.floor((new Date().getTime() - new Date(l.dataInicio + "T12:00:00").getTime()) / 86400000);
            return (
              <div key={l.id} className="flex items-center justify-between bg-card border border-border/40 rounded-lg p-2.5 group gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground text-xs truncate">{song?.titulo || `Música #${l.songId}`}</span>
                    <span className="text-[10px] text-muted-foreground">→ {l.artistaNome}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 text-[10px] text-yellow-400">
                      <Clock className="w-3 h-3" />
                      Início: {new Date(l.dataInicio + "T12:00:00").toLocaleDateString("pt-BR")}
                    </span>
                    {diasAtraso > 0 && (
                      <span className="text-[10px] text-red-400 font-medium">({diasAtraso} dias aguardando)</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <input type="date" value={l.dataLiberacao || ""}
                    onChange={e => handleUpdateLiberacao(l.id, e.target.value)}
                    className="w-[120px] bg-background border border-border rounded-lg px-2 py-1 text-[10px] text-foreground" />
                  <button onClick={() => openEdit(l)} className="p-1 rounded text-muted-foreground sm:opacity-0 sm:group-hover:opacity-100 hover:text-primary"><Pencil className="w-3 h-3" /></button>
                  <button onClick={() => handleDelete(l.id)} className="p-1 rounded text-muted-foreground sm:opacity-0 sm:group-hover:opacity-100 hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            );
          })}
          {concluidas.length > 0 && (
            <details className="bg-card border border-border/40 rounded-lg overflow-hidden">
              <summary className="p-2.5 cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
                <CheckCircle className="w-3.5 h-3.5 inline mr-1 text-green-400" />
                {concluidas.length} liberação{concluidas.length > 1 ? "ões" : ""} concluída{concluidas.length > 1 ? "s" : ""}
              </summary>
              <div className="border-t border-border/20 divide-y divide-border/10">
                {concluidas.map(l => {
                  const song = songs.find(s => s.id === l.songId);
                  return (
                    <div key={l.id} className="flex items-center justify-between p-2 group">
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] text-foreground truncate">{song?.titulo || `Música #${l.songId}`}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">→ {l.artistaNome}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-green-400">
                          ✅ {new Date(l.dataLiberacao + "T12:00:00").toLocaleDateString("pt-BR")}
                        </span>
                        <button onClick={() => handleDelete(l.id)} className="p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"><Trash2 className="w-2.5 h-2.5" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
