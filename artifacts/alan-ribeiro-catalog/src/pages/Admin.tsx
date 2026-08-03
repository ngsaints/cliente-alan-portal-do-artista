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
  Layout, MapPin, ListMusic, Play, Image, Ticket, Percent, HelpCircle, ExternalLink,
  Mail, Gift, Send, Terminal, Target,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGenres } from "@/hooks/useGenres";
import { useCities } from "@/hooks/useCities";
import { Switch } from "@/components/ui/switch";

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
  couponCode: string | null;
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
  canCustomizeFont: boolean;
  canCustomizeBackground: boolean;
  canCustomizeTextColor: boolean;
  canCustomizePlayerStyle: boolean;
  canCustomizePlayerColor: boolean;
  canUploadBanner: boolean;
  canUploadProfilePhoto: boolean;
  aiCreditsLimit?: number;
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

interface Coupon {
  id: number;
  code: string;
  discountType: string;
  discountValue: string;
  minAmount: string | null;
  maxUses: string | null;
  usedCount: string;
  validFrom: string;
  validUntil: string | null;
  isActive: boolean;
  applicablePlans: string[] | null;
  description: string | null;
  createdAt: string;
}

type MainTab = "dashboard" | "songs" | "artists" | "plans" | "genres" | "interests" | "settings" | "banners" | "cities" | "playlists" | "galleries" | "coupons" | "email_marketing" | "server_logs";
type SettingsCategory = "asaas" | "r2" | "portal" | "demo" | "email" | "clarity" | "pixel";

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
    { id: "server_logs", label: "Logs do Servidor", icon: Terminal },
    { id: "banners", label: "Banners", icon: Layout },
    { id: "cities", label: "Cidades", icon: MapPin },
    { id: "playlists", label: "Playlists", icon: ListMusic },
    { id: "galleries", label: "Galeria", icon: Image },
    { id: "coupons", label: "Cupons", icon: Ticket },
    { id: "email_marketing", label: "E-mail Marketing", icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 w-full overflow-x-hidden">
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
          {activeTab === "settings" && <SettingsTab onNavigate={setActiveTab} />}
          {activeTab === "banners" && <BannersTab />}
          {activeTab === "cities" && <CitiesTab />}
          {activeTab === "playlists" && <PlaylistsTab />}
          {activeTab === "galleries" && <GalleriesTab />}
          {activeTab === "coupons" && <CouponsTab />}
          {activeTab === "email_marketing" && <EmailMarketingTab />}
          {activeTab === "server_logs" && <ServerLogsTab />}
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
            { label: "Config. Asaas", tab: "settings" as MainTab, icon: CreditCard, color: "text-emerald-400" },
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
      <div className="relative" style={{ position: 'relative' }}>
        <Search 
          className="text-muted-foreground pointer-events-none" 
          style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', zIndex: 10 }}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título, gênero ou compositor..."
          className="w-full pl-10 pr-10 py-2.5 bg-card border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-muted-foreground hover:text-foreground transition-colors"
            style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
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
        toast({ title: "Selecione um arquivo MP3", variant: "destructive" });
        return;
      }
      if (tipoMidia === "video" && !form.youtubeUrl) {
        toast({ title: "Informe o link do YouTube", variant: "destructive" });
        return;
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
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Arquivo de Áudio (MP3, WAV, M4A, etc.) *</label>
                    <label className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${mp3File ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-white/[0.02]"}`}>
                      {mp3File
                        ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                        : <Upload className="w-5 h-5 text-muted-foreground shrink-0" />}
                      <span className="text-sm text-muted-foreground truncate">
                        {mp3File ? mp3File.name : "Selecionar arquivo de áudio"}
                      </span>
                      <input type="file" accept="audio/*, .mp3, .wav, .m4a, .aac, .ogg, .flac, .wma" className="hidden"
                        onChange={(e) => setMp3File(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 px-4 py-3 bg-background/60 rounded-xl border border-border/50 text-xs text-muted-foreground">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 opacity-60" />
                    Para trocar o arquivo de áudio, delete esta música e adicione novamente.
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
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [grantArtistId, setGrantArtistId] = useState<number | null>(null);
  const [grantArtistName, setGrantArtistName] = useState("");
  const [grantPlano, setGrantPlano] = useState("premium");
  const [grantDuracao, setGrantDuracao] = useState("1");
  const [grantSaving, setGrantSaving] = useState(false);
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

  const handleOpenGrant = (a: Artist) => {
    setGrantArtistId(a.id);
    setGrantArtistName(a.name);
    setGrantPlano("premium");
    setGrantDuracao("1");
    setGrantModalOpen(true);
  };

  const handleGrantPlan = async () => {
    if (!grantArtistId) return;
    setGrantSaving(true);
    const res = await fetch(`/api/admin/artists/${grantArtistId}/grant-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ plano: grantPlano, duracaoMeses: grantDuracao }),
    });
    if (res.ok) {
      toast({ title: `Plano ${grantPlano} concedido por ${grantDuracao} mes(es)` });
      setGrantModalOpen(false);
      load();
    } else {
      const err = await res.json();
      toast({ title: err.error || "Erro ao conceder plano", variant: "destructive" });
    }
    setGrantSaving(false);
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
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Cupom</th>
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
                    <td className="px-4 py-3">
                      {a.couponCode ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-violet-500/20 text-violet-400" title="Plano contratado via cupom">
                          {a.couponCode}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
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
                            <button onClick={() => handleOpenGrant(a)} className="p-1.5 text-muted-foreground hover:text-violet-400 hover:bg-violet-400/10 rounded-lg transition-colors" title="Conceder plano">
                              <Gift className="w-4 h-4" />
                            </button>
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

      {grantModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4" onClick={() => setGrantModalOpen(false)}>
          <div className="bg-card border border-border/40 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-violet-400" />
                <h3 className="text-lg font-bold text-foreground">Conceder Plano</h3>
              </div>
              <button onClick={() => setGrantModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Artista: <span className="text-foreground font-medium">{grantArtistName}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Plano</label>
                <select
                  value={grantPlano}
                  onChange={(e) => setGrantPlano(e.target.value)}
                  className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  {PLANOS.filter(p => p !== "free").map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Duração</label>
                <select
                  value={grantDuracao}
                  onChange={(e) => setGrantDuracao(e.target.value)}
                  className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="1">1 mês</option>
                  <option value="3">3 meses</option>
                  <option value="6">6 meses</option>
                  <option value="12">12 meses</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setGrantModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl font-semibold bg-muted text-foreground hover:bg-muted/80 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGrantPlan}
                disabled={grantSaving}
                className="flex-1 py-2.5 rounded-xl font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {grantSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                Conceder
              </button>
            </div>
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
  const [showCreate, setShowCreate] = useState(false);
  const [createData, setCreateData] = useState<Partial<Plan>>({
    nome: "", label: "", preco: "", limiteMusicas: "", personalizacaoPercent: "",
    descricao: "", fraseEfeito: "", ativo: true,
    canCustomizeFont: true, canCustomizeBackground: true, canCustomizeTextColor: true,
    canCustomizePlayerStyle: true, canCustomizePlayerColor: true,
    canUploadBanner: false, canUploadProfilePhoto: false,
  });
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

  const handleCreate = async () => {
    if (!createData.nome || !createData.label) {
      toast({ title: "Nome e Label são obrigatórios", variant: "destructive" });
      return;
    }
    const res = await fetch("/api/admin/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(createData),
    });
    if (res.ok) {
      toast({ title: "Plano criado" });
      setShowCreate(false);
      setCreateData({
        nome: "", label: "", preco: "", limiteMusicas: "", personalizacaoPercent: "",
        descricao: "", fraseEfeito: "", ativo: true,
        canCustomizeFont: true, canCustomizeBackground: true, canCustomizeTextColor: true,
        canCustomizePlayerStyle: true, canCustomizePlayerColor: true,
        canUploadBanner: false, canUploadProfilePhoto: false,
      });
      load();
    } else {
      const d = await res.json();
      toast({ title: d.error || "Erro ao criar plano", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number, nome: string) => {
    if (!confirm(`Excluir plano "${nome}"?`)) return;
    const res = await fetch(`/api/admin/plans/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      toast({ title: "Plano excluído" });
      load();
    } else {
      toast({ title: "Erro ao excluir plano", variant: "destructive" });
    }
  };

  const PermissionCheckbox = ({ label, field, data, onChange }: { label: string; field: keyof Plan; data: Partial<Plan>; onChange: (v: Partial<Plan>) => void }) => (
    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
      <input
        type="checkbox"
        checked={data[field] as boolean ?? false}
        onChange={(e) => onChange({ ...data, [field]: e.target.checked })}
        className="accent-primary w-4 h-4"
      />
      {label}
    </label>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Planos</h2>
          <p className="text-sm text-muted-foreground">Gerencie os planos disponíveis para artistas</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 text-muted-foreground hover:text-primary transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-bold text-sm rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo Plano
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-foreground">Criar Novo Plano</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Nome (ID único)</label>
              <input value={createData.nome || ""} onChange={e => setCreateData({ ...createData, nome: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-1.5 text-foreground text-sm" placeholder="ex: starter" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Label (exibição)</label>
              <input value={createData.label || ""} onChange={e => setCreateData({ ...createData, label: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-1.5 text-foreground text-sm" placeholder="Starter" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Preço (R$)</label>
              <input value={createData.preco || ""} onChange={e => setCreateData({ ...createData, preco: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-1.5 text-foreground text-sm" placeholder="29.90" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Limite músicas</label>
              <input value={createData.limiteMusicas || ""} onChange={e => setCreateData({ ...createData, limiteMusicas: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-1.5 text-foreground text-sm" placeholder="50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Personalização (%)</label>
              <input value={createData.personalizacaoPercent || ""} onChange={e => setCreateData({ ...createData, personalizacaoPercent: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-1.5 text-foreground text-sm" placeholder="50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Consultas IA / mês</label>
              <input type="number" value={createData.aiCreditsLimit || ""} onChange={e => setCreateData({ ...createData, aiCreditsLimit: parseInt(e.target.value) || 0 })} className="w-full bg-input border border-border rounded-lg px-3 py-1.5 text-foreground text-sm" placeholder="10" />
            </div>
            <div className="lg:col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Frase de efeito</label>
              <input value={createData.fraseEfeito || ""} onChange={e => setCreateData({ ...createData, fraseEfeito: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-1.5 text-foreground text-sm" placeholder="Texto motivacional" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-2">Permissões de Personalização</label>
            <div className="flex flex-wrap gap-4">
              <PermissionCheckbox label="Fonte" field="canCustomizeFont" data={createData} onChange={setCreateData} />
              <PermissionCheckbox label="Cor de Fundo" field="canCustomizeBackground" data={createData} onChange={setCreateData} />
              <PermissionCheckbox label="Cor do Texto" field="canCustomizeTextColor" data={createData} onChange={setCreateData} />
              <PermissionCheckbox label="Estilo do Player" field="canCustomizePlayerStyle" data={createData} onChange={setCreateData} />
              <PermissionCheckbox label="Cor do Player" field="canCustomizePlayerColor" data={createData} onChange={setCreateData} />
              <PermissionCheckbox label="Upload Banner" field="canUploadBanner" data={createData} onChange={setCreateData} />
              <PermissionCheckbox label="Upload Foto Perfil" field="canUploadProfilePhoto" data={createData} onChange={setCreateData} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-6 py-2 bg-primary text-primary-foreground font-bold text-sm rounded-lg hover:bg-primary/90">
              Criar Plano
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg border border-border">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className={`bg-card border rounded-2xl p-5 ${editingId === plan.id ? "border-primary" : "border-border/50"}`}>
              {editingId === plan.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Label</label>
                      <input value={editData.label || ""} onChange={e => setEditData({ ...editData, label: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-1.5 text-foreground text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Preço (R$)</label>
                      <input value={editData.preco || ""} onChange={e => setEditData({ ...editData, preco: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-1.5 text-foreground text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Limite músicas</label>
                      <input value={editData.limiteMusicas || ""} onChange={e => setEditData({ ...editData, limiteMusicas: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-1.5 text-foreground text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Personalização (%)</label>
                      <input value={editData.personalizacaoPercent || ""} onChange={e => setEditData({ ...editData, personalizacaoPercent: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-1.5 text-foreground text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Consultas IA / mês</label>
                      <input type="number" value={editData.aiCreditsLimit || ""} onChange={e => setEditData({ ...editData, aiCreditsLimit: parseInt(e.target.value as any) || 0 })} className="w-full bg-input border border-border rounded-lg px-3 py-1.5 text-foreground text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Frase de Efeito</label>
                    <input value={editData.fraseEfeito || ""} onChange={e => setEditData({ ...editData, fraseEfeito: e.target.value })} className="w-full bg-input border border-border rounded-lg px-3 py-1.5 text-foreground text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">Permissões de Personalização</label>
                    <div className="flex flex-wrap gap-3">
                      <PermissionCheckbox label="Fonte" field="canCustomizeFont" data={editData} onChange={setEditData} />
                      <PermissionCheckbox label="Fundo" field="canCustomizeBackground" data={editData} onChange={setEditData} />
                      <PermissionCheckbox label="Cor Texto" field="canCustomizeTextColor" data={editData} onChange={setEditData} />
                      <PermissionCheckbox label="Player" field="canCustomizePlayerStyle" data={editData} onChange={setEditData} />
                      <PermissionCheckbox label="Cor Player" field="canCustomizePlayerColor" data={editData} onChange={setEditData} />
                      <PermissionCheckbox label="Banner" field="canUploadBanner" data={editData} onChange={setEditData} />
                      <PermissionCheckbox label="Foto" field="canUploadProfilePhoto" data={editData} onChange={setEditData} />
                    </div>
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
                  <p className="text-sm text-muted-foreground mb-1">Até {plan.limiteMusicas} músicas · {plan.personalizacaoPercent}% personalização · {plan.aiCreditsLimit ?? 10} consultas IA/mês</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {plan.canCustomizeFont && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">Fonte</span>}
                    {plan.canCustomizeBackground && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">Fundo</span>}
                    {plan.canCustomizeTextColor && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">Cor Texto</span>}
                    {plan.canCustomizePlayerStyle && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">Player</span>}
                    {plan.canCustomizePlayerColor && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">Cor Player</span>}
                    {plan.canUploadBanner && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">Banner</span>}
                    {plan.canUploadProfilePhoto && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">Foto</span>}
                  </div>
                  {plan.fraseEfeito && <p className="text-xs italic text-muted-foreground border-t border-border pt-3 mb-3">{plan.fraseEfeito}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(plan)} className="flex-1 py-2 text-sm font-medium rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors flex items-center justify-center gap-2">
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button onClick={() => handleDelete(plan.id, plan.nome)} className="px-3 py-2 text-sm text-muted-foreground hover:text-destructive rounded-lg border border-border hover:border-destructive/40 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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

function SettingsTab({ onNavigate }: { onNavigate?: (tab: MainTab) => void }) {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("asaas");

  const categories: { id: SettingsCategory; label: string; icon: React.ElementType; color: string }[] = [
    { id: "demo", label: "Página Demo", icon: Eye, color: "text-yellow-400" },
    { id: "asaas", label: "Asaas", icon: CreditCard, color: "text-emerald-400" },
    { id: "r2", label: "Cloudflare R2", icon: Cloud, color: "text-sky-400" },
    { id: "portal", label: "Portal", icon: Globe, color: "text-purple-400" },
    { id: "email", label: "Email", icon: Mail, color: "text-red-400" },
    { id: "clarity", label: "Microsoft Clarity", icon: BarChart3, color: "text-indigo-400" },
    { id: "pixel", label: "Pixels & Rastreamento", icon: Target, color: "text-emerald-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Configurações</h2>
        <p className="text-sm text-muted-foreground">Integrações e dados da plataforma</p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none whitespace-nowrap -mx-4 px-4 sm:mx-0 sm:px-0">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 transition-all ${
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

      <SettingsCategoryForm key={activeCategory} category={activeCategory} onNavigate={onNavigate} />

      {activeCategory === "portal" && (
        /* Hero Section Settings */
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg text-foreground">Hero (Página Inicial)</h3>
          </div>
          <p className="text-xs text-muted-foreground">Texto principal exibido no topo da página inicial.</p>
          <HeroSettingsForm />
        </div>
      )}
    </div>
  );
}

function AddSettingForm({ category, onAdd }: { category: SettingsCategory; onAdd: (key: string, value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-card border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
      >
        <Plus className="w-4 h-4" />
        Adicionar Chave
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={newKey}
        onChange={(e) => setNewKey(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
        placeholder="chave (ex: resend_api_key)"
        className="w-44 px-3 py-2 bg-input border border-border rounded-lg text-xs text-foreground font-mono"
      />
      <input
        type="text"
        value={newValue}
        onChange={(e) => setNewValue(e.target.value)}
        placeholder="valor"
        className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-xs text-foreground"
      />
      <button
        onClick={() => { if (newKey) { onAdd(newKey, newValue); setOpen(false); setNewKey(""); setNewValue(""); } }}
        disabled={!newKey}
        className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold disabled:opacity-50"
      >
        <Plus className="w-3 h-3" /> OK
      </button>
      <button
        onClick={() => { setOpen(false); setNewKey(""); setNewValue(""); }}
        className="p-2 text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

const SETTING_LABELS: Record<string, string> = {
  // Portal / Geral
  portal_name: "Nome do portal",
  portal_url: "URL do portal",
  portal_email: "E-mail de contato",
  artist_name: "Nome do artista (Padrão)",
  vip_password: "Senha da Área VIP",
  suporte_instagram: "Instagram de Suporte",
  suporte_whatsapp: "WhatsApp de Suporte",
  suporte_email: "E-mail de Suporte",
  openai_enabled: "Ativar Mentora Virtual (Vivi)",
  openai_api_key: "Chave de API OpenAI (Vivi)",
  footer_copyright: "Rodapé: Copyright",
  landing_video_url: "Landing: URL do Vídeo (YouTube)",
  landing_hero_video_url: "Landing: URL do Vídeo do Hero (YouTube)",
  landing_hero_title: "Landing: Título Principal",
  landing_hero_subtitle: "Landing: Subtítulo",
  landing_hero_cta: "Landing: Texto do Botão (CTA)",
  footer_founder_description: "Rodapé: Descrição do Autor (Alan Ribeiro)",
  footer_copyright_protection: "Rodapé: Proteção de Direitos Autorais",
  footer_platform_tagline: "Rodapé: Slogan da Plataforma",
  
  // Microsoft Clarity
  clarity_project_id: "ID do Projeto Microsoft Clarity",

  // Pixels & Rastreamento
  pixel_meta_id: "ID do Meta / Facebook Pixel (ex: 123456789012345)",
  pixel_google_id: "ID do Google Tag Manager ou Analytics (ex: GTM-XXXXXX ou G-XXXXXX)",
  pixel_tiktok_id: "ID do TikTok Pixel (ex: C1234567890)",
  pixel_custom_head_script: "Script de Rastreamento / Pixel Customizado (<head>)",
  pixel_custom_body_script: "Script de Rastreamento / Pixel Customizado (<body>)",
  
  // Asaas
  asaas_access_token: "Token de Acesso Asaas",
  asaas_sandbox: "Modo de Sandbox Asaas",

  // MercadoPago
  mp_access_token: "Token de Acesso Mercado Pago",
  mp_public_key: "Chave Pública Mercado Pago",

  // E-mail
  smtp_host: "Servidor SMTP",
  smtp_port: "Porta SMTP",
  smtp_user: "Usuário SMTP",
  smtp_pass: "Senha SMTP",
  email_from: "Remetente de E-mail (from)",

  // Demo
  demo_capa_url: "Foto de perfil",
  demo_banner_url: "Carrossel de banners",
  demo_name: "Nome do artista",
  demo_profissao: "Profissão",
  demo_cidade: "Cidade",
  demo_contato: "Telefone / WhatsApp",
  demo_email: "E-mail",
  demo_instagram: "Instagram",
  demo_tiktok: "TikTok",
  demo_spotify: "Spotify",
  demo_cor: "Cor tema",
};

function getSettingLabel(key: string): string {
  return SETTING_LABELS[key] || key;
}

function getSettingDescription(key: string, defaultDesc: string): string {
  if (key === "demo_capa_url") {
    return "Foto de perfil do artista (redonda).";
  }
  return defaultDesc;
}

function SettingsCategoryForm({ category, onNavigate }: { category: SettingsCategory; onNavigate?: (tab: MainTab) => void }) {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [demoFiles, setDemoFiles] = useState<Record<string, File>>({});
  const [demoBannersList, setDemoBannersList] = useState<{ id: string; url?: string; file?: File; filePreview?: string; link: string }[]>([]);
  const { toast } = useToast();

  const loadSettings = () => {
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

        if (category === "demo") {
          const bannerSetting = (Array.isArray(d) ? d : []).find(s => s.key === "demo_banner_url");
          const val = bannerSetting?.rawValue || "";
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) {
              setDemoBannersList(parsed.map((b, idx) => ({ id: String(idx), url: b.url, link: b.link || "" })));
            } else {
              setDemoBannersList(val ? [{ id: "1", url: val, link: "" }] : []);
            }
          } catch {
            setDemoBannersList(val ? [{ id: "1", url: val, link: "" }] : []);
          }
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSettings();
  }, [category]);

  const handleSave = async () => {
    setSaving(true);

    const isDemoWithFiles = category === "demo" && (Object.keys(demoFiles).length > 0 || demoBannersList.some(b => b.file));

    if (category === "demo") {
      const formData = new FormData();
      for (const [key, value] of Object.entries(values)) {
        if (key === "demo_banner_url" || key === "demo_capa_url" || key === "demo_banners_metadata") continue;
        formData.append(key, value);
      }

      if (demoFiles["demo_capa_url"]) {
        formData.append("demo_capa_url", demoFiles["demo_capa_url"]);
      }

      const metadata: any[] = [];
      let newFileCount = 0;

      demoBannersList.forEach((item) => {
        if (item.file) {
          metadata.push({ isNew: true, fileIndex: newFileCount, link: item.link });
          formData.append("demo_banner_url", item.file);
          newFileCount++;
        } else if (item.url) {
          metadata.push({ url: item.url, link: item.link });
        }
      });

      formData.append("demo_banners_metadata", JSON.stringify(metadata));

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        credentials: "include",
        body: formData,
      });
      setSaving(false);
      if (res.ok) {
        setDemoFiles({});
        toast({ title: "Configurações salvas com sucesso!" });
        loadSettings();
      } else {
        toast({ title: "Erro ao salvar configurações", variant: "destructive" });
      }
    } else if (isDemoWithFiles) {
      const formData = new FormData();
      for (const [key, value] of Object.entries(values)) {
        formData.append(key, value);
      }
      for (const [key, file] of Object.entries(demoFiles)) {
        formData.append(key, file);
      }
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        credentials: "include",
        body: formData,
      });
      setSaving(false);
      if (res.ok) {
        setDemoFiles({});
        toast({ title: "Configurações salvas com sucesso!" });
        loadSettings();
      } else {
        toast({ title: "Erro ao salvar configurações", variant: "destructive" });
      }
    } else {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      setSaving(false);
      if (res.ok) {
        toast({ title: "Configurações salvas com sucesso!" });
        loadSettings();
      } else {
        toast({ title: "Erro ao salvar configurações", variant: "destructive" });
      }
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
        <p className="text-xs mt-2 mb-4">Execute o seed ou adicione uma nova chave manualmente.</p>
        <AddSettingForm category={category} onAdd={(key, value) => {
          const newSetting: Setting = { id: 0, category, key, value, rawValue: value, isSecret: category === "asaas" || key.includes("api_key") || key.includes("secret") || key.includes("token"), description: "", updatedAt: new Date().toISOString() };
          setSettings([newSetting]);
          setValues({ ...values, [key]: value });
        }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {category === "clarity" && (
        <div className="bg-gradient-to-r from-indigo-900/30 to-indigo-800/10 border border-indigo-500/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-indigo-400">
            <HelpCircle className="w-5 h-5" />
            <h3 className="font-bold text-lg">Como Configurar o Microsoft Clarity</h3>
          </div>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Acesse o painel do <a href="https://clarity.microsoft.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-1">Microsoft Clarity <ExternalLink className="w-3 h-3" /></a></li>
            <li>Crie um novo projeto ou selecione um existente.</li>
            <li>Vá em <strong>Settings</strong> &gt; <strong>Overview</strong> e copie a chave do <strong>Project ID</strong> (código com cerca de 10 caracteres).</li>
            <li>Cole o ID no campo `clarity_project_id` abaixo e salve.</li>
          </ol>
        </div>
      )}
      {category === "asaas" && (
        <div className="bg-gradient-to-r from-emerald-900/30 to-emerald-800/10 border border-emerald-500/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <HelpCircle className="w-5 h-5" />
            <h3 className="font-bold text-lg">Como Configurar o Asaas</h3>
          </div>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Acesse <a href="https://www.asaas.com/config/integrations" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline inline-flex items-center gap-1">Asaas Integrações <ExternalLink className="w-3 h-3" /></a> e copie sua <strong className="text-foreground">API Key</strong></li>
            <li>Cole a API Key no campo <code className="bg-black/30 px-1 py-0.5 rounded">asaas_api_key</code></li>
            <li>Marque <code className="bg-black/30 px-1 py-0.5 rounded">asaas_sandbox</code> como <strong className="text-foreground">true</strong> para testes ou <strong className="text-foreground">false</strong> para produção</li>
            <li>Configure um <strong className="text-foreground">Webhook</strong> no painel Asaas apontando para: <code className="bg-black/30 px-1 py-0.5 rounded">https://SEU_DOMINIO/api/webhooks/asaas</code></li>
            <li>Defina um token secreto no webhook e cole no campo <code className="bg-black/30 px-1 py-0.5 rounded">asaas_webhook_token</code></li>
          </ol>
          <div className="flex items-center gap-2 pt-2 border-t border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-300">Após salvar, artistas poderão assinar planos via PIX, cartão ou boleto</span>
          </div>
        </div>
      )}
      {category === "r2" && (
        <div className="bg-gradient-to-r from-sky-900/30 to-sky-800/10 border border-sky-500/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sky-400">
            <HelpCircle className="w-5 h-5" />
            <h3 className="font-bold text-lg">Como Configurar o Cloudflare R2</h3>
          </div>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Acesse <a href="https://dash.cloudflare.com/r2" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline inline-flex items-center gap-1">Cloudflare R2 <ExternalLink className="w-3 h-3" /></a></li>
            <li>Crie um bucket (ex: <code className="bg-black/30 px-1 py-0.5 rounded">portal-do-artista</code>) e configure como público</li>
            <li>Gerar API Token em <strong className="text-foreground">Manage R2 API Tokens</strong> com permissão de Leitura e Escrita</li>
            <li>Cole <strong className="text-foreground">Account ID</strong>, <strong className="text-foreground">Access Key ID</strong> e <strong className="text-foreground">Secret Access Key</strong> nos campos correspondentes</li>
            <li>Informe o nome do bucket e a <strong className="text-foreground">URL pública</strong> do bucket (ex: <code className="bg-black/30 px-1 py-0.5 rounded">https://seu-bucket.r2.dev</code>)</li>
          </ol>
        </div>
      )}
      {category === "email" && (
        <div className="bg-gradient-to-r from-red-900/30 to-red-800/10 border border-red-500/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-red-400">
            <HelpCircle className="w-5 h-5" />
            <h3 className="font-bold text-lg">Como Configurar o Resend (Email)</h3>
          </div>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Acesse <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline inline-flex items-center gap-1">Resend API Keys <ExternalLink className="w-3 h-3" /></a> e crie uma nova API Key</li>
            <li>Cole a API Key no campo <code className="bg-black/30 px-1 py-0.5 rounded">resend_api_key</code></li>
            <li>Configure o remetente no campo <code className="bg-black/30 px-1 py-0.5 rounded">email_from</code> (ex: <code className="bg-black/30 px-1 py-0.5 rounded">Portal do Artista &lt;contato@seudominio.com&gt;</code>)</li>
            <li>No painel do Resend, <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline inline-flex items-center gap-1">adicione seu domínio <ExternalLink className="w-3 h-3" /></a> e verifique os registros DNS</li>
          </ol>
        </div>
      )}
      {category === "pixel" && (
        <div className="bg-gradient-to-r from-emerald-900/30 to-teal-800/10 border border-emerald-500/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <HelpCircle className="w-5 h-5" />
            <h3 className="font-bold text-lg">Como Configurar Pixels de Rastreamento (Meta, Google & TikTok)</h3>
          </div>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li><strong>Meta / Facebook Pixel ID</strong>: Cole apenas o ID numérico do seu Pixel (ex: <code className="bg-black/30 px-1 py-0.5 rounded">123456789012345</code>). O portal ativará o evento PageView automaticamente.</li>
            <li><strong>Google Tag Manager / Analytics ID</strong>: Cole o ID da tag (ex: <code className="bg-black/30 px-1 py-0.5 rounded">G-XXXXXXXXXX</code> ou <code className="bg-black/30 px-1 py-0.5 rounded">GTM-XXXXXXX</code>).</li>
            <li><strong>TikTok Pixel ID</strong>: Cole o código ID do Pixel TikTok (ex: <code className="bg-black/30 px-1 py-0.5 rounded">C1234567890</code>).</li>
            <li><strong>Script de Pixel Customizado</strong>: Se sua ferramenta fornecer um código em texto completo (<code className="bg-black/30 px-1 py-0.5 rounded">&lt;script&gt;...&lt;/script&gt;</code>), cole nos campos de Script Customizado (<code className="bg-black/30 px-1 py-0.5 rounded">&lt;head&gt;</code> ou <code className="bg-black/30 px-1 py-0.5 rounded">&lt;body&gt;</code>).</li>
          </ol>
        </div>
      )}
      {category === "portal" && (
        <div className="bg-gradient-to-r from-purple-900/30 to-purple-800/10 border border-purple-500/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-purple-400">
            <HelpCircle className="w-5 h-5" />
            <h3 className="font-bold text-lg">Configurações Gerais do Portal</h3>
          </div>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li><code className="bg-black/30 px-1 py-0.5 rounded">portal_name</code> — Nome exibido no site</li>
            <li><code className="bg-black/30 px-1 py-0.5 rounded">portal_url</code> — URL canônica (ex: https://portaldoartista.com)</li>
            <li><code className="bg-black/30 px-1 py-0.5 rounded">portal_email</code> — Email de contato principal</li>
            <li><code className="bg-black/30 px-1 py-0.5 rounded">suporte_instagram</code> — Instagram de suporte exibido no rodapé</li>
            <li><code className="bg-black/30 px-1 py-0.5 rounded">suporte_whatsapp</code> — WhatsApp de contato para suporte e dúvidas</li>
            <li><code className="bg-black/30 px-1 py-0.5 rounded">suporte_email</code> — E-mail de suporte</li>
            <li><code className="bg-black/30 px-1 py-0.5 rounded">openai_enabled</code> — Ativa a mentora virtual Vivi para os artistas (true/false)</li>
            <li><code className="bg-black/30 px-1 py-0.5 rounded">openai_api_key</code> — Chave de API OpenAI para a mentora Vivi</li>
          </ul>
        </div>
      )}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        {settings.map((s) => (
          <div key={s.key}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-foreground">{getSettingLabel(s.key)}</label>
              {s.isSecret && (
                <span className="text-xs text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full border border-border">
                  Secreto
                </span>
              )}
            </div>
            {s.description && <p className="text-xs text-muted-foreground mb-2">{getSettingDescription(s.key, s.description)}</p>}
            {s.key === "asaas_sandbox" || s.key === "openai_enabled" ? (
              <div className="flex items-center gap-3">
                <Switch
                  checked={values[s.key] === "true"}
                  onCheckedChange={(checked) => setValues({ ...values, [s.key]: checked ? "true" : "false" })}
                />
                <span className="text-sm text-muted-foreground">
                  {s.key === "asaas_sandbox" 
                    ? (values[s.key] === "true" ? "Sandbox (testes)" : "Produção")
                    : (values[s.key] === "true" ? "Ativada" : "Desativada")}
                </span>
              </div>
            ) : s.key.startsWith("pixel_custom_") || s.key.endsWith("_script") ? (
              <textarea
                value={values[s.key] ?? ""}
                onChange={(e) => setValues({ ...values, [s.key]: e.target.value })}
                placeholder="Cole o código do script aqui (<script>...</script>)"
                rows={5}
                className="w-full px-4 py-2.5 bg-input border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-foreground text-xs font-mono"
              />
            ) : category === "demo" && s.key === "demo_cor" ? (
              <div className="flex gap-2">
                <input
                  type="color"
                  value={values[s.key] || "#f5d76e"}
                  onChange={(e) => setValues({ ...values, [s.key]: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer flex-shrink-0"
                />
                <input
                  type="text"
                  value={values[s.key] ?? ""}
                  onChange={(e) => setValues({ ...values, [s.key]: e.target.value })}
                  placeholder="#f5d76e"
                  className="flex-1 px-4 py-2.5 bg-input border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-foreground text-sm"
                />
              </div>
            ) : category === "demo" && s.key === "demo_banner_url" ? (
              <div className="space-y-4 bg-background/30 p-4 rounded-2xl border border-border/60">
                <p className="text-[11px] text-muted-foreground">
                  Adicione múltiplas imagens para criar um carrossel de publicidade na Página Demo. Cada imagem pode ter um link de redirecionamento.
                </p>
                <p className="text-[11px] font-medium text-primary">
                  Tamanho recomendado: 1200x400px (proporção 3:1) para melhor preenchimento.
                </p>

                {/* Banner list */}
                {demoBannersList.length > 0 && (
                  <div className="space-y-3">
                    {demoBannersList.map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-4 bg-card border border-border p-3 rounded-xl">
                        {/* Thumbnail */}
                        <div className="w-20 h-10 rounded-lg overflow-hidden border border-border bg-muted flex-shrink-0">
                          <img
                            src={item.filePreview || item.url}
                            alt={`Banner ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Link input */}
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Link do botão (ex: https://...)"
                            value={item.link}
                            onChange={(e) => {
                              const newList = [...demoBannersList];
                              newList[idx].link = e.target.value;
                              setDemoBannersList(newList);
                            }}
                            className="w-full px-3 py-1.5 bg-input border border-border rounded-lg text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => {
                            setDemoBannersList(demoBannersList.filter(b => b.id !== item.id));
                          }}
                          className="p-1.5 hover:bg-destructive/15 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add banner input */}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file) {
                        const reader = new FileReader();
                        const id = Math.random().toString(36).substring(7);
                        reader.onloadend = () => {
                          setDemoBannersList(prev => [
                            ...prev,
                            { id, file, filePreview: reader.result as string, link: "" }
                          ]);
                        };
                        reader.readAsDataURL(file);
                        e.target.value = "";
                      }
                    }}
                    className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-foreground text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:bg-primary/10 file:text-primary file:border-0 file:cursor-pointer"
                  />
                </div>
              </div>
            ) : category === "demo" && s.key === "demo_capa_url" ? (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file) {
                      setDemoFiles({ ...demoFiles, [s.key]: file });
                      const reader = new FileReader();
                      reader.onloadend = () => setValues({ ...values, [s.key]: reader.result as string });
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-foreground text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:bg-primary/10 file:text-primary file:border-0 file:cursor-pointer"
                />
                 {values[s.key] && (values[s.key].startsWith("http") || values[s.key].startsWith("data:") || values[s.key].startsWith("/uploads") || values[s.key].startsWith("/")) && (
                  <div className="mt-2 relative inline-block">
                    <img src={values[s.key]} alt={s.key} className="h-24 w-24 object-cover rounded-lg border border-border" />
                    <button
                      type="button"
                      onClick={() => { setValues({ ...values, [s.key]: "" }); setDemoFiles({ ...demoFiles, [s.key]: undefined as any }); }}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center hover:bg-destructive/80"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative" style={{ position: 'relative' }}>
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
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    {revealed[s.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        <div className="pt-2 border-t border-border/50 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Salvando..." : "Salvar Configurações"}
          </button>
          <AddSettingForm category={category} onAdd={(key, value) => {
            const newSetting: Setting = { id: 0, category, key, value, rawValue: value, isSecret: key.includes("api_key") || key.includes("secret") || key.includes("token"), description: "", updatedAt: new Date().toISOString() };
            setSettings([...settings, newSetting]);
            setValues({ ...values, [key]: value });
          }} />
        </div>
      </div>
    </div>
  );
}

// ─── Hero Settings Form ─────────────────────────────────────────────────────────

function HeroSettingsForm() {
  const [values, setValues] = useState({ heroTitle: "", heroSubtitle: "", heroCTA: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setValues({
          heroTitle: d.heroTitle || "",
          heroSubtitle: d.heroSubtitle || "",
          heroCTA: d.heroCTA || "",
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          heroTitle: values.heroTitle || null,
          heroSubtitle: values.heroSubtitle || null,
          heroCTA: values.heroCTA || null,
        }),
      });
      if (res.ok) {
        toast({ title: "Hero atualizado com sucesso!" });
      } else {
        toast({ title: "Erro ao salvar hero", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao salvar hero", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Título</label>
        <input
          type="text"
          value={values.heroTitle}
          onChange={(e) => setValues({ ...values, heroTitle: e.target.value })}
          placeholder='A plataforma completa para'
          className="w-full px-4 py-2.5 bg-input border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-foreground text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">Ex: "A plataforma completa para"</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Subtítulo (destaque)</label>
        <input
          type="text"
          value={values.heroSubtitle}
          onChange={(e) => setValues({ ...values, heroSubtitle: e.target.value })}
          placeholder='cantores e compositores'
          className="w-full px-4 py-2.5 bg-input border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-foreground text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">Ex: "cantores e compositores" (parte destacada em gradiente)</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Texto CTA</label>
        <textarea
          value={values.heroCTA}
          onChange={(e) => setValues({ ...values, heroCTA: e.target.value })}
          placeholder='Cadastre suas músicas, monte seu portfólio musical e seja encontrado por contratantes e fãs em todo o Brasil.'
          rows={3}
          className="w-full px-4 py-2.5 bg-input border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-foreground text-sm resize-none"
        />
        <p className="text-xs text-muted-foreground mt-1">Texto de chamada abaixo do título.</p>
      </div>
      <div className="pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Salvando..." : "Salvar Hero"}
        </button>
      </div>
    </div>
  );
}

// ─── Tab 8: Banners ───────────────────────────────────────────────────────────

interface CtaBanner {
  id: number;
  texto: string;
  corFundo: string;
  corTexto: string;
  botaoTexto: string | null;
  botaoLink: string | null;
  imagemFundoUrl: string | null;
  ordem: number;
  ativo: boolean;
  intervaloSegundos: number;
}

function BannersTab() {
  const [banners, setBanners] = useState<CtaBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<CtaBanner | null>(null);
  const { toast } = useToast();

  const loadBanners = () => {
    setLoading(true);
    fetch("/api/admin/banners", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setBanners(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadBanners(); }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Deletar este banner?")) return;
    const res = await fetch(`/api/admin/banners/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      toast({ title: "Banner deletado" });
      loadBanners();
    } else {
      toast({ title: "Erro ao deletar", variant: "destructive" });
    }
  };

  const handleToggleAtivo = async (banner: CtaBanner) => {
    const res = await fetch(`/api/admin/banners/${banner.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...banner, ativo: !banner.ativo }),
    });
    if (res.ok) {
      loadBanners();
    } else {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Banners CTA</h2>
          <p className="text-sm text-muted-foreground">Gerencie os banners de chamada para ação</p>
        </div>
        <button
          onClick={() => { setEditingBanner(null); setShowModal(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all text-sm shadow-[0_0_16px_rgba(245,197,24,0.25)]"
        >
          <Plus className="w-4 h-4" />
          Novo Banner
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : banners.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card border border-dashed border-border rounded-2xl">
          <Layout className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Nenhum banner criado ainda.</p>
          <p className="text-sm mt-1">Clique em "Novo Banner" para criar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="relative rounded-2xl overflow-hidden border border-border bg-card"
              style={{ minHeight: "180px" }}
            >
              <div
                className="p-6 flex flex-col justify-center items-center text-center"
                style={{
                  background: banner.imagemFundoUrl ? `url(${banner.imagemFundoUrl}) center/cover` : banner.corFundo,
                  minHeight: "180px",
                }}
              >
                <div className="absolute inset-0 bg-black/30" />
                <p className="relative z-10 text-lg font-bold" style={{ color: banner.corTexto }}>
                  {banner.texto}
                </p>
                {banner.botaoTexto && (
                  <span
                    className="relative z-10 mt-3 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-bold"
                  >
                    {banner.botaoTexto}
                  </span>
                )}
              </div>

              <div className="p-4 border-t border-border relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Ordem: {banner.ordem} • {banner.intervaloSegundos}s
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${banner.ativo ? "bg-green-500/20 text-green-400" : "bg-zinc-500/20 text-zinc-400"}`}>
                    {banner.ativo ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => { setEditingBanner(banner); setShowModal(true); }}
                    className="flex-1 py-1.5 text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 inline mr-1" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggleAtivo(banner)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${banner.ativo ? "text-orange-400 hover:bg-orange-400/10" : "text-green-400 hover:bg-green-400/10"}`}
                  >
                    {banner.ativo ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    onClick={() => handleDelete(banner.id)}
                    className="py-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <BannerModal
          banner={editingBanner}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadBanners(); }}
        />
      )}
    </div>
  );
}

function BannerModal({ banner, onClose, onSaved }: { banner: CtaBanner | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    texto: banner?.texto || "",
    corFundo: banner?.corFundo || "#1a1a2e",
    corTexto: banner?.corTexto || "#ffffff",
    botaoTexto: banner?.botaoTexto || "",
    botaoLink: banner?.botaoLink || "/artista/login?tab=cadastro",
    ordem: banner?.ordem || 0,
    ativo: banner?.ativo ?? true,
    intervaloSegundos: banner?.intervaloSegundos || 4,
  });
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const url = banner ? `/api/admin/banners/${banner.id}` : "/api/admin/banners";
    const method = banner ? "PUT" : "POST";

    const formData = new FormData();
    formData.append("texto", form.texto);
    formData.append("corFundo", form.corFundo);
    formData.append("corTexto", form.corTexto);
    formData.append("botaoTexto", form.botaoTexto);
    formData.append("botaoLink", form.botaoLink);
    formData.append("ordem", String(form.ordem));
    formData.append("ativo", String(form.ativo));
    formData.append("intervaloSegundos", String(form.intervaloSegundos));
    if (imagemFile) {
      formData.append("imagemFile", imagemFile);
    }

    const res = await fetch(url, {
      method,
      credentials: "include",
      body: formData,
    });

    setSaving(false);

    if (res.ok) {
      toast({ title: banner ? "Banner atualizado!" : "Banner criado!" });
      onSaved();
    } else {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl z-10 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">
            {banner ? "Editar Banner" : "Novo Banner"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div
            className="relative rounded-xl p-6 text-center bg-cover bg-center"
            style={{
              background: imagemPreview
                ? `url(${imagemPreview}) center/cover`
                : banner?.imagemFundoUrl
                  ? `url(${banner.imagemFundoUrl}) center/cover`
                  : form.corFundo,
              minHeight: "140px",
            }}
          >
            <div className="absolute inset-0 bg-black/30 rounded-xl" />
            <p className="relative z-10 text-lg font-bold" style={{ color: form.corTexto }}>
              {form.texto || "Texto do banner"}
            </p>
            {form.botaoTexto && (
              <span className="relative z-10 inline-block mt-2 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                {form.botaoTexto}
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Imagem de Fundo (upload)</label>
            <p className="text-[11px] text-muted-foreground mb-2">Tamanho recomendado: 1200x400px (proporção 3:1) para melhor preenchimento no carrossel.</p>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setImagemFile(file);
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => setImagemPreview(reader.result as string);
                  reader.readAsDataURL(file);
                } else {
                  setImagemPreview(null);
                }
              }}
              className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-foreground text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:bg-primary/10 file:text-primary file:border-0 file:cursor-pointer"
            />
            {(imagemPreview || banner?.imagemFundoUrl) && (
              <button
                type="button"
                onClick={() => { setImagemFile(null); setImagemPreview(null); }}
                className="mt-1 text-xs text-muted-foreground hover:text-destructive"
              >
                Remover imagem
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Texto do Banner *</label>
            <input
              value={form.texto}
              onChange={(e) => setForm({ ...form, texto: e.target.value })}
              required
              placeholder="Ex: Crie seu portal de artista em minutos"
              className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Cor de Fundo</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.corFundo}
                  onChange={(e) => setForm({ ...form, corFundo: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                />
                <input
                  value={form.corFundo}
                  onChange={(e) => setForm({ ...form, corFundo: e.target.value })}
                  placeholder="#1a1a2e"
                  className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Cor do Texto</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.corTexto}
                  onChange={(e) => setForm({ ...form, corTexto: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                />
                <input
                  value={form.corTexto}
                  onChange={(e) => setForm({ ...form, corTexto: e.target.value })}
                  placeholder="#ffffff"
                  className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Texto do Botão</label>
              <input
                value={form.botaoTexto}
                onChange={(e) => setForm({ ...form, botaoTexto: e.target.value })}
                placeholder="Criar Meu Portal"
                className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Link do Botão</label>
              <input
                value={form.botaoLink}
                onChange={(e) => setForm({ ...form, botaoLink: e.target.value })}
                placeholder="/artista/login?tab=cadastro"
                className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Ordem</label>
              <input
                type="number"
                value={form.ordem}
                onChange={(e) => setForm({ ...form, ordem: parseInt(e.target.value) || 0 })}
                min="0"
                className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Intervalo (s)</label>
              <input
                type="number"
                value={form.intervaloSegundos}
                onChange={(e) => setForm({ ...form, intervaloSegundos: parseInt(e.target.value) || 4 })}
                min="1"
                max="10"
                className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
              <button
                type="button"
                onClick={() => setForm({ ...form, ativo: !form.ativo })}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  form.ativo ? "bg-green-500/20 text-green-400" : "bg-zinc-500/20 text-zinc-400"
                }`}
              >
                {form.ativo ? "Ativo" : "Inativo"}
              </button>
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-xl hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Tab 9: Cities ─────────────────────────────────────────────────────────────

function CitiesTab() {
  const { cities: cachedCities, invalidate } = useCities();

  interface CityRow { id: number; nome: string; estado: string | null; ativo: boolean; ordem: number; }
  const [rows, setRows]       = useState<CityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newEstado, setNewEstado] = useState("");
  const [adding, setAdding]   = useState(false);
  const [editId, setEditId]   = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editEstado, setEditEstado] = useState("");
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    fetch("/api/admin/cities", { credentials: "include" })
      .then(r => r.json())
      .then(d => setRows(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    const res = await fetch("/api/admin/cities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ nome: newName.trim(), estado: newEstado.trim() || null }),
    });
    setAdding(false);
    if (res.ok) {
      setNewName(""); setNewEstado(""); invalidate(); load();
      toast({ title: "Cidade adicionada" });
    } else {
      const d = await res.json();
      toast({ title: d.error || "Erro ao adicionar", variant: "destructive" });
    }
  };

  const handleToggle = async (row: CityRow) => {
    await fetch(`/api/admin/cities/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ativo: !row.ativo }),
    });
    invalidate(); load();
  };

  const handleSave = async (id: number) => {
    if (!editName.trim()) return;
    const res = await fetch(`/api/admin/cities/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ nome: editName.trim(), estado: editEstado.trim() || null }),
    });
    if (res.ok) {
      setEditId(null); invalidate(); load();
      toast({ title: "Cidade atualizada" });
    } else {
      const d = await res.json();
      toast({ title: d.error || "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number, nome: string) => {
    if (!confirm(`Remover a cidade "${nome}"?`)) return;
    const res = await fetch(`/api/admin/cities/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      invalidate(); load();
      toast({ title: "Cidade removida" });
    } else {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Cidades</h2>
        <p className="text-sm text-muted-foreground">Gerencie as cidades disponíveis no cadastro e filtros de artistas</p>
      </div>

      <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Nome da cidade... (ex: São Paulo)"
          className="flex-1 min-w-[200px] px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all"
        />
        <input
          value={newEstado}
          onChange={e => setNewEstado(e.target.value)}
          placeholder="UF (ex: SP)"
          maxLength={2}
          className="w-16 px-3 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all text-center uppercase"
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

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhuma cidade cadastrada.</div>
          ) : (
            <div className="divide-y divide-border/40 max-h-[400px] overflow-y-auto">
              {rows.map(row => (
                <div key={row.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors group">
                  <GripVertical className="w-4 h-4 text-border shrink-0" />

                  {editId === row.id ? (
                    <>
                      <input
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleSave(row.id); if (e.key === "Escape") setEditId(null); }}
                        className="flex-1 bg-input border border-primary rounded-lg px-3 py-1 text-sm text-foreground focus:outline-none"
                      />
                      <input
                        value={editEstado}
                        onChange={e => setEditEstado(e.target.value)}
                        maxLength={2}
                        placeholder="UF"
                        className="w-16 bg-input border border-primary rounded-lg px-2 py-1 text-sm text-foreground focus:outline-none text-center uppercase"
                      />
                    </>
                  ) : (
                    <>
                      <span className={`flex-1 text-sm font-medium ${row.ativo ? "text-foreground" : "text-muted-foreground line-through"}`}>
                        {row.nome}
                      </span>
                      {row.estado && (
                        <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
                          {row.estado}
                        </span>
                      )}
                    </>
                  )}

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

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {editId === row.id ? (
                      <>
                        <button onClick={() => handleSave(row.id)} className="p-1.5 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditId(null)} className="p-1.5 text-muted-foreground hover:bg-white/5 rounded-lg transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditId(row.id); setEditName(row.nome); setEditEstado(row.estado || ""); }} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
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
        Cidades inativas ficam ocultas nos filtros e formulários.
      </p>
    </div>
  );
}

// ─── Playlists Tab ───────────────────────────────────────────────────────────

function PlaylistsTab() {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddSong, setShowAddSong] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null);
  const [selectedSongId, setSelectedSongId] = useState<string>("");
  const [newPlaylist, setNewPlaylist] = useState({ artistaId: "", nome: "", descricao: "" });
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [playlistsRes, artistsRes, songsRes] = await Promise.all([
        fetch("/api/playlists/admin").then(r => r.json()),
        fetch("/api/admin/artists", { credentials: "include" }).then(r => r.json()),
        fetch("/api/songs").then(r => r.json()),
      ]);
      setPlaylists(Array.isArray(playlistsRes) ? playlistsRes : []);
      setArtists(Array.isArray(artistsRes) ? artistsRes : []);
      setSongs(Array.isArray(songsRes) ? songsRes : []);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    if (!newPlaylist.artistaId || !newPlaylist.nome) {
      toast({ title: "Preencha artista e nome", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newPlaylist),
      });
      if (res.ok) {
        toast({ title: "Playlist criada!" });
        setShowCreate(false);
        setNewPlaylist({ artistaId: "", nome: "", descricao: "" });
        loadData();
      }
    } catch (err) {
      toast({ title: "Erro ao criar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir esta playlist?")) return;
    try {
      const res = await fetch(`/api/playlists/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "Playlist excluída!" });
        loadData();
      }
    } catch (err) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const handleAddSong = async () => {
    if (!selectedPlaylist || !selectedSongId) return;
    try {
      const res = await fetch(`/api/playlists/${selectedPlaylist.id}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ songId: parseInt(selectedSongId) }),
      });
      if (res.ok) {
        toast({ title: "Música adicionada!" });
        setShowAddSong(false);
        setSelectedSongId("");
        loadData();
      } else {
        const data = await res.json();
        toast({ title: data.error || "Erro", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Erro ao adicionar", variant: "destructive" });
    }
  };

  const handleRemoveSong = async (playlistId: number, songId: number) => {
    try {
      const res = await fetch(`/api/playlists/${playlistId}/songs/${songId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "Música removida!" });
        loadData();
      }
    } catch (err) {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  const loadPlaylistSongs = async (playlist: any) => {
    try {
      const res = await fetch(`/api/playlists/${playlist.id}/songs`, { credentials: "include" });
      const data = await res.json();
      setSelectedPlaylist({ ...playlist, songs: Array.isArray(data) ? data : [] });
    } catch (err) {
      console.error("Error loading playlist songs:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const artistSongs = (artistId: string) => songs.filter((s: any) => String(s.artistaId) === artistId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Playlists</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Nova Playlist
        </button>
      </div>

      {showCreate && (
        <div className="bg-card border border-border/40 rounded-xl p-6 space-y-4">
          <h3 className="font-bold text-foreground">Criar Playlist</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Artista</label>
              <select
                value={newPlaylist.artistaId}
                onChange={e => setNewPlaylist({ ...newPlaylist, artistaId: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground"
              >
                <option value="">Selecione...</option>
                {artists.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Nome</label>
              <input
                value={newPlaylist.nome}
                onChange={e => setNewPlaylist({ ...newPlaylist, nome: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                placeholder="Ex: Favoritas"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Descrição</label>
              <input
                value={newPlaylist.descricao}
                onChange={e => setNewPlaylist({ ...newPlaylist, descricao: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                placeholder="Opcional"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-muted-foreground">Cancelar</button>
            <button onClick={handleCreate} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold">Criar</button>
          </div>
        </div>
      )}

      {playlists.length === 0 ? (
        <div className="text-center py-12 bg-card border border-dashed border-border/40 rounded-xl">
          <ListMusic className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhuma playlist criada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((playlist: any) => (
            <div key={playlist.id} className="bg-card border border-border/40 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ListMusic className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-foreground truncate">{playlist.nome}</h4>
                  <p className="text-xs text-muted-foreground">
                    {artists.find((a: any) => String(a.id) === String(playlist.artistaId))?.name || "Artista"}
                  </p>
                </div>
                <button onClick={() => handleDelete(playlist.id)} className="p-2 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {playlist.descricao && (
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{playlist.descricao}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => loadPlaylistSongs(playlist)}
                  className="flex-1 px-3 py-2 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-muted/80"
                >
                  Ver músicas
                </button>
                <button
                  onClick={() => { setSelectedPlaylist(playlist); setShowAddSong(true); }}
                  className="flex-1 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20"
                >
                  Adicionar música
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal ver/adicionar músicas */}
      {selectedPlaylist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border/40 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border/40">
              <h3 className="font-bold text-foreground">{selectedPlaylist.nome}</h3>
              <button onClick={() => setSelectedPlaylist(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {selectedPlaylist.songs?.length > 0 ? (
                <div className="space-y-2">
                  {selectedPlaylist.songs.map((song: any) => (
                    <div key={song.id} className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
                      <img src={song.capaUrl || "/images/default-cover.png"} alt="" className="w-10 h-10 rounded object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{song.titulo}</p>
                        <p className="text-xs text-muted-foreground">{song.genero}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveSong(selectedPlaylist.id, song.id)}
                        className="p-2 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhuma música nesta playlist</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal adicionar música */}
      {showAddSong && selectedPlaylist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border/40 rounded-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-foreground">Adicionar Música</h3>
            <select
              value={selectedSongId}
              onChange={e => setSelectedSongId(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground"
            >
              <option value="">Selecione uma música...</option>
              {artistSongs(String(selectedPlaylist.artistaId)).map((s: any) => (
                <option key={s.id} value={s.id}>{s.titulo} - {s.genero}</option>
              ))}
            </select>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowAddSong(false); setSelectedSongId(""); }} className="px-4 py-2 rounded-lg text-muted-foreground">Cancelar</button>
              <button onClick={handleAddSong} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold">Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Galleries Tab ───────────────────────────────────────────────────────────

function GalleriesTab() {
  const [galleries, setGalleries] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  const [selectedGallery, setSelectedGallery] = useState<any | null>(null);
  const [newGallery, setNewGallery] = useState({ artistaId: "", titulo: "Galeria de Fotos" });
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [newPhotoLegenda, setNewPhotoLegenda] = useState("");
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [galleriesRes, artistsRes] = await Promise.all([
        fetch("/api/galleries/admin").then(r => r.json()),
        fetch("/api/admin/artists", { credentials: "include" }).then(r => r.json()),
      ]);
      setGalleries(Array.isArray(galleriesRes) ? galleriesRes : []);
      setArtists(Array.isArray(artistsRes) ? artistsRes : []);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    if (!newGallery.artistaId) {
      toast({ title: "Selecione um artista", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch("/api/galleries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newGallery),
      });
      if (res.ok) {
        toast({ title: "Galeria criada!" });
        setShowCreate(false);
        setNewGallery({ artistaId: "", titulo: "Galeria de Fotos" });
        loadData();
      }
    } catch (err) {
      toast({ title: "Erro ao criar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir esta galeria?")) return;
    try {
      const res = await fetch(`/api/galleries/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "Galeria excluída!" });
        loadData();
      }
    } catch (err) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const handleAddPhoto = async () => {
    if (!selectedGallery || !newPhotoUrl) {
      toast({ title: "URL da foto é obrigatória", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(`/api/galleries/${selectedGallery.id}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fotoUrl: newPhotoUrl, legenda: newPhotoLegenda }),
      });
      if (res.ok) {
        toast({ title: "Foto adicionada!" });
        setShowAddPhoto(false);
        setNewPhotoUrl("");
        setNewPhotoLegenda("");
        loadGalleryPhotos(selectedGallery.id);
      }
    } catch (err) {
      toast({ title: "Erro ao adicionar", variant: "destructive" });
    }
  };

  const handleRemovePhoto = async (galleryId: number, photoId: number) => {
    if (!confirm("Remover esta foto?")) return;
    try {
      const res = await fetch(`/api/galleries/${galleryId}/photos/${photoId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "Foto removida!" });
        loadGalleryPhotos(galleryId);
      }
    } catch (err) {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  const loadGalleryPhotos = async (galleryId: number) => {
    try {
      const res = await fetch(`/api/galleries/admin`);
      const data = await res.json();
      const gallery = data.find((g: any) => g.id === galleryId);
      if (gallery) {
        setSelectedGallery(gallery);
      }
    } catch (err) {
      console.error("Error loading gallery photos:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Galerias</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Nova Galeria
        </button>
      </div>

      {showCreate && (
        <div className="bg-card border border-border/40 rounded-xl p-6 space-y-4">
          <h3 className="font-bold text-foreground">Criar Galeria</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Artista</label>
              <select
                value={newGallery.artistaId}
                onChange={e => setNewGallery({ ...newGallery, artistaId: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground"
              >
                <option value="">Selecione...</option>
                {artists.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Título</label>
              <input
                value={newGallery.titulo}
                onChange={e => setNewGallery({ ...newGallery, titulo: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                placeholder="Galeria de Fotos"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-muted-foreground">Cancelar</button>
            <button onClick={handleCreate} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold">Criar</button>
          </div>
        </div>
      )}

      {galleries.length === 0 ? (
        <div className="text-center py-12 bg-card border border-dashed border-border/40 rounded-xl">
          <Image className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhuma galeria criada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {galleries.map((gallery: any) => (
            <div key={gallery.id} className="bg-card border border-border/40 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Image className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">{gallery.titulo}</h4>
                    <p className="text-xs text-muted-foreground">
                      {artists.find((a: any) => String(a.id) === String(gallery.artistaId))?.name || "Artista"}
                    </p>
                  </div>
                </div>
                <button onClick={() => handleDelete(gallery.id)} className="p-2 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                {gallery.photos?.map((photo: any) => (
                  <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={photo.fotoUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
                {(!gallery.photos || gallery.photos.length < 3) && (
                  <>
                    {[...Array(3 - (gallery.photos?.length || 0))].map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square rounded-lg bg-muted/50" />
                    ))}
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setSelectedGallery(gallery); setShowAddPhoto(true); }}
                  className="flex-1 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20"
                >
                  Adicionar foto
                </button>
                <button
                  onClick={() => setSelectedGallery(gallery)}
                  className="flex-1 px-3 py-2 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-muted/80"
                >
                  Ver todas ({gallery.photoCount || 0})
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedGallery && !showAddPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border/40 rounded-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border/40">
              <h3 className="font-bold text-foreground">{selectedGallery.titulo}</h3>
              <button onClick={() => setSelectedGallery(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {selectedGallery.photos?.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {selectedGallery.photos.map((photo: any) => (
                    <div key={photo.id} className="relative group">
                      <img src={photo.fotoUrl} alt={photo.legenda || ""} className="w-full aspect-square object-cover rounded-lg" />
                      <button
                        onClick={() => handleRemovePhoto(selectedGallery.id, photo.id)}
                        className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {photo.legenda && <p className="text-xs text-muted-foreground mt-1">{photo.legenda}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhuma foto nesta galeria</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddPhoto && selectedGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border/40 rounded-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-foreground">Adicionar Foto</h3>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">URL da imagem</label>
              <input
                value={newPhotoUrl}
                onChange={e => setNewPhotoUrl(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Legenda (opcional)</label>
              <input
                value={newPhotoLegenda}
                onChange={e => setNewPhotoLegenda(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                placeholder="Descrição da foto"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowAddPhoto(false); setNewPhotoUrl(""); setNewPhotoLegenda(""); }} className="px-4 py-2 rounded-lg text-muted-foreground">Cancelar</button>
              <button onClick={handleAddPhoto} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold">Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 11: Cupons ───────────────────────────────────────────────────────────

function CouponsTab() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const { toast } = useToast();

  const loadCoupons = () => {
    setLoading(true);
    fetch("/api/coupons", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCoupons(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCoupons(); }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Deletar este cupom?")) return;
    const res = await fetch(`/api/coupons/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      toast({ title: "Cupom deletado" });
      loadCoupons();
    } else {
      toast({ title: "Erro ao deletar", variant: "destructive" });
    }
  };

  const handleToggleAtivo = async (coupon: Coupon) => {
    const res = await fetch(`/api/coupons/${coupon.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isActive: !coupon.isActive }),
    });
    if (res.ok) {
      loadCoupons();
    } else {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Cupons de Desconto</h2>
          <p className="text-sm text-muted-foreground">Gerencie códigos de desconto para planos</p>
        </div>
        <button
          onClick={() => { setEditingCoupon(null); setShowModal(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Cupom
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card border border-dashed border-border rounded-2xl">
          <Ticket className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Nenhum cupom criado ainda.</p>
          <p className="text-sm mt-1">Clique em "Novo Cupom" para criar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((coupon) => {
            const isExpired = coupon.validUntil && new Date(coupon.validUntil) < new Date();
            const isExhausted = coupon.maxUses && parseInt(coupon.usedCount) >= parseInt(coupon.maxUses);
            return (
              <div
                key={coupon.id}
                className={`bg-card border rounded-2xl p-5 ${!coupon.isActive || isExpired || isExhausted ? "opacity-60" : "border-border"}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/20 p-2 rounded-lg">
                      <Ticket className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground font-mono">{coupon.code}</h3>
                      <p className="text-xs text-muted-foreground">{coupon.description || "Sem descrição"}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    !coupon.isActive ? "bg-zinc-500/20 text-zinc-400" :
                    isExpired ? "bg-red-500/20 text-red-400" :
                    isExhausted ? "bg-orange-500/20 text-orange-400" :
                    "bg-green-500/20 text-green-400"
                  }`}>
                    {!coupon.isActive ? "Inativo" : isExpired ? "Expirado" : isExhausted ? "Esgotado" : "Ativo"}
                  </span>
                </div>

                <div className="mb-3">
                  <p className="text-2xl font-bold text-primary">
                    {coupon.discountType === "percentage"
                      ? `${coupon.discountValue}%`
                      : `R$ ${coupon.discountValue}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {coupon.discountType === "percentage" ? "desconto" : "de desconto fixo"}
                  </p>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground mb-4">
                  {coupon.minAmount && parseFloat(coupon.minAmount) > 0 && (
                    <p>Valor mínimo: R$ {parseFloat(coupon.minAmount).toFixed(2)}</p>
                  )}
                  <p>Usos: {coupon.usedCount}{coupon.maxUses ? `/${coupon.maxUses}` : ""}</p>
                  {coupon.validUntil && (
                    <p>Validade: {new Date(coupon.validUntil).toLocaleDateString("pt-BR")}</p>
                  )}
                  {coupon.applicablePlans && coupon.applicablePlans.length > 0 && (
                    <p>Planos: {coupon.applicablePlans.join(", ")}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditingCoupon(coupon); setShowModal(true); }}
                    className="flex-1 py-1.5 text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 inline mr-1" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggleAtivo(coupon)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      coupon.isActive
                        ? "text-orange-400 hover:bg-orange-400/10"
                        : "text-green-400 hover:bg-green-400/10"
                    }`}
                  >
                    {coupon.isActive ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    onClick={() => handleDelete(coupon.id)}
                    className="py-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <CouponModal
          coupon={editingCoupon}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadCoupons(); }}
        />
      )}
    </div>
  );
}

function CouponModal({ coupon, onClose, onSaved }: { coupon: Coupon | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    code: coupon?.code || "",
    discountType: coupon?.discountType || "percentage",
    discountValue: coupon?.discountValue || "",
    minAmount: coupon?.minAmount || "",
    maxUses: coupon?.maxUses || "",
    validFrom: coupon?.validFrom ? new Date(coupon.validFrom).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    validUntil: coupon?.validUntil ? new Date(coupon.validUntil).toISOString().split("T")[0] : "",
    isActive: coupon?.isActive ?? true,
    applicablePlans: coupon?.applicablePlans?.join(", ") || "",
    description: coupon?.description || "",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.discountValue) {
      toast({ title: "Código e valor do desconto são obrigatórios", variant: "destructive" });
      return;
    }

    setSaving(true);

    const applicablePlans = form.applicablePlans
      ? form.applicablePlans.split(",").map(p => p.trim()).filter(Boolean)
      : [];

    const payload = {
      code: form.code.toUpperCase(),
      discountType: form.discountType,
      discountValue: form.discountValue,
      minAmount: form.minAmount || null,
      maxUses: form.maxUses || null,
      validFrom: new Date(form.validFrom),
      validUntil: form.validUntil ? new Date(form.validUntil) : null,
      isActive: form.isActive,
      applicablePlans: applicablePlans.length > 0 ? applicablePlans : null,
      description: form.description || null,
    };

    const url = coupon ? `/api/coupons/${coupon.id}` : "/api/coupons";
    const method = coupon ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (res.ok) {
      toast({ title: coupon ? "Cupom atualizado!" : "Cupom criado!" });
      onSaved();
    } else {
      const data = await res.json();
      toast({ title: data.error || "Erro ao salvar", variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl z-10 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">
            {coupon ? "Editar Cupom" : "Novo Cupom"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Código *</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="EXEMPLO10"
                className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm font-mono focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tipo de Desconto</label>
              <select
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="percentage">Porcentagem (%)</option>
                <option value="fixed">Valor Fixo (R$)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Valor do Desconto {form.discountType === "percentage" ? "(%)" : "(R$)"}
              </label>
              <input
                type="number"
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                placeholder={form.discountType === "percentage" ? "10" : "19.90"}
                className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Valor Mínimo (R$)</label>
              <input
                type="number"
                value={form.minAmount}
                onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
                placeholder="0"
                className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Data de Início</label>
              <input
                type="date"
                value={form.validFrom}
                onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Data de Validade</label>
              <input
                type="date"
                value={form.validUntil}
                onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Limite de Usos (opcional)</label>
            <input
              type="number"
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
              placeholder="Ilimitado"
              className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Planos Aplicáveis (vazio = todos)</label>
            <div className="space-y-1.5">
              {[
                { id: "free", label: "Grátis" },
                { id: "basico", label: "Básico" },
                { id: "intermediario", label: "Intermediário" },
                { id: "pro", label: "Profissional" },
                { id: "premium", label: "Premium" },
              ].map((plan) => {
                const plans = form.applicablePlans ? form.applicablePlans.split(",").map((p: string) => p.trim()).filter(Boolean) : [];
                const checked = plans.includes(plan.id);
                return (
                  <label
                    key={plan.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      checked ? "border-primary/50 bg-primary/10" : "border-border bg-input hover:border-border/60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const current = plans;
                        const next = checked
                          ? current.filter((p: string) => p !== plan.id)
                          : [...current, plan.id];
                        setForm({ ...form, applicablePlans: next.join(", ") });
                      }}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm text-foreground">{plan.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Descrição</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Cupom de desconto especial"
              className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div
            onClick={() => setForm({ ...form, isActive: !form.isActive })}
            className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer select-none transition-colors ${
              form.isActive ? "border-primary bg-primary/10 text-primary" : "border-border bg-input text-muted-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4" />
              <span className="text-sm font-medium">Cupom Ativo</span>
            </div>
            <div className={`w-10 h-5 rounded-full transition-colors relative ${form.isActive ? "bg-primary" : "bg-border"}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-xl hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Tab: E-mail Marketing ───────────────────────────────────────────────────

function EmailMarketingTab() {
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [recipientType, setRecipientType] = useState<"all" | "single">("all");
  const [selectedArtistId, setSelectedArtistId] = useState("");
  const [artists, setArtists] = useState<{ id: number; name: string; email: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingArtists, setLoadingArtists] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLoadingArtists(true);
    fetch("/api/admin/artists", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setArtists(data);
        }
      })
      .catch((err) => console.error("Erro ao carregar artistas:", err))
      .finally(() => setLoadingArtists(false));
  }, []);

  const convertTextToHtml = (text: string) => {
    if (!text) return "";

    let html = text;

    // Convert double newlines to paragraphs
    const paragraphs = html.split(/\n\s*\n/);
    html = paragraphs
      .map((p) => {
        let pText = p.trim();
        if (!pText) return "";

        // Headings
        if (pText.startsWith("# ")) {
          return `<h2 style="color: #111827; font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; margin-top: 20px; margin-bottom: 12px;">${pText.substring(2)}</h2>`;
        }
        if (pText.startsWith("## ")) {
          return `<h3 style="color: #1f2937; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; margin-top: 15px; margin-bottom: 10px;">${pText.substring(3)}</h3>`;
        }

        // Single newlines
        pText = pText.replace(/\n/g, "<br/>");

        return `<p style="margin-bottom: 15px; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #374151;">${pText}</p>`;
      })
      .join("\n");

    // Bold markdown: **text** -> <strong>text</strong>
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

    // Links markdown: [text](url) -> <a href="url" ...>text</a>
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #6366f1; text-decoration: underline; font-weight: 500;">$1</a>');

    // Images markdown: ![alt](url) -> <img src="url" style="..." alt="alt" />
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" style="max-width: 100%; height: auto; border-radius: 12px; margin: 15px 0; display: block;" alt="$1" />');

    return html;
  };

  const insertTag = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const newText = before + tag + after;
    setBodyText(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    setUploading(true);
    try {
      const res = await fetch("/api/admin/email-marketing/upload-image", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Erro no upload");
      const data = await res.json();
      insertTag(`![Imagem](${data.url})`);
      toast({ title: "Imagem enviada e inserida!" });
    } catch (err) {
      console.error(err);
      toast({ title: "Falha ao enviar imagem", variant: "destructive" });
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const applyTemplate = (templateName: string) => {
    if (bodyText.trim() && !confirm("Deseja substituir o conteúdo atual por este template?")) return;

    if (templateName === "welcome") {
      setSubject("Bem-vindo ao Portal do Artista!");
      setBodyText(`# Seja muito bem-vindo, {{nome}}!

Ficamos muito felizes em ter você como parceiro do nosso portal de artistas.

Agora você já pode completar o seu perfil, fazer o upload das suas melhores faixas e compartilhar sua vitrine com seus contratantes e fãs!

**Dica de Sucesso:** Personalize suas cores de destaque e adicione links para suas redes sociais para atrair mais contratantes!

Qualquer dúvida, conte com a nossa equipe de suporte respondendo a este e-mail.

Boas criações,
**Equipe Portal do Artista**`);
    } else if (templateName === "announcement") {
      setSubject("Novidades e atualizações na plataforma!");
      setBodyText(`# Temos novidades importantes para você!

Olá, {{nome}}. Nossa equipe acaba de lançar novos recursos de personalização e estatísticas no seu painel.

Agora você pode acompanhar visualizações e reproduções das suas faixas em tempo real!

Acesse o painel hoje mesmo e confira as novidades.

[Acessar Meu Painel](https://portaldoartista.com/artista/login)

Atenciosamente,
**Equipe Portal do Artista**`);
    } else if (templateName === "promo") {
      setSubject("Oferta Especial: Faça o upgrade do seu plano com desconto!");
      setBodyText(`# Alavanque sua carreira com o Plano Premium!

Olá, {{nome}}. Preparamos uma oportunidade única para você expandir o alcance da sua música.

Use o cupom especial e ganhe desconto na sua assinatura do plano básico, liberando limite ilimitado de faixas e personalização avançada.

**CUPOM: ARTISTAVIP**
*(Insira no momento do upgrade)*

Aproveite antes que a oferta expire!`);
    }
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      toast({ title: "Informe o assunto do e-mail", variant: "destructive" });
      return;
    }
    if (!bodyText.trim()) {
      toast({ title: "Escreva o conteúdo do e-mail", variant: "destructive" });
      return;
    }
    if (recipientType === "single" && !selectedArtistId) {
      toast({ title: "Selecione o artista para o envio", variant: "destructive" });
      return;
    }

    if (!confirm(`Deseja realmente iniciar o envio de e-mails para ${recipientType === "all" ? "TODOS os artistas" : "o artista selecionado"}?`)) {
      return;
    }

    setSending(true);
    try {
      const bodyHtml = convertTextToHtml(bodyText);

      const res = await fetch("/api/admin/email-marketing/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          bodyHtml,
          recipientType,
          artistId: recipientType === "single" ? selectedArtistId : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao enviar e-mails");

      toast({
        title: "Envio concluído!",
        description: data.message,
      });

      // Clear form
      setSubject("");
      setBodyText("");
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro no envio",
        description: err.message || "Ocorreu uma falha ao enviar os e-mails.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const filteredArtists = artists.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPreviewHtml = () => {
    const namePlaceholder = recipientType === "single" && selectedArtistId
      ? (artists.find((a) => String(a.id) === selectedArtistId)?.name || "Artista")
      : "Artista Exemplo";

    const renderedHtml = convertTextToHtml(bodyText);

    return renderedHtml
      .replace(/\{\{nome\}\}/g, namePlaceholder)
      .replace(/\{\{name\}\}/g, namePlaceholder);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">E-mail Marketing</h2>
        <p className="text-sm text-muted-foreground">Envie comunicados bonitos de forma simples, sem precisar saber HTML.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Editor panel */}
        <div className="lg:col-span-7 bg-card border border-border rounded-2xl p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Destinatários</label>
            <div className="flex gap-2 p-1 bg-background/50 border border-border rounded-xl w-fit">
              <button
                type="button"
                onClick={() => { setRecipientType("all"); setSelectedArtistId(""); }}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  recipientType === "all"
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Todos os Artistas ({artists.length})
              </button>
              <button
                type="button"
                onClick={() => setRecipientType("single")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  recipientType === "single"
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Apenas 1 Artista
              </button>
            </div>
          </div>

          {recipientType === "single" && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <label className="text-sm font-medium text-foreground">Selecionar Artista</label>
              <div className="relative" style={{ position: 'relative' }}>
                <Search 
                  className="text-muted-foreground" 
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', zIndex: 10 }}
                />
                <input
                  type="text"
                  placeholder="Buscar artista por nome ou e-mail..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {filteredArtists.length > 0 && searchQuery && (
                <div className="max-h-48 overflow-y-auto bg-background border border-border rounded-xl p-2 space-y-1 shadow-inner">
                  {filteredArtists.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setSelectedArtistId(String(a.id));
                        setSearchQuery("");
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex justify-between items-center ${
                        selectedArtistId === String(a.id)
                          ? "bg-primary/20 border border-primary/30 text-primary font-semibold"
                          : "hover:bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>{a.name}</span>
                      <span className="text-[10px] opacity-75">{a.email}</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedArtistId && (
                <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-xl">
                  <div className="text-xs text-primary font-medium">
                    Selecionado: <strong className="text-foreground">{artists.find((a) => String(a.id) === selectedArtistId)?.name}</strong> ({artists.find((a) => String(a.id) === selectedArtistId)?.email})
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedArtistId("")}
                    className="text-xs text-muted-foreground hover:text-destructive font-bold"
                  >
                    Remover
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Templates */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Modelos Rápidos de Texto</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyTemplate("welcome")}
                className="px-3 py-2.5 bg-background border border-border rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary transition-all text-center"
              >
                👋 Boas-vindas
              </button>
              <button
                type="button"
                onClick={() => applyTemplate("announcement")}
                className="px-3 py-2.5 bg-background border border-border rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary transition-all text-center"
              >
                📢 Informativo
              </button>
              <button
                type="button"
                onClick={() => applyTemplate("promo")}
                className="px-3 py-2.5 bg-background border border-border rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary transition-all text-center"
              >
                🎁 Oferta/Cupom
              </button>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Assunto do E-mail</label>
            <input
              type="text"
              placeholder="Digite o assunto do e-mail..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary font-medium"
            />
          </div>

          {/* Text Area and editor tools */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-foreground">Mensagem (Escreva normalmente)</label>
              <div className="flex items-center gap-1.5">
                <label className="cursor-pointer bg-primary/10 border border-primary/20 text-primary text-xs px-2.5 py-1.5 rounded-lg font-bold hover:bg-primary/20 transition-all flex items-center gap-1">
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                  {uploading ? "Carregando..." : "Inserir Imagem"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Helper Formatting toolbar (No HTML, simple markdown guides) */}
            <div className="flex flex-wrap gap-1 p-1 bg-background/50 border border-border rounded-t-xl border-b-0">
              <button
                type="button"
                onClick={() => insertTag("{{nome}}")}
                className="px-2.5 py-1 hover:bg-card rounded text-[10px] font-mono text-primary font-bold"
                title="Insere o nome do artista automaticamente"
              >
                {"Nome do Artista {{nome}}"}
              </button>
              <button
                type="button"
                onClick={() => insertTag("**texto em negrito**")}
                className="px-2.5 py-1 hover:bg-card rounded text-[10px] font-bold text-muted-foreground hover:text-foreground"
                title="Coloca o texto em negrito"
              >
                Negrito
              </button>
              <button
                type="button"
                onClick={() => insertTag("# Título")}
                className="px-2.5 py-1 hover:bg-card rounded text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                title="Cria um título grande"
              >
                Título
              </button>
              <button
                type="button"
                onClick={() => insertTag("[Texto do link](https://...)")}
                className="px-2.5 py-1 hover:bg-card rounded text-[10px] underline text-muted-foreground hover:text-foreground"
                title="Insere um link clicável"
              >
                Link
              </button>
            </div>

            <textarea
              ref={textareaRef}
              rows={12}
              placeholder="Escreva sua mensagem aqui. Aperte Enter duas vezes para criar um novo parágrafo. Use os botões acima para formatar."
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              className="w-full px-4 py-3 bg-input border border-border rounded-b-xl text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary leading-relaxed resize-y"
            />
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={sending || uploading}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/95 transition-all text-sm shadow disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? "Disparando E-mails..." : "Enviar E-mail"}
          </button>
        </div>

        {/* Live Preview panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pré-visualização do E-mail</span>
            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-500/20">
              Visualização Real
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
            <div className="bg-muted/80 px-4 py-3.5 border-b border-border text-[11px] space-y-1 text-muted-foreground">
              <div>
                <strong className="text-foreground">De:</strong> Portal do Artista &lt;onboarding@resend.dev&gt;
              </div>
              <div>
                <strong className="text-foreground">Para:</strong>{" "}
                {recipientType === "all" ? (
                  <span className="italic">Todos os Artistas cadastrados</span>
                ) : (
                  artists.find((a) => String(a.id) === selectedArtistId)?.email || <span className="italic">selecione um artista...</span>
                )}
              </div>
              <div>
                <strong className="text-foreground">Assunto:</strong> {subject || <span className="italic text-muted-foreground/60">(Sem assunto)</span>}
              </div>
            </div>
            <div className="p-4 bg-[#f9fafb] min-h-[400px] flex items-start justify-center overflow-x-auto">
              <div
                className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm w-full max-w-[600px] text-gray-800 font-sans text-sm leading-relaxed space-y-4 break-words"
                dangerouslySetInnerHTML={{
                  __html: getPreviewHtml() || '<p class="text-gray-400 italic text-center py-12">Escreva o conteúdo do e-mail na coluna da esquerda...</p>',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Aba Logs do Servidor ────────────────────────────────────────────────────────

interface LogEntry {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
}

function ServerLogsTab() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterLevel, setFilterLevel] = useState<"ALL" | "INFO" | "WARN" | "ERROR">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/admin/logs");
      if (!res.ok) throw new Error("Erro ao buscar logs");
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os logs do servidor.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleClearLogs = async () => {
    if (!confirm("Tem certeza que deseja limpar os logs salvos no servidor? Isso apagará o histórico permanentemente.")) {
      return;
    }
    try {
      const res = await fetch("/api/admin/logs", { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao limpar logs");
      setLogs([]);
      toast({
        title: "Logs limpos",
        description: "O arquivo de logs do servidor foi esvaziado com sucesso.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro",
        description: "Não foi possível limpar os logs do servidor.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadLogs = () => {
    const textContent = logs
      .map((log) => `${log.timestamp} [${log.level}] ${log.message}`)
      .join("\n");
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `logs_servidor_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesLevel = filterLevel === "ALL" || log.level === filterLevel;
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.level.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const errorCount = logs.filter(l => l.level === "ERROR").length;
  const warnCount = logs.filter(l => l.level === "WARN").length;
  const infoCount = logs.filter(l => l.level === "INFO").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
            <Terminal className="w-6 h-6 text-primary" />
            Logs do Servidor
          </h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe em tempo real os eventos, avisos e erros do sistema para diagnóstico rápido.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-xl text-xs font-medium">
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"}`} />
            <span>Atualização em tempo real</span>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="accent-primary w-4 h-4 cursor-pointer ml-1"
            />
          </div>

          <button
            onClick={() => fetchLogs()}
            disabled={loading || refreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing || loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
            {logs.length}
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total de Eventos</p>
            <p className="text-xs font-semibold text-foreground">Logs no Buffer</p>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center font-bold text-sm">
            {errorCount}
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Erros</p>
            <p className="text-xs font-semibold text-destructive font-bold">Falhas</p>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center font-bold text-sm">
            {warnCount}
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Avisos</p>
            <p className="text-xs font-semibold text-yellow-500">Alertas</p>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-sm">
            {infoCount}
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Informações</p>
            <p className="text-xs font-semibold text-blue-400">Mensagens</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterLevel("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filterLevel === "ALL" ? "bg-primary text-primary-foreground" : "bg-background border border-border text-muted-foreground hover:text-foreground"}`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterLevel("ERROR")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${filterLevel === "ERROR" ? "bg-destructive text-destructive-foreground" : "bg-background border border-border text-destructive hover:bg-destructive/10"}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
            Erros ({errorCount})
          </button>
          <button
            onClick={() => setFilterLevel("WARN")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${filterLevel === "WARN" ? "bg-yellow-500 text-black" : "bg-background border border-border text-yellow-500 hover:bg-yellow-500/10"}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
            Avisos ({warnCount})
          </button>
          <button
            onClick={() => setFilterLevel("INFO")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${filterLevel === "INFO" ? "bg-blue-500 text-white" : "bg-background border border-border text-blue-400 hover:bg-blue-500/10"}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Informações ({infoCount})
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar termos no log..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-60 pl-9 pr-4 py-1.5 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDownloadLogs}
              disabled={filteredLogs.length === 0}
              className="flex-1 sm:flex-none px-4 py-1.5 rounded-xl bg-zinc-850 text-foreground font-bold hover:bg-zinc-800 border border-zinc-700 transition-colors text-xs disabled:opacity-40"
            >
              Baixar (.txt)
            </button>
            <button
              onClick={handleClearLogs}
              className="flex-1 sm:flex-none px-4 py-1.5 rounded-xl bg-destructive/10 text-destructive font-bold hover:bg-destructive/20 border border-destructive/20 transition-colors text-xs"
            >
              Limpar Logs
            </button>
          </div>
        </div>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[500px]">
        <div className="bg-zinc-900 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-zinc-500 font-mono ml-2">server_output.log</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">UTF-8</span>
        </div>

        <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] space-y-2 select-text scrollbar-thin scrollbar-thumb-zinc-800 bg-zinc-950">
          {loading ? (
            <div className="h-full flex items-center justify-center text-zinc-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Carregando logs do servidor...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-zinc-550">
              Nenhum log encontrado para os critérios selecionados.
            </div>
          ) : (
            filteredLogs.map((log, index) => {
              const dateStr = new Date(log.timestamp).toLocaleTimeString();
              const levelColor =
                log.level === "ERROR" ? "text-red-500" :
                log.level === "WARN" ? "text-yellow-400" :
                "text-cyan-400";

              return (
                <div key={index} className="hover:bg-zinc-900/50 py-0.5 px-1.5 rounded flex items-start gap-3 transition-colors border-l-2 border-transparent hover:border-zinc-800">
                  <span className="text-zinc-600 shrink-0 font-normal">{dateStr}</span>
                  <span className={`font-bold ${levelColor} shrink-0 w-14`}>[{log.level}]</span>
                  <span className="text-zinc-300 break-all whitespace-pre-wrap flex-1">{log.message}</span>
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
}
