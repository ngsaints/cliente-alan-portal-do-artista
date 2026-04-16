import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  User, Music, BarChart3, Settings, Upload, Eye, EyeOff, 
  TrendingUp, Loader2, LogOut, Image, Link2, Crown, Save, X, Youtube, CreditCard,
  MessageSquare, CheckCheck, Trash2, RefreshCw, Phone, Mail, Palette, Type,
  ExternalLink, Heart
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useGenres } from "@/hooks/useGenres";

interface ArtistStats {
  totalSongs: number;
  totalPlays: number;
  totalLikes: number;
  vipContent: number;
}

interface ArtistProfile {
  id: number;
  name: string;
  email: string;
  profissao: string;
  cidade: string;
  instagram: string;
  tiktok: string;
  spotify: string;
  contato: string;
  slug: string;
  capaUrl: string;
  bannerUrl: string;
  fonte: string;
  cor: string;
  layout: string;
  player: string;
  plano: string;
  limiteMusicas: string;
  musicaCount: string;
}

const PLANS = [
  { id: "free", label: "Free", preco: "0", limiteMusicas: 2 },
  { id: "basico", label: "Básico", preco: "19.90", limiteMusicas: 10 },
  { id: "intermediario", label: "Intermediário", preco: "39.90", limiteMusicas: 25 },
  { id: "pro", label: "Profissional", preco: "79.90", limiteMusicas: 50 },
  { id: "premium", label: "Premium", preco: "149.90", limiteMusicas: 100 },
];

const FONTS = [
  { value: "Arial", label: "Arial" },
  { value: "Inter", label: "Inter" },
  { value: "Roboto", label: "Roboto" },
  { value: "Poppins", label: "Poppins" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Lato", label: "Lato" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Oswald", label: "Oswald" },
  { value: "Raleway", label: "Raleway" },
];

const LAYOUTS = [
  { value: "padrao", label: "Padrão" },
  { value: "gradiente", label: "Gradiente" },
  { value: "minimalista", label: "Minimalista" },
  { value: "escuro", label: "Escuro" },
];

const PLAYERS = [
  { value: "Padrão", label: "Padrão" },
  { value: "Minimalista", label: "Minimalista" },
  { value: "Lista", label: "Lista" },
  { value: "Waveform", label: "Waveform" },
];

type TabId = "dashboard" | "songs" | "profile" | "personalizacao" | "plano" | "interesses";

export default function ArtistDashboard() {
  const [location, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [stats, setStats] = useState<ArtistStats>({ totalSongs: 0, totalPlays: 0, totalLikes: 0, vipContent: 0 });
  const [songs, setSongs] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { genres } = useGenres();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newSong, setNewSong] = useState({
    titulo: "", descricao: "", genero: "Sertanejo", subgenero: "",
    compositor: "", status: "Disponível", precoX: "", precoY: "",
    isVip: "false", tipoMidia: "audio", youtubeUrl: "", vipCode: "",
  });
  const [capaFile, setCapaFile] = useState<File | null>(null);
  const [mp3File, setMp3File] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [editProfile, setEditProfile] = useState({
    name: "",
    profissao: "",
    cidade: "",
    instagram: "",
    tiktok: "",
    spotify: "",
    contato: "",
  });

  const [editCustom, setEditCustom] = useState({
    fonte: "Arial",
    cor: "#ffffff",
    layout: "padrao",
    player: "Padrão",
  });

  const [profileCapaFile, setProfileCapaFile] = useState<File | null>(null);
  const [profileBannerFile, setProfileBannerFile] = useState<File | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingCustom, setSavingCustom] = useState(false);
  const [deletingSongId, setDeletingSongId] = useState<number | null>(null);

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: "dashboard",      label: "Dashboard",       icon: BarChart3      },
    { id: "songs",          label: "Minhas Músicas",   icon: Music          },
    { id: "profile",        label: "Meu Perfil",       icon: User           },
    { id: "personalizacao", label: "Personalização",   icon: Palette        },
    { id: "plano",          label: "Meu Plano",        icon: Crown          },
    { id: "interesses",     label: "Interesses",       icon: MessageSquare  },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statusRes, songsRes] = await Promise.all([
        fetch("/api/artists/status", { credentials: "include" }).then(r => r.json()),
        fetch("/api/songs", { credentials: "include" }).then(r => r.json()),
      ]);

      if (!statusRes.loggedIn) {
        setLocation("/artista/login");
        return;
      }

      const a = statusRes.artist;
      setArtist(a);
      const mySongs = songsRes.filter((s: any) => s.artistaId == a.id);
      setSongs(mySongs);
      setStats({
        totalSongs: mySongs.length,
        totalPlays: mySongs.reduce((acc: number, s: any) => acc + (Number(s.plays) || 0), 0),
        totalLikes: mySongs.reduce((acc: number, s: any) => acc + (Number(s.likes) || 0), 0),
        vipContent: mySongs.filter((s: any) => s.isVip).length,
      });
      setEditProfile({
        name: a.name || "",
        profissao: a.profissao || "",
        cidade: a.cidade || "",
        instagram: a.instagram || "",
        tiktok: a.tiktok || "",
        spotify: a.spotify || "",
        contato: a.contato || "",
      });
      setEditCustom({
        fonte: a.fonte || "Arial",
        cor: a.cor || "#ffffff",
        layout: a.layout || "padrao",
        player: a.player || "Padrão",
      });
    } catch (err) {
      setError("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/artists/logout", { method: "POST", credentials: "include" });
    setLocation("/");
  };

  const showSaveSuccess = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const formData = new FormData();
      Object.entries(editProfile).forEach(([k, v]) => { if (v) formData.append(k, v); });
      if (profileCapaFile) formData.append("capaFile", profileCapaFile);
      if (profileBannerFile) formData.append("bannerFile", profileBannerFile);

      const res = await fetch("/api/artists/profile", {
        method: "PUT",
        credentials: "include",
        body: formData,
      });
      if (res.ok) {
        setProfileCapaFile(null);
        setProfileBannerFile(null);
        showSaveSuccess();
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao salvar perfil");
      }
    } catch (err) {
      alert("Erro ao salvar perfil");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveCustom = async () => {
    setSavingCustom(true);
    try {
      const formData = new FormData();
      Object.entries(editCustom).forEach(([k, v]) => { if (v) formData.append(k, v); });

      const res = await fetch("/api/artists/profile", {
        method: "PUT",
        credentials: "include",
        body: formData,
      });
      if (res.ok) {
        showSaveSuccess();
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao salvar personalização");
      }
    } catch (err) {
      alert("Erro ao salvar personalização");
    } finally {
      setSavingCustom(false);
    }
  };

  const handleUpgradePlan = async (planId: string) => {
    if (!artist) return;
    try {
      const res = await fetch("/api/payments/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, artistId: artist.id }),
      });
      const data = await res.json();
      if (data.initPoint) {
        window.open(data.initPoint, "_blank");
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      alert("Erro ao processar pagamento");
    }
  };

  const handleDeleteSong = async (songId: number) => {
    if (!confirm("Tem certeza que deseja excluir esta música?")) return;
    setDeletingSongId(songId);
    try {
      const res = await fetch(`/api/artist/${artist?.id}/songs/${songId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao excluir música");
      }
    } catch (err) {
      alert("Erro ao excluir música");
    } finally {
      setDeletingSongId(null);
    }
  };

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const tipoMidia = newSong.tipoMidia;
    
    if (tipoMidia === "audio" && !mp3File) {
      return alert("Para áudio, arquivo MP3 é obrigatório");
    }
    if (tipoMidia === "video" && !newSong.youtubeUrl) {
      return alert("Para vídeo, link do YouTube é obrigatório");
    }

    setUploading(true);
    const formData = new FormData();
    Object.entries(newSong).forEach(([k, v]) => {
      if (v) formData.append(k, v);
    });
    if (artist) {
      formData.append("artistaId", String(artist.id));
    }
    if (capaFile) formData.append("capa", capaFile);
    if (mp3File) formData.append("mp3", mp3File);

    try {
      const res = await fetch("/api/songs", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (res.ok) {
        setShowAddForm(false);
        setNewSong({ titulo: "", descricao: "", genero: "Sertanejo", subgenero: "", compositor: "", status: "Disponível", precoX: "", precoY: "", isVip: "false", tipoMidia: "audio", youtubeUrl: "", vipCode: "" });
        setCapaFile(null);
        setMp3File(null);
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao adicionar música");
      }
    } catch (err) {
      alert("Erro ao adicionar música");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/80 pb-32">
      <Navbar />

      {saveSuccess && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl bg-green-500/90 text-white font-bold text-sm shadow-lg animate-in fade-in slide-in-from-right">
          Salvo com sucesso!
        </div>
      )}

      <div className="pt-20 pb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Painel do Artista</h1>
              <p className="text-muted-foreground">Bem-vindo, {artist?.name}</p>
            </div>
            <div className="flex items-center gap-3">
              {artist?.slug && (
                <a
                  href={`/a/${artist.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-primary border border-primary/30 hover:bg-primary/10 transition-colors text-sm font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  Meu Perfil
                </a>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground border border-border hover:border-primary/50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Dashboard */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-card border border-border/40 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Music className="w-5 h-5 text-primary" />
                      <span className="text-sm text-muted-foreground">Total de Músicas</span>
                    </div>
                    <p className="text-3xl font-bold text-foreground">{stats.totalSongs}</p>
                    <p className="text-xs text-muted-foreground mt-1">Limite: {artist?.limiteMusicas}</p>
                  </div>
                  <div className="bg-card border border-border/40 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-muted-foreground">Total de Plays</span>
                    </div>
                    <p className="text-3xl font-bold text-foreground">{stats.totalPlays}</p>
                  </div>
                  <div className="bg-card border border-border/40 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Heart className="w-5 h-5 text-red-500" />
                      <span className="text-sm text-muted-foreground">Total de Likes</span>
                    </div>
                    <p className="text-3xl font-bold text-foreground">{stats.totalLikes}</p>
                  </div>
                  <div className="bg-card border border-border/40 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Crown className="w-5 h-5 text-yellow-500" />
                      <span className="text-sm text-muted-foreground">Conteúdo VIP</span>
                    </div>
                    <p className="text-3xl font-bold text-foreground">{stats.vipContent}</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-card border border-border/40 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4">Ações Rápidas</h3>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => setActiveTab("songs")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
                      <Upload className="w-4 h-4" /> Adicionar Música
                    </button>
                    <button onClick={() => setActiveTab("profile")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors">
                      <User className="w-4 h-4" /> Editar Perfil
                    </button>
                    <button onClick={() => setActiveTab("personalizacao")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors">
                      <Palette className="w-4 h-4" /> Personalizar
                    </button>
                    {artist?.slug && (
                      <a href={`/a/${artist.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors">
                        <ExternalLink className="w-4 h-4" /> Ver Meu Perfil
                      </a>
                    )}
                  </div>
                </div>

                {/* Recent Songs */}
                <div className="bg-card border border-border/40 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-foreground">Músicas Recentes</h3>
                    <button onClick={() => setActiveTab("songs")} className="text-sm text-primary hover:underline">Ver todas</button>
                  </div>
                  {songs.length === 0 ? (
                    <div className="text-center py-8">
                      <Music className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">Nenhuma música cadastrada</p>
                      <button onClick={() => setActiveTab("songs")} className="mt-2 text-sm text-primary hover:underline">Adicionar primeira música</button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {songs.slice(0, 5).map((song) => (
                        <div key={song.id} className="flex items-center gap-4 p-3 bg-background/50 rounded-lg">
                          <img src={song.capaUrl || "/images/default-cover.png"} alt={song.titulo} className="w-12 h-12 rounded-lg object-cover" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground truncate">{song.titulo}</h4>
                            <p className="text-sm text-muted-foreground">{song.genero}</p>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{Number(song.likes) || 0}</span>
                            <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{Number(song.plays) || 0}</span>
                          </div>
                          <div className="flex gap-2">
                            {song.isVip && <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400">VIP</span>}
                            {song.tipoMidia === "video" && <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400">Vídeo</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Songs */}
            {activeTab === "songs" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">Minhas Músicas ({songs.length}/{artist?.limiteMusicas})</h3>
                  <button 
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Adicionar Música
                  </button>
                </div>

                {/* Add Song Form */}
                {showAddForm && (
                  <form onSubmit={handleAddSong} className="bg-card border border-border/40 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-foreground">Nova Música</h4>
                      <button type="button" onClick={() => setShowAddForm(false)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">Tipo de Mídia</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="tipoMidia" value="audio" checked={newSong.tipoMidia === "audio"} onChange={e => setNewSong({...newSong, tipoMidia: e.target.value})} className="accent-primary" />
                          <Music className="w-4 h-4" /> Áudio (MP3)
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="tipoMidia" value="video" checked={newSong.tipoMidia === "video"} onChange={e => setNewSong({...newSong, tipoMidia: e.target.value})} className="accent-primary" />
                          <Youtube className="w-4 h-4 text-red-500" /> Vídeo (YouTube)
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Título</label>
                        <input value={newSong.titulo} onChange={e => setNewSong({...newSong, titulo: e.target.value})} required
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Gênero</label>
                        <select value={newSong.genero} onChange={e => setNewSong({...newSong, genero: e.target.value})}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground">
                          {genres.map(g => <option key={g}>{g}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Descrição</label>
                        <textarea value={newSong.descricao} onChange={e => setNewSong({...newSong, descricao: e.target.value})} required rows={2}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground" />
                      </div>

                      {newSong.tipoMidia === "video" ? (
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-muted-foreground mb-1">Link do YouTube</label>
                          <input value={newSong.youtubeUrl} onChange={e => setNewSong({...newSong, youtubeUrl: e.target.value})} placeholder="https://youtube.com/watch?v=..."
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground" />
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Capa (imagem)</label>
                            <input type="file" accept="image/*" onChange={e => setCapaFile(e.target.files?.[0] || null)}
                              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground file:mr-2 file:py-1 file:px-3 file:rounded-lg file:bg-primary/10 file:text-primary file:border-0 file:cursor-pointer" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">MP3 (áudio)</label>
                            <input type="file" accept=".mp3,audio/*" onChange={e => setMp3File(e.target.files?.[0] || null)} required
                              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground file:mr-2 file:py-1 file:px-3 file:rounded-lg file:bg-primary/10 file:text-primary file:border-0 file:cursor-pointer" />
                          </div>
                        </>
                      )}

                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="isVip" checked={newSong.isVip === "true"} onChange={e => setNewSong({...newSong, isVip: e.target.checked ? "true" : "false"})} className="accent-primary" />
                        <label htmlFor="isVip" className="text-sm text-muted-foreground">Conteúdo VIP</label>
                      </div>
                      {newSong.isVip === "true" && (
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1">Código de Acesso VIP</label>
                          <input value={newSong.vipCode} onChange={e => setNewSong({...newSong, vipCode: e.target.value})} placeholder="Código para acessar"
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground">
                        Cancelar
                      </button>
                      <button type="submit" disabled={uploading} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 disabled:opacity-50">
                        {uploading ? "Enviando..." : "Adicionar"}
                      </button>
                    </div>
                  </form>
                )}

                {songs.length === 0 ? (
                  <div className="text-center py-12 bg-card border border-dashed border-border/40 rounded-xl">
                    <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhuma música cadastrada</p>
                    <p className="text-sm text-muted-foreground mt-1">Clique em "Adicionar Música" para começar</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {songs.map((song) => (
                      <div key={song.id} className="flex items-center gap-4 bg-card border border-border/40 rounded-xl p-4 group">
                        <img src={song.capaUrl || "/images/default-cover.png"} alt={song.titulo} className="w-16 h-16 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-foreground truncate">{song.titulo}</h4>
                          <p className="text-sm text-muted-foreground">{song.genero} · {song.status}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{Number(song.likes) || 0}</span>
                            <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{Number(song.plays) || 0}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {song.isVip && <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400">VIP</span>}
                          {song.tipoMidia === "video" && <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400">Vídeo</span>}
                          <button
                            onClick={() => handleDeleteSong(song.id)}
                            disabled={deletingSongId === song.id}
                            className="p-2 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50"
                            title="Excluir música"
                          >
                            {deletingSongId === song.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Profile */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                {/* Photo uploads */}
                <div className="bg-card border border-border/40 rounded-xl p-6 space-y-4">
                  <h3 className="text-lg font-bold text-foreground">Fotos do Perfil</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">Foto de Perfil</label>
                      {artist?.capaUrl && !profileCapaFile && (
                        <img src={artist.capaUrl} alt="Foto atual" className="w-24 h-24 rounded-full object-cover mb-3 border-2 border-border" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setProfileCapaFile(e.target.files?.[0] || null)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground file:mr-2 file:py-1 file:px-3 file:rounded-lg file:bg-primary/10 file:text-primary file:border-0 file:cursor-pointer"
                      />
                      {profileCapaFile && (
                        <p className="text-xs text-primary mt-1">{profileCapaFile.name} (salve para aplicar)</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">Banner do Perfil</label>
                      {artist?.bannerUrl && !profileBannerFile && (
                        <img src={artist.bannerUrl} alt="Banner atual" className="w-full h-16 rounded-lg object-cover mb-3 border border-border" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setProfileBannerFile(e.target.files?.[0] || null)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground file:mr-2 file:py-1 file:px-3 file:rounded-lg file:bg-primary/10 file:text-primary file:border-0 file:cursor-pointer"
                      />
                      {profileBannerFile && (
                        <p className="text-xs text-primary mt-1">{profileBannerFile.name} (salve para aplicar)</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info form */}
                <div className="bg-card border border-border/40 rounded-xl p-6 space-y-4">
                  <h3 className="text-lg font-bold text-foreground">Informações</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Nome</label>
                      <input
                        type="text"
                        value={editProfile.name}
                        onChange={(e) => setEditProfile({ ...editProfile, name: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Profissão</label>
                      <select
                        value={editProfile.profissao}
                        onChange={(e) => setEditProfile({ ...editProfile, profissao: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground"
                      >
                        <option value="Cantor">Cantor</option>
                        <option value="Compositor">Compositor</option>
                        <option value="Banda">Banda</option>
                        <option value="Grupo">Grupo</option>
                        <option value="Dupla">Dupla</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Cidade</label>
                      <input
                        type="text"
                        value={editProfile.cidade}
                        onChange={(e) => setEditProfile({ ...editProfile, cidade: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Contato (WhatsApp)</label>
                      <input
                        type="text"
                        value={editProfile.contato}
                        onChange={(e) => setEditProfile({ ...editProfile, contato: e.target.value })}
                        placeholder="(21) 99999-9999"
                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Instagram</label>
                      <input
                        type="text"
                        value={editProfile.instagram}
                        onChange={(e) => setEditProfile({ ...editProfile, instagram: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">TikTok</label>
                      <input
                        type="text"
                        value={editProfile.tiktok}
                        onChange={(e) => setEditProfile({ ...editProfile, tiktok: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Spotify</label>
                      <input
                        type="url"
                        value={editProfile.spotify}
                        onChange={(e) => setEditProfile({ ...editProfile, spotify: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground"
                      />
                    </div>
                  </div>
                  {artist?.slug && (
                    <div className="flex items-center gap-2 p-3 bg-background/50 rounded-lg border border-border/30">
                      <Link2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Seu link:</span>
                      <a href={`/a/${artist.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate">
                        {window.location.origin}/a/{artist.slug}
                      </a>
                    </div>
                  )}
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="flex items-center gap-2 px-6 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar Perfil
                  </button>
                </div>
              </div>
            )}

            {/* Personalização */}
            {activeTab === "personalizacao" && (
              <div className="bg-card border border-border/40 rounded-xl p-6 space-y-6">
                <h3 className="text-lg font-bold text-foreground">Personalização do Perfil</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                      <Type className="w-4 h-4" /> Fonte
                    </label>
                    <select
                      value={editCustom.fonte}
                      onChange={(e) => setEditCustom({ ...editCustom, fonte: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground"
                    >
                      {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: editCustom.fonte }}>Preview: {editCustom.fonte}</p>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                      <Palette className="w-4 h-4" /> Cor do Perfil
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={editCustom.cor}
                        onChange={(e) => setEditCustom({ ...editCustom, cor: e.target.value })}
                        className="w-12 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={editCustom.cor}
                        onChange={(e) => setEditCustom({ ...editCustom, cor: e.target.value })}
                        className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-foreground"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                      <Image className="w-4 h-4" /> Layout
                    </label>
                    <select
                      value={editCustom.layout}
                      onChange={(e) => setEditCustom({ ...editCustom, layout: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground"
                    >
                      {LAYOUTS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                      <Music className="w-4 h-4" /> Tipo de Player
                    </label>
                    <select
                      value={editCustom.player}
                      onChange={(e) => setEditCustom({ ...editCustom, player: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground"
                    >
                      {PLAYERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Preview */}
                <div className="border border-border/30 rounded-xl p-4 bg-background/30">
                  <p className="text-xs text-muted-foreground mb-2">Preview do perfil</p>
                  <div
                    className="rounded-xl p-6 transition-all"
                    style={{
                      fontFamily: editCustom.fonte,
                      color: editCustom.cor,
                      background: editCustom.layout === "escuro" ? "#1a1a2e" : editCustom.layout === "gradiente" ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : editCustom.layout === "minimalista" ? "#fafafa" : "#ffffff",
                    }}
                  >
                    <p className="text-lg font-bold" style={{ color: editCustom.cor }}>{artist?.name || "Nome do Artista"}</p>
                    <p className="text-sm opacity-80" style={{ color: editCustom.cor }}>{artist?.profissao || "Cantor"} · {artist?.cidade || "Cidade"}</p>
                    <p className="text-xs opacity-60 mt-2" style={{ color: editCustom.cor }}>Player: {editCustom.player}</p>
                  </div>
                </div>

                <button
                  onClick={handleSaveCustom}
                  disabled={savingCustom}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {savingCustom ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Personalização
                </button>
              </div>
            )}

            {/* Plano */}
            {activeTab === "plano" && (
              <div className="bg-card border border-border/40 rounded-xl p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Meu Plano</h3>
                <div className="flex items-center gap-4 p-4 bg-primary/10 border border-primary/20 rounded-xl mb-6">
                  <Crown className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold text-foreground uppercase">{artist?.plano}</p>
                    <p className="text-sm text-muted-foreground">{artist?.musicaCount} / {artist?.limiteMusicas} músicas</p>
                  </div>
                </div>

                <h4 className="font-bold text-foreground mb-3">Atualizar Plano</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {PLANS.filter(p => p.id !== artist?.plano).map((plan) => (
                    <div key={plan.id} className="p-4 rounded-xl border border-border/40 bg-background/50">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-bold text-foreground">{plan.label}</h5>
                        <span className="text-lg font-bold text-primary">R$ {plan.preco}/mês</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3"> até {plan.limiteMusicas} músicas</p>
                      <button
                        onClick={() => handleUpgradePlan(plan.id)}
                        className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 flex items-center justify-center gap-2"
                      >
                        <CreditCard className="w-4 h-4" />
                        Atualizar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Interesses */}
            {activeTab === "interesses" && artist && (
              <ArtistInteresses artistId={artist.id} />
            )}

          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ─── Aba Interesses ───────────────────────────────────────────────────────────

interface InterestItem {
  id: number;
  songId: string;
  nome: string;
  email: string;
  telefone: string | null;
  mensagem: string | null;
  contratarShow: boolean;
  reservarMusica: boolean;
  agendarReuniao: boolean;
  lido: boolean;
  createdAt: string;
}

function ArtistInteresses({ artistId }: { artistId: number }) {
  const [interests, setInterests] = useState<InterestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch(`/api/interests/artist/${artistId}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setInterests(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [artistId]);

  const markRead = async (id: number) => {
    await fetch(`/api/interests/${id}/read`, { method: "PATCH", credentials: "include" });
    setInterests(prev => prev.map(i => i.id === id ? { ...i, lido: true } : i));
  };

  const remove = async (id: number) => {
    if (!confirm("Remover este interesse?")) return;
    await fetch(`/api/interests/${id}`, { method: "DELETE", credentials: "include" });
    setInterests(prev => prev.filter(i => i.id !== id));
  };

  const unread = interests.filter(i => !i.lido).length;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            Interesses recebidos
            {unread > 0 && (
              <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full font-bold">
                {unread} novo{unread > 1 ? "s" : ""}
              </span>
            )}
          </h3>
          <p className="text-sm text-muted-foreground">{interests.length} contato{interests.length !== 1 ? "s" : ""} recebido{interests.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={load} className="p-2 text-muted-foreground hover:text-primary transition-colors" title="Atualizar">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {interests.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border/40 rounded-xl text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Nenhum interesse recebido ainda</p>
          <p className="text-sm mt-1">Quando alguém clicar em "Tenho Interesse" nas suas músicas, aparecerá aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {interests.map(item => (
            <div
              key={item.id}
              className={`bg-card border rounded-xl p-4 transition-colors ${item.lido ? "border-border/30 opacity-75" : "border-primary/30"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Cabeçalho */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-foreground">{item.nome}</span>
                    {!item.lido && (
                      <span className="px-2 py-0.5 bg-primary/15 text-primary text-xs rounded-full font-bold">Novo</span>
                    )}
                  </div>

                  {/* Contato */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2 flex-wrap">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{item.email}</span>
                    {item.telefone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{item.telefone}</span>}
                  </div>

                  {/* Mensagem */}
                  {item.mensagem && (
                    <p className="text-sm text-foreground/80 bg-background/60 rounded-lg px-3 py-2 border border-border/30 mb-2">
                      {item.mensagem}
                    </p>
                  )}

                  {/* Tags de interesse */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {item.contratarShow  && <span className="px-2 py-0.5 bg-blue-500/15   text-blue-400   text-xs rounded-full">🎤 Show</span>}
                    {item.reservarMusica && <span className="px-2 py-0.5 bg-purple-500/15 text-purple-400 text-xs rounded-full">🎵 Reservar Música</span>}
                    {item.agendarReuniao && <span className="px-2 py-0.5 bg-green-500/15  text-green-400  text-xs rounded-full">📅 Reunião</span>}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>

                {/* Ações */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  {!item.lido && (
                    <button
                      onClick={() => markRead(item.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-colors"
                      title="Marcar como lido"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Lido
                    </button>
                  )}
                  <button
                    onClick={() => remove(item.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-destructive/30 text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Cancelar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
