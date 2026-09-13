import { useEffect, useState } from 'react';

type Row = { id: number; name: string; songs: number; photo: boolean; profile: boolean; shares: number; views: number; last_active_at: string | null; status: string };
export function EngagementPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Todos');
  async function load() {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/engagement', { credentials: 'include' });
      if (!response.ok) throw new Error();
      setRows(await response.json());
    } catch { setError('Não foi possível carregar o acompanhamento. Tente atualizar.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const visibleRows = rows.filter(r => filter === 'Todos' || (filter === 'Sem músicas' ? r.songs === 0 : filter === 'Perfil pendente' ? !r.photo || !r.profile : r.status === filter));
  return <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="font-display text-lg font-bold">Acompanhamento dos artistas</h3>
      <div className="flex gap-3">
        <select aria-label="Filtrar acompanhamento" value={filter} onChange={e => setFilter(e.target.value)} className="bg-background border border-border rounded-lg p-2 text-sm">
          {['Todos', 'Sem músicas', 'Perfil pendente', 'Inativo', 'Atenção: plano pago', 'Sem histórico'].map(x => <option key={x}>{x}</option>)}
        </select>
        <button onClick={() => void load()} className="text-primary text-sm">Atualizar</button>
      </div>
    </div>
    <p className="text-xs text-muted-foreground">Inativo: 14 dias sem atividade registrada. Atenção: plano pago com 30 dias sem atividade. São sinais para acompanhamento, não confirmação de cancelamento. Visitas são acessos, não visitantes únicos.</p>
    {loading ? <p role="status">Carregando…</p> : error ? <p role="alert">{error}</p> : <div className="overflow-x-auto"><table className="w-full text-sm text-left">
      <thead><tr>{['Artista', 'Última atividade', 'Músicas', 'Perfil', 'Links copiados', 'Visitas', 'Situação'].map(x => <th className="p-2 text-muted-foreground" key={x}>{x}</th>)}</tr></thead>
      <tbody>{visibleRows.map(r => <tr key={r.id} className="border-t border-border">
        <td className="p-2">{r.name}</td><td className="p-2">{r.last_active_at ? new Date(r.last_active_at).toLocaleString('pt-BR') : 'Sem histórico'}</td>
        <td className="p-2">{r.songs}</td><td className="p-2">{r.photo ? 'Com foto' : 'Sem foto'} · {r.profile ? 'Dados completos' : 'Dados pendentes'}</td>
        <td className="p-2">{r.shares}</td><td className="p-2">{r.views}</td><td className="p-2">{r.status}</td>
      </tr>)}</tbody>
    </table>{visibleRows.length === 0 && <p className="py-4 text-muted-foreground">Nenhum artista encontrado neste filtro.</p>}</div>}
  </section>;
}
