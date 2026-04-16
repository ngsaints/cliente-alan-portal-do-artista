import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  useLogin,
  useLogout,
  useGetAuthStatus,
  useListSongs,
  useCreateSong,
  useDeleteSong,
  getListSongsQueryKey,
  getGetAuthStatusQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LogOut, Music, Plus, Trash2, ShieldAlert, Upload, Image as ImageIcon,
  CheckCircle2, BarChart3, Users, Crown, Settings, MessageSquare,
  Eye, EyeOff, Save, RefreshCw, X, Edit2, CreditCard, Cloud, Globe,
  CheckCheck, AlertCircle, Loader2, Search, Youtube, Tag, GripVertical,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGenres } from "@/hooks/useGenres";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  totalSongs: number;
  totalArtists: number;
  totalInterests: number;
  totalPlans: number;
  availableSongs: number;
  vipSongs: number;
  freeArtists: number;
  paidArtists: number;
}

interface Artist {
  id: number;
  name: string;
  email: string;
  profissao: string;
  cidade: string;
  plano: string;
  planoAtivo: boolean;
  musicaCount: string;
  limiteMusicas: string;
  createdAt: string;
}

interface Plan {
  id: number;
  nome: string;
  label: string;
  preco: string;
  limiteMusicas: string;
  personalizacaoPercent: string;
  descricao: string;
  fraseEfeito: string;
  ativo: boolean;
}

interface Interest {
  id: number;
  songId: string;
  nome: string;
  email: string;
  telefone: string;
  mensagem: string;
  contratarShow: boolean;
  reservarMusica: boolean;
  agendarReuniao: boolean;
  lido: boolean;
  createdAt: string;
}

interface Setting {
  id: number;
  category: string;
  key: string;
  value: string;
  rawValue: string;
  isSecret: boolean;
  description: string;
  updatedAt: string;
}

type MainTab = "dashboard" | "songs" | "artists" | "plans" | "genres" | "interests" | "settings";
type SettingsCategory = "mercadopago" | "r2" | "portal";

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Admin() {
  const { data: authStatus, isLoading: isAuthLoading } = useGetAuthStatus();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-primary">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando...
      </div>
    );
  }

  if (!authStatus?.logado) return <LoginForm />;
  return <AdminDashboard />;
}

// ─── Login ────────────────────────────────────────────────────────────────────

function LoginForm() {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const { mutate: login, isPending } = useLogin();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(
      { data: { usuario, senha } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAuthStatusQueryKey() });
          toast({ title: "Login realizado com sucesso!", variant: "default" });
        },
        onError: () => {
          toast({
            title: "Erro no login",
            description: "Credenciais inválidas.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-4 left-4">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
          <Music className="w-5 h-5" />
          Voltar ao Catálogo
        </Link>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 bg-card rounded-3xl border border-border shadow-2xl"
      >
        <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-display font-bold text-center text-foreground mb-2">Painel Admin</h1>
        <p className="text-center text-muted-foreground mb-8">Acesso restrito à equipe.</p>
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Usuário</label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full px-4 py-3 bg-input border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground transition-all"
              placeholder="admin"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-4 py-3 bg-input border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(245,197,24,0.3)] disabled:opacity-50"
          >
            {isPending ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Admin Dashboard (container com abas) ─────────────────────────────────────

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<MainTab>("dashboard");
  const { mutate: logout } = useLogout();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAuthStatusQueryKey() });
        toast({ title: "Sessão encerrada" });
      },
    });
  };

  const tabs: { id: MainTab; label: string; icon: React.ElementType }[] = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "songs", label: "Músicas", icon: Music },
    { id: "artists", label: "Artistas", icon: Users },
    { id: "plans",     label: "Planos",         icon: Crown          },
    { id: "genres",    label: "Gêneros",        icon: Tag            },
    { id: "interests", label: "Interesses",     icon: MessageSquare  },
    { id: "settings", label: "Configurações", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-primary hover:text-primary/80 font-medium flex items-center gap-2">
              <Music className="w-4 h-4" />
              Ver Site
            </Link>
            <span className="text-border">|</span>
            <span className="font-display font-bold text-foreground">Painel Administrativo</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-muted-foreground hover:text-destructive transition-colors text-sm font-medium"
          >
            Sair <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Tab bar */}
      <div className="sticky top-16 z-30 bg-card/90 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {activeTab === "dashboard" && <DashboardTab onNavigate={setActiveTab} />}
          {activeTab === "songs" && <SongsTab />}
          {activeTab === "artists" && <ArtistsTab />}
          {activeTab === "plans" && <PlansTab />}
          {activeTab === "genres"    && <GenresTab />}
          {activeTab === "interests" && <InterestsTab />}
          {activeTab === "settings" && <SettingsTab />}
        </motion.div>
      </div>
    </div>
  );
}

// ─── StatCard helper ──────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color = "text-primary" }: {
  label: string; value: number | string; icon: React.ElementType; color?: string;
}) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <Icon className={`w-5 h-5 ${color}`} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-4xl font-bold text-foreground">{value}</p>
    </div>
  );
}

// ─── Tab 1: Dashboard ─────────────────────────────────────────────────────────

function DashboardTab({ onNavigate }: { onNavigate: (tab: MainTab) => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setStats(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-1">Visão Geral</h2>
        <p className="text-muted-foreground text-sm">Estatísticas em tempo real da plataforma</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total de Músicas" value={stats?.totalSongs ?? 0} icon={Music} />
        <StatCard label="Artistas" value={stats?.totalArtists ?? 0} icon={Users} color="text-blue-400" />
        <StatCard label="Disponíveis" value={stats?.availableSongs ?? 0} icon={CheckCircle2} color="text-green-400" />
        <StatCard label="VIP" value={stats?.vipSongs ?? 0} icon={Crown} color="text-yellow-400" />
        <StatCard label="Planos Ativos" value={stats?.totalPlans ?? 0} icon={Crown} color="text-purple-400" />
        <StatCard label="Artistas Free" value={stats?.freeArtists ?? 0} icon={Users} color="text-muted-foreground" />
        <StatCard label="Artistas Pagantes" value={stats?.paidArtists ?? 0} icon={CreditCard} color="text-emerald-400" />
        <StatCard label="Interesses/Leads" value={stats?.totalInterests ?? 0} icon={MessageSquare} color="text-orange-400" />
      </div>

      {/* Shortcuts */}
      <div>
        <h3 className="text-lg font-bold text-foreground mb-4">Atalhos Rápidos</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Gerenciar Músicas", tab: "songs" as MainTab, icon: Music, color: "text-primary" },
            { label: "Gerenciar Artistas", tab: "artists" as MainTab, icon: Users, color: "text-blue-400" },
            { label: "Ver Interesses", tab: "interests" as MainTab, icon: MessageSquare, color: "text-orange-400" },
            { label: "Editar Planos", tab: "plans" as MainTab, icon: Crown, color: "text-yellow-400" },
            { label: "Config. MercadoPago", tab: "settings" as MainTab, icon: CreditCard, color: "text-emerald-400" },
            { label: "Config. Storage R2", tab: "settings" as MainTab, icon: Cloud, color: "text-sky-400" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => onNavigate(item.tab)}
              className="flex items-center gap-3 p-4 bg-card border border-border/50 rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
            >
              <item.icon className={`w-5 h-5 ${item.color} shrink-0`} />
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab 2: Músicas ───────────────────────────────────────────────────────────

function SongsTab() {
  const { data: songs, isLoading } = useListSongs();
  const { mutate: deleteSong } = useDeleteSong();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSong, setEditingSong] = useState<any | null>(null);

  const filtered = (songs || []).filter((s) =>
    s.titulo.toLowerCase().includes(search.toLowerCase()) ||
    s.genero.toLowerCase().includes(search.toLowerCase()) ||
    (s.compositor || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: number, titulo: string) => {
    if (window.confirm(`Excluir "${titulo}"?`)) {
      deleteSong({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });
          toast({ title: "Música excluída" });
        },
        onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }),
      });
    }
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Músicas</h2>
          <p className="text-sm text-muted-foreground">{songs?.length || 0} faixas cadastradas</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all text-sm shadow-[0_0_16px_rgba(245,197,24,0.25)]"
        >
          <Plus className="w-4 h-4" />
          Nova Música
        </button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título, gênero ou compositor..."
          className="w-full pl-10 pr-10 py-2.5 bg-card border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-16 bg-card border border-dashed border-border/50 rounded-2xl text-muted-foreground">
          <Music className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">
            {search ? `Nenhum resultado para "${search}"` : "Nenhuma música cadastrada ainda."}
          </p>
          {!search && (
            <p className="text-sm mt-1">Clique em "Nova Música" para começar.</p>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[3fr_1fr_1fr_auto] gap-4 px-4 py-2.5 border-b border-border bg-background/40 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>Música</span>
            <span>Status</span>
            <span>Tipo</span>
            <span className="text-right pr-2">Ações</span>
          </div>
          <div className="divide-y divide-border/40">
            {filtered.map((song) => (
              <div
                key={song.id}
                className="flex sm:grid sm:grid-cols-[3fr_1fr_1fr_auto] items-center gap-3 sm:gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors group"
              >
                {/* Capa + título */}
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={song.capaUrl || `${import.meta.env.BASE_URL}images/default-cover.png`}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover shrink-0 bg-black/30"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate text-sm">{song.titulo}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {song.genero}
                      {song.subgenero ? ` · ${song.subgenero}` : ""}
                      {song.compositor ? ` — ${song.compositor}` : ""}
                    </p>
                  </div>
                </div>

                {/* Status */}
                <div className="hidden sm:flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    song.status === "Disponível"
                      ? "bg-green-500/15 text-green-400"
                      : "bg-orange-500/15 text-orange-400"
                  }`}>
                    {song.status}
                  </span>
                  {song.isVip && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400">VIP</span>
                  )}
                </div>

                {/* Tipo */}
                <div className="hidden sm:block">
                  {song.tipoMidia === "video" ? (
                    <span className="flex items-center gap-1 text-xs text-red-400">
                      <Youtube className="w-3.5 h-3.5" /> Vídeo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Music className="w-3.5 h-3.5" /> Áudio
                    </span>
                  )}
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1 ml-auto sm:ml-0 sm:justify-end sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingSong(song)}
                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(song.id, song.titulo)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <SongModal
          mode="add"
          onClose={() => setShowAddModal(false)}
          onSaved={() => { refresh(); setShowAddModal(false); }}
        />
      )}
      {editingSong && (
        <SongModal
          mode="edit"
          song={editingSong}
          onClose={() => setEditingSong(null)}
          onSaved={() => { refresh(); setEditingSong(null); }}
        />
      )}
    </div>
  );
}

// ─── SongModal (Nova Música + Editar Música) ──────────────────────────────────

interface SongModalProps {
  mode: "add" | "edit";
  song?: any;
  onClose: () => void;
  onSaved: () => void;
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
  return m ? m[1] : null;
}

function SongModal({ mode, song, onClose, onSaved }: SongModalProps) {
  const { mutate: createSong, isPending: isCreating } = useCreateSong();
  const { toast } = useToast();

  const [tipoMidia, setTipoMidia] = useState<"audio" | "video">(song?.tipoMidia || "audio");
  const [isVip, setIsVip] = useState<boolean>(!!song?.isVip);
  const [capaFile, setCapaFile] = useState<File | null>(null);
  const [capaPreview, setCapaPreview] = useState<string | null>(null);
  const [mp3File, setMp3File] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCapaChange = (file: File | null) => {
    setCapaFile(file);
    if (file) setCapaPreview(URL.createObjectURL(file));
    else setCapaPreview(null);
  };

  const [form, setForm] = useState({
    titulo: song?.titulo || "",
    descricao: song?.descricao || "",
    genero: song?.genero || "Sertanejo",
    subgenero: song?.subgenero || "",
    compositor: song?.compositor || "",
    status: song?.status || "Disponível",
    precoX: song?.precoX || "",
    precoY: song?.precoY || "",
    youtubeUrl: song?.youtubeUrl || "",
    vipCode: song?.vipCode || "",
  });

  const set = (k: string, v: string) => setForm((prev) => ({ ...prev, [k]: v }));
  const isPending = isCreating || saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "add") {
      if (tipoMidia === "audio" && !mp3File) {
        return toast({ title: "Selecione um arquivo MP3", variant: "destructive" });
      }
      if (tipoMidia === "video" && !form.youtubeUrl) {
        return toast({ title: "Informe o link do YouTube", variant: "destructive" });
      }
      createSong(
        { data: { ...form, tipoMidia, isVip: isVip ? "true" : "false", capa: capaFile || undefined, mp3: mp3File || undefined } },
        {
          onSuccess: () => { toast({ title: "Música adicionada!" }); onSaved(); },
          onError: (err: any) => toast({ title: "Erro ao adicionar", description: err.message, variant: "destructive" }),
        }
      );
    } else {
      setSaving(true);
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, v); });
      fd.append("tipoMidia", tipoMidia);
      fd.append("isVip", String(isVip));
      if (capaFile) fd.append("capa", capaFile);

      const res = await fetch(`/api/songs/${song.id}`, {
        method: "PUT",
        credentials: "include",
        body: fd,
      });
      setSaving(false);
      if (res.ok) {
        toast({ title: "Música atualizada!" });
        onSaved();
      } else {
        toast({ title: "Erro ao atualizar", variant: "destructive" });
      }
    }
  };

  const { genres: GENEROS } = useGenres();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-3xl shadow-2xl flex flex-col z-10 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-lg">
              <Music className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-tight">
                {mode === "add" ? "Nova Música" : "Editar Música"}
              </h2>
              {mode === "edit" && (
                <p className="text-xs text-muted-foreground truncate max-w-[280px]">{song?.titulo}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (scrollable) */}
        <form id="song-modal-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Tipo de mídia */}
          <div className="flex gap-1 p-1 bg-background rounded-xl border border-border">
            {(["audio", "video"] as const).map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setTipoMidia(tipo)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                  tipoMidia === tipo
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tipo === "audio" ? (
                  <><Music className="w-4 h-4" /> Áudio (MP3)</>
                ) : (
                  <><Youtube className="w-4 h-4" /> Vídeo (YouTube)</>
                )}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Título */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Título *</label>
              <input
                value={form.titulo}
                onChange={(e) => set("titulo", e.target.value)}
                required
                placeholder="Ex: Na Hora"
                className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            {/* Gênero */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Gênero *</label>
              <select
                value={form.genero}
                onChange={(e) => set("genero", e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary appearance-none transition-all"
              >
                {GENEROS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>

            {/* Subgênero */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Subgênero</label>
              <input
                value={form.subgenero}
                onChange={(e) => set("subgenero", e.target.value)}
                placeholder="Ex: Romântico, Vaneira"
                className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            {/* Compositor */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Compositor</label>
              <input
                value={form.compositor}
                onChange={(e) => set("compositor", e.target.value)}
                placeholder="Nome do compositor"
                className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary appearance-none transition-all"
              >
                <option>Disponível</option>
                <option>Reservado</option>
              </select>
            </div>

            {/* Descrição */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Descrição *</label>
              <textarea
                value={form.descricao}
                onChange={(e) => set("descricao", e.target.value)}
                required
                rows={3}
                placeholder="Uma breve história sobre a música..."
                className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary resize-none transition-all"
              />
            </div>

            {/* YouTube URL + preview de thumbnail */}
            {tipoMidia === "video" && (
              <div className="sm:col-span-2 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Link do YouTube *</label>
                  <input
                    value={form.youtubeUrl}
                    onChange={(e) => set("youtubeUrl", e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                {/* Preview automático da thumbnail */}
                {extractYouTubeId(form.youtubeUrl) && (
                  <div className="relative rounded-xl overflow-hidden border border-border aspect-video bg-black/20">
                    <img
                      src={`https://img.youtube.com/vi/${extractYouTubeId(form.youtubeUrl)}/hqdefault.jpg`}
                      alt="Thumbnail YouTube"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                      <Youtube className="w-3 h-3" /> Thumbnail automática
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Capa de áudio — upload em add mode, troca opcional em edit mode */}
            {tipoMidia === "audio" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Capa {mode === "edit" ? "(opcional — troca a atual)" : "(imagem)"}
                  </label>

                  {/* Preview: nova selecionada > capa atual */}
                  {(capaPreview || (mode === "edit" && song?.capaUrl)) && (
                    <div className="flex items-center gap-3 mb-2">
                      <img
                        src={capaPreview ?? song?.capaUrl}
                        alt="Capa"
                        className={`w-14 h-14 rounded-lg object-cover border-2 transition-all ${capaPreview ? "border-primary shadow-[0_0_8px_rgba(245,197,24,0.4)]" : "border-border opacity-60"}`}
                      />
                      <div className="text-xs text-muted-foreground">
                        {capaPreview
                          ? <span className="text-primary font-medium">Nova capa selecionada</span>
                          : "Capa atual"}
                        {capaPreview && (
                          <button
                            type="button"
                            onClick={() => handleCapaChange(null)}
                            className="ml-2 text-destructive hover:underline"
                          >
                            remover
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <label className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${capaFile ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-white/[0.02]"}`}>
                    {capaFile
                      ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                      : <ImageIcon className="w-5 h-5 text-muted-foreground shrink-0" />}
                    <span className="text-sm text-muted-foreground truncate">
                      {capaFile ? capaFile.name : mode === "edit" ? "Escolher nova imagem..." : "Selecionar imagem"}
                    </span>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => handleCapaChange(e.target.files?.[0] || null)} />
                  </label>
                </div>

                {/* MP3: somente ao adicionar */}
                {mode === "add" ? (
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">MP3 (áudio) *</label>
                    <label className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${mp3File ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-white/[0.02]"}`}>
                      {mp3File
                        ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                        : <Upload className="w-5 h-5 text-muted-foreground shrink-0" />}
                      <span className="text-sm text-muted-foreground truncate">
                        {mp3File ? mp3File.name : "Selecionar MP3"}
                      </span>
                      <input type="file" accept="audio/*" className="hidden"
                        onChange={(e) => setMp3File(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 px-4 py-3 bg-background/60 rounded-xl border border-border/50 text-xs text-muted-foreground">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 opacity-60" />
                    Para trocar o arquivo MP3, delete esta música e adicione novamente.
                  </div>
                )}
              </>
            )}
          </div>

          {/* VIP Toggle */}
          <div
            onClick={() => setIsVip(!isVip)}
            className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer select-none transition-colors ${
              isVip ? "border-primary bg-primary/10 text-primary" : "border-border bg-input text-muted-foreground hover:border-primary/40"
            }`}
          >
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              <span className="text-sm font-medium">Conteúdo VIP exclusivo</span>
            </div>
            <div className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${isVip ? "bg-primary" : "bg-border"}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isVip ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
          </div>

          {isVip && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Código de Acesso VIP</label>
              <input
                value={form.vipCode}
                onChange={(e) => set("vipCode", e.target.value)}
                placeholder="Ex: 1234"
                className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-xl hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="song-modal-form"
            disabled={isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 text-sm"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isPending ? "Salvando..." : mode === "add" ? "Adicionar Música" : "Salvar Alterações"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Tab 3: Artistas ──────────────────────────────────────────────────────────

function ArtistsTab() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPlano, setEditPlano] = useState("");
  const [editAtivo, setEditAtivo] = useState(true);
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    fetch("/api/admin/artists", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setArtists(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleEdit = (a: Artist) => {
    setEditingId(a.id);
    setEditPlano(a.plano);
    setEditAtivo(a.planoAtivo);
  };

  const handleSave = async (id: number) => {
    const res = await fetch(`/api/admin/artists/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ plano: editPlano, planoAtivo: editAtivo }),
    });
    if (res.ok) {
      toast({ title: "Artista atualizado" });
      setEditingId(null);
      load();
    } else {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Deletar o artista "${name}"? Esta ação é irreversível.`)) return;
    const res = await fetch(`/api/admin/artists/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      toast({ title: "Artista deletado" });
      load();
    } else {
      toast({ title: "Erro ao deletar", variant: "destructive" });
    }
  };

  const PLANOS = ["free", "basico", "intermediario", "pro", "premium"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Artistas</h2>
          <p className="text-sm text-muted-foreground">{artists.length} artistas cadastrados</p>
        </div>
        <button onClick={load} className="p-2 text-muted-foreground hover:text-primary transition-colors" title="Atualizar">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : artists.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card border border-dashed border-border rounded-2xl">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Nenhum artista cadastrado ainda.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-background/50">
                <tr>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Artista</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Cidade</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Plano</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Músicas</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {artists.map((a) => (
                  <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.email}</p>
                      {a.profissao && <p className="text-xs text-muted-foreground">{a.profissao}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{a.cidade || "—"}</td>
                    <td className="px-4 py-3">
                      {editingId === a.id ? (
                        <select
                          value={editPlano}
                          onChange={(e) => setEditPlano(e.target.value)}
                          className="bg-input border border-border rounded-lg px-2 py-1 text-foreground text-xs"
                        >
                          {PLANOS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          a.plano === "free" ? "bg-zinc-500/20 text-zinc-400" :
                          a.plano === "premium" ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-primary/20 text-primary"
                        }`}>{a.plano}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.musicaCount} / {a.limiteMusicas}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === a.id ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={editAtivo} onChange={e => setEditAtivo(e.target.checked)} className="accent-primary" />
                          <span className="text-xs text-muted-foreground">Ativo</span>
                        </label>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${a.planoAtivo ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                          {a.planoAtivo ? "Ativo" : "Inativo"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editingId === a.id ? (
                          <>
                            <button onClick={() => handleSave(a.id)} className="p-1.5 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors" title="Salvar">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg transition-colors" title="Cancelar">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleEdit(a)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Editar plano">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(a.id, a.name)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors" title="Deletar">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 4: Planos ────────────────────────────────────────────────────────────

function PlansTab() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Plan>>({});
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    fetch("/api/admin/plans", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setPlans(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const startEdit = (p: Plan) => {
    setEditingId(p.id);
    setEditData({ ...p });
  };

  const handleSave = async (id: number) => {
    const res = await fetch(`/api/admin/plans/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(editData),
    });
    if (res.ok) {
      toast({ title: "Plano atualizado" });
      setEditingId(null);
      load();
    } else {
      toast({ title: "Erro ao atualizar plano", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Planos</h2>
          <p className="text-sm text-muted-foreground">Gerencie os planos disponíveis para artistas</p>
        </div>
        <button onClick={load} className="p-2 text-muted-foreground hover:text-primary transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className={`bg-card border rounded-2xl p-5 ${editingId === plan.id ? "border-primary" : "border-border/50"}`}>
              {editingId === plan.id ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Label</label>
                    <input
                      value={editData.label || ""}
                      onChange={e => setEditData({ ...editData, label: e.target.value })}
                      className="w-full bg-input border border-border rounded-lg px-3 py-1.5 text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Preço (R$)</label>
                    <input
                      value={editData.preco || ""}
                      onChange={e => setEditData({ ...editData, preco: e.target.value })}
                      className="w-full bg-input border border-border rounded-lg px-3 py-1.5 text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Limite de músicas</label>
                    <input
                      value={editData.limiteMusicas || ""}
                      onChange={e => setEditData({ ...editData, limiteMusicas: e.target.value })}
                      className="w-full bg-input border border-border rounded-lg px-3 py-1.5 text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Personalização (%)</label>
                    <input
                      value={editData.personalizacaoPercent || ""}
                      onChange={e => setEditData({ ...editData, personalizacaoPercent: e.target.value })}
                      className="w-full bg-input border border-border rounded-lg px-3 py-1.5 text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Frase de Efeito</label>
                    <input
                      value={editData.fraseEfeito || ""}
                      onChange={e => setEditData({ ...editData, fraseEfeito: e.target.value })}
                      className="w-full bg-input border border-border rounded-lg px-3 py-1.5 text-foreground text-sm"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => handleSave(plan.id)} className="flex-1 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:bg-primary/90">
                      Salvar
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg border border-border">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-foreground">{plan.label}</h3>
                      <p className="text-xs text-muted-foreground uppercase">{plan.nome}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${plan.ativo ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                      {plan.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-primary mb-1">
                    {plan.preco === "0" ? "Grátis" : `R$ ${plan.preco}`}
                    {plan.preco !== "0" && <span className="text-sm text-muted-foreground font-normal">/mês</span>}
                  </p>
                  <p className="text-sm text-muted-foreground mb-1">Até {plan.limiteMusicas} músicas</p>
                  <p className="text-sm text-muted-foreground mb-3">{plan.personalizacaoPercent}% personalização</p>
                  {plan.fraseEfeito && <p className="text-xs italic text-muted-foreground border-t border-border pt-3 mb-3">{plan.fraseEfeito}</p>}
                  <button
                    onClick={() => startEdit(plan)}
                    className="w-full py-2 text-sm font-medium rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab 5: Gêneros ───────────────────────────────────────────────────────────

function GenresTab() {
  const { genres: cachedNames, invalidate } = useGenres();

  interface GenreRow { id: number; nome: string; ativo: boolean; ordem: number; }
  const [rows, setRows]       = useState<GenreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding]   = useState(false);
  const [editId, setEditId]   = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    fetch("/api/admin/genres", { credentials: "include" })
      .then(r => r.json())
      .then(d => setRows(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    const res = await fetch("/api/admin/genres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ nome: newName.trim() }),
    });
    setAdding(false);
    if (res.ok) {
      setNewName(""); invalidate(); load();
      toast({ title: "Gênero adicionado" });
    } else {
      const d = await res.json();
      toast({ title: d.error || "Erro ao adicionar", variant: "destructive" });
    }
  };

  const handleToggle = async (row: GenreRow) => {
    await fetch(`/api/admin/genres/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ativo: !row.ativo }),
    });
    invalidate(); load();
  };

  const handleSaveName = async (id: number) => {
    if (!editName.trim()) return;
    const res = await fetch(`/api/admin/genres/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ nome: editName.trim() }),
    });
    if (res.ok) {
      setEditId(null); invalidate(); load();
      toast({ title: "Gênero atualizado" });
    } else {
      const d = await res.json();
      toast({ title: d.error || "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number, nome: string) => {
    if (!confirm(`Remover o gênero "${nome}"? Músicas existentes não serão afetadas.`)) return;
    const res = await fetch(`/api/admin/genres/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      invalidate(); load();
      toast({ title: "Gênero removido" });
    } else {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Gêneros Musicais</h2>
        <p className="text-sm text-muted-foreground">Gerencie os gêneros disponíveis em filtros e cadastros</p>
      </div>

      {/* Formulário de adição */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Novo gênero... (ex: Funk, Rock)"
          className="flex-1 px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all"
        />
        <button
          type="submit"
          disabled={adding || !newName.trim()}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 text-sm"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Adicionar
        </button>
      </form>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhum gênero cadastrado.</div>
          ) : (
            <div className="divide-y divide-border/40">
              {rows.map(row => (
                <div key={row.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors group">
                  <GripVertical className="w-4 h-4 text-border shrink-0" />

                  {/* Nome — inline edit */}
                  {editId === row.id ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleSaveName(row.id); if (e.key === "Escape") setEditId(null); }}
                      className="flex-1 bg-input border border-primary rounded-lg px-3 py-1 text-sm text-foreground focus:outline-none"
                    />
                  ) : (
                    <span className={`flex-1 text-sm font-medium ${row.ativo ? "text-foreground" : "text-muted-foreground line-through"}`}>
                      {row.nome}
                    </span>
                  )}

                  {/* Badge ativo/inativo */}
                  <button
                    onClick={() => handleToggle(row)}
                    className={`px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${
                      row.ativo
                        ? "bg-green-500/15 text-green-400 hover:bg-red-500/15 hover:text-red-400"
                        : "bg-red-500/15 text-red-400 hover:bg-green-500/15 hover:text-green-400"
                    }`}
                    title={row.ativo ? "Clique para desativar" : "Clique para ativar"}
                  >
                    {row.ativo ? "Ativo" : "Inativo"}
                  </button>

                  {/* Ações */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {editId === row.id ? (
                      <>
                        <button onClick={() => handleSaveName(row.id)} className="p-1.5 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditId(null)} className="p-1.5 text-muted-foreground hover:bg-white/5 rounded-lg transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditId(row.id); setEditName(row.nome); }} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(row.id, row.nome)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Gêneros inativos ficam ocultos nos filtros e formulários. Músicas existentes com esse gênero não são afetadas.
      </p>
    </div>
  );
}

// ─── Tab 6: Interesses/Leads ──────────────────────────────────────────────────

function InterestsTab() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    fetch("/api/admin/recent-interests?limit=50", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setInterests(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: number) => {
    const res = await fetch(`/api/admin/interests/${id}/mark-read`, {
      method: "PUT",
      credentials: "include",
    });
    if (res.ok) {
      setInterests(prev => prev.map(i => i.id === id ? { ...i, lido: true } : i));
      toast({ title: "Marcado como lido" });
    }
  };

  const unread = interests.filter(i => !i.lido).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            Interesses / Leads
            {unread > 0 && (
              <span className="ml-3 px-2 py-0.5 bg-orange-500/20 text-orange-400 text-sm rounded-full font-medium">{unread} novos</span>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">Formulários de contato recebidos</p>
        </div>
        <button onClick={load} className="p-2 text-muted-foreground hover:text-primary transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : interests.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card border border-dashed border-border rounded-2xl">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Nenhum interesse recebido ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {interests.map((interest) => (
            <div
              key={interest.id}
              className={`bg-card border rounded-2xl p-5 transition-colors ${interest.lido ? "border-border/30 opacity-70" : "border-orange-500/30"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-bold text-foreground">{interest.nome}</h4>
                    {!interest.lido && (
                      <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-full font-bold">Novo</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{interest.email}</p>
                  {interest.telefone && <p className="text-sm text-muted-foreground">{interest.telefone}</p>}
                  {interest.mensagem && (
                    <p className="text-sm text-foreground/80 mt-2 bg-background/50 rounded-lg p-3 border border-border/30">
                      {interest.mensagem}
                    </p>
                  )}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {interest.contratarShow && (
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">Show</span>
                    )}
                    {interest.reservarMusica && (
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">Reservar Música</span>
                    )}
                    {interest.agendarReuniao && (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">Reunião</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(interest.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                {!interest.lido && (
                  <button
                    onClick={() => markRead(interest.id)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Marcar lido
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab 6: Configurações ─────────────────────────────────────────────────────

function SettingsTab() {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("mercadopago");

  const categories: { id: SettingsCategory; label: string; icon: React.ElementType; color: string }[] = [
    { id: "mercadopago", label: "MercadoPago", icon: CreditCard, color: "text-emerald-400" },
    { id: "r2", label: "Cloudflare R2", icon: Cloud, color: "text-sky-400" },
    { id: "portal", label: "Portal", icon: Globe, color: "text-purple-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Configurações</h2>
        <p className="text-sm text-muted-foreground">Integrações e dados da plataforma</p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeCategory === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <cat.icon className="w-4 h-4" />
            {cat.label}
          </button>
        ))}
      </div>

      <SettingsCategoryForm key={activeCategory} category={activeCategory} />
    </div>
  );
}

function SettingsCategoryForm({ category }: { category: SettingsCategory }) {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/settings/${category}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d: Setting[]) => {
        setSettings(Array.isArray(d) ? d : []);
        const initial: Record<string, string> = {};
        (Array.isArray(d) ? d : []).forEach(s => {
          initial[s.key] = s.rawValue || "";
        });
        setValues(initial);
      })
      .finally(() => setLoading(false));
  }, [category]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(values),
    });
    setSaving(false);
    if (res.ok) {
      toast({ title: "Configurações salvas com sucesso!" });
    } else {
      toast({ title: "Erro ao salvar configurações", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!settings.length) {
    return (
      <div className="text-center py-16 text-muted-foreground bg-card border border-dashed border-border rounded-2xl">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>Nenhuma configuração encontrada para esta categoria.</p>
        <p className="text-xs mt-2">Execute o seed para criar as configurações padrão.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
      {settings.map((s) => (
        <div key={s.key}>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-foreground">{s.key}</label>
            {s.isSecret && (
              <span className="text-xs text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full border border-border">
                Secreto
              </span>
            )}
          </div>
          {s.description && <p className="text-xs text-muted-foreground mb-2">{s.description}</p>}
          <div className="relative">
            <input
              type={s.isSecret && !revealed[s.key] ? "password" : "text"}
              value={values[s.key] ?? ""}
              onChange={(e) => setValues({ ...values, [s.key]: e.target.value })}
              placeholder={s.isSecret ? "••••••••" : `Valor de ${s.key}`}
              className="w-full px-4 py-2.5 bg-input border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-foreground text-sm pr-10"
            />
            {s.isSecret && (
              <button
                type="button"
                onClick={() => setRevealed({ ...revealed, [s.key]: !revealed[s.key] })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {revealed[s.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      ))}

      <div className="pt-2 border-t border-border/50">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Salvando..." : "Salvar Configurações"}
        </button>
      </div>
    </div>
  );
}
