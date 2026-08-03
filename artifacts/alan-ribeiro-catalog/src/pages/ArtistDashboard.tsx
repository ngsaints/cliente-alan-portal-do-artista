import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  User, Music, BarChart3, Settings, Upload, Eye, EyeOff, 
  TrendingUp, TrendingUpDown, Loader2, LogOut, Image, Link2, Crown, Save, X, Youtube, CreditCard,
  MessageSquare, CheckCheck, Trash2, RefreshCw, Phone, Mail, Palette, Type,
  ExternalLink, Heart, Pencil, ListMusic, Plus, GripVertical, Play, Image as ImageIcon, Disc, Lock, PlayCircle, Share2,
  Bot, Sparkles, Zap, Download, ChevronLeft, ChevronRight
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Navbar } from "@/components/Navbar";
import { NotificationBell } from "@/components/NotificationBell";
import { useGenres } from "@/hooks/useGenres";
import { usePlayer, PlayerStyle } from "@/contexts/PlayerContext";
import { useToast } from "@/hooks/use-toast";

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
  vipSenha: string;
  planoAtivo?: boolean;
  canCustomizeFont: boolean;
  canCustomizeBackground: boolean;
  canCustomizeTextColor: boolean;
  canCustomizePlayerStyle: boolean;
  canCustomizePlayerColor: boolean;
  aiQueriesCount?: number;
  aiCreditsLimit?: number;
}

const DEFAULT_PLANS = [
  { id: "free", label: "Gratuito", preco: "0", limiteMusicas: 2 },
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
  { value: "Merriweather", label: "Merriweather" },
  { value: "Ubuntu", label: "Ubuntu" },
  { value: "Nunito", label: "Nunito" },
  { value: "Quicksand", label: "Quicksand" },
  { value: "Archivo", label: "Archivo" },
  { value: "Bebas Neue", label: "Bebas Neue" },
  { value: "Cinzel", label: "Cinzel" },
  { value: "Cormorant Garamond", label: "Cormorant Garamond" },
  { value: "Dancing Script", label: "Dancing Script" },
  { value: "Fira Sans", label: "Fira Sans" },
  { value: "Josefin Sans", label: "Josefin Sans" },
  { value: "Libre Baskerville", label: "Libre Baskerville" },
  { value: "Lora", label: "Lora" },
  { value: "Pacifico", label: "Pacifico" },
  { value: "Rouge Script", label: "Rouge Script" },
  { value: "Satisfy", label: "Satisfy" },
  { value: "Spectral", label: "Spectral" },
  { value: "Tangerine", label: "Tangerine" },
  { value: "Vollkorn", label: "Vollkorn" },
  { value: "Zilla Slab", label: "Zilla Slab" },
  { value: "Abril Fatface", label: "Abril Fatface" },
  { value: "Metal Mania", label: "Metal Mania" },
  { value: "Black Ops One", label: "Black Ops One" },
  { value: "Russo One", label: "Russo One" },
  { value: "Pirata One", label: "Pirata One" },
  { value: "Monoton", label: "Monoton" },
  { value: "Titan One", label: "Titan One" },
  { value: "Bangers", label: "Bangers" },
  { value: "Lobster", label: "Lobster" },
  { value: "Permanent Marker", label: "Permanent Marker" },
  { value: "Rock Salt", label: "Rock Salt" },
  { value: "UnifrakturMaguntia", label: "UnifrakturMaguntia" },
  { value: "Metamorphous", label: "Metamorphous" },
  { value: "Chicle", label: "Chicle" },
  { value: "Fondamento", label: "Fondamento" },
  { value: "Felipa", label: "Felipa" },
  { value: "Yesteryear", label: "Yesteryear" },
  { value: "Creepster", label: "Creepster" },
  { value: "Butcherman", label: "Butcherman" },
  { value: "Nosifer", label: "Nosifer" },
  { value: "Gaegu", label: "Gaegu" },
  { value: "Fredericka the Great", label: "Fredericka the Great" },
  { value: "Frijole", label: "Frijole" },
  { value: "Boogaloo", label: "Boogaloo" },
  { value: "Bungee", label: "Bungee" },
  { value: "Rubik Mono One", label: "Rubik Mono One" },
];

const BACKGROUNDS = [
  { value: "padrao", label: "Padrão", preview: "#ffffff" },
  { value: "gradiente-azul", label: "Gradiente Azul", preview: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { value: "gradiente-verde", label: "Gradiente Verde", preview: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" },
  { value: "gradiente-roxo", label: "Gradiente Roxo", preview: "linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)" },
  { value: "gradiente-sol", label: "Gradiente Sol", preview: "linear-gradient(135deg, #f5af19 0%, #f12711 100%)" },
  { value: "gradiente-oceano", label: "Gradiente Oceano", preview: "linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)" },
  { value: "gradiente-rosa", label: "Gradiente Rosa", preview: "linear-gradient(135deg, #ff6a88 0%, #ff9a9e 100%)" },
  { value: "gradiente-aurora", label: "Aurora", preview: "linear-gradient(135deg, #00c6ff 0%, #0072ff 50%, #00c6ff 100%)" },
  { value: "gradiente-tropical", label: "Tropical", preview: "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)" },
  { value: "gradiente-pink", label: "Pink", preview: "linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)" },
  { value: "escuro", label: "Escuro", preview: "#1a1a2e" },
  { value: "escuro-azul", label: "Escuro Azul", preview: "#0f0f23" },
  { value: "preto", label: "Preto", preview: "#000000" },
  { value: "branco", label: "Branco", preview: "#ffffff" },
  { value: "bege", label: "Bege", preview: "#f5f0e1" },
  { value: "cinza-claro", label: "Cinza Claro", preview: "#e5e5e5" },
  { value: "azul-escuro", label: "Azul Escuro", preview: "#1e3a5f" },
  { value: "verde-escuro", label: "Verde Escuro", preview: "#1a4d1a" },
  { value: "roxo-escuro", label: "Roxo Escuro", preview: "#2d1b4e" },
  { value: "verde-azul", label: "Verde Azul", preview: "#1a4d4d" },
  { value: "lilas", label: "Lilás", preview: "#4a1a6b" },
  { value: "cinza-escuro", label: "Cinza Escuro", preview: "#2d2d2d" },
  { value: "azul-azul", label: "Azul", preview: "#1a3a5f" },
  { value: "vermelho-escuro", label: "Vermelho Escuro", preview: "#5f1a1a" },
  { value: "dourado", label: "Dourado", preview: "#5f4a1a" },
  { value: "turquesa", label: "Turquesa", preview: "#1a5f5f" },
];

const PLAYERS = [
  { value: "padrao", label: "Padrão", description: "Player clássico com controles básicos" },
  { value: "minimalista", label: "Minimalista", description: "Design limpo e simplificado" },
  { value: "lista", label: "Lista", description: "Player com lista de músicas" },
  { value: "waveform", label: "Waveform", description: "Visualização de onda sonora" },
  { value: "moderno", label: "Moderno", description: "Design moderno com animação" },
  { value: "vintage", label: "Vintage", description: "Estilo retrô clássico" },
];

const COLORS = [
  "#ffffff", "#000000", "#f5d76e", "#ff6b6b", "#4ecdc4", "#45b7d1",
  "#96ceb4", "#ffeaa7", "#dfe6e9", "#6c5ce7", "#a29bfe", "#fd79a8",
  "#e17055", "#00b894", "#0984e3", "#d63031", "#636e72", "#2d3436",
  "#e84393", "#00cec9", "#fdcb6e", "#fab1a0", "#74b9ff", "#a855f7",
];

const PLAYER_GRADIENTS = [
  { value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", label: "Roxo" },
  { value: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)", label: "Verde" },
  { value: "linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)", label: "Roxo Escuro" },
  { value: "linear-gradient(135deg, #f5af19 0%, #f12711 100%)", label: "Solar" },
  { value: "linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)", label: "Oceano" },
  { value: "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)", label: "Rosa Laranja" },
  { value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", label: "Rosa" },
  { value: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", label: "Azul" },
  { value: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", label: "Verde Menta" },
  { value: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)", label: "Rosa Amarelo" },
  { value: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)", label: "Pêssego" },
  { value: "linear-gradient(135deg, #d9af34 0%, #9b5de5 100%)", label: "Ouro Roxo" },
];

const PLAYER_COLORS = [
  "#f5c518", "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4",
  "#6c5ce7", "#a29bfe", "#fd79a8", "#e17055", "#00b894",
  "#0984e3", "#d63031", "#e84393", "#00cec9", "#fdcb6e",
  "#fab1a0", "#74b9ff", "#a855f7",
];

type TabId = "dashboard" | "songs" | "playlists" | "gallery" | "profile" | "plano" | "interesses" | "vip" | "mentor";

function PlayerPreviewMini({ style, editCustom }: { style: string; editCustom: any }) {
  const playerCor = editCustom?.playerCor || "#f5c518";
  const playerGradient = editCustom?.playerGradient || "";
  const playBtnBg = playerGradient || playerCor;

  if (style === "minimalista") {
    return (
      <div className="rounded-lg overflow-hidden bg-black/95 border border-white/10">
        <div className="h-0.5 bg-white/10">
          <div className="h-full" style={{ width: "40%", background: playerGradient || playerCor }} />
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <div className="w-8 h-8 rounded overflow-hidden">
            <img src={`${import.meta.env.BASE_URL}images/default-cover.png`} className="w-full h-full object-cover" />
          </div>
          <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: playBtnBg }}>
            <Play className="w-5 h-5 text-black fill-black ml-0.5" />
          </button>
          <button className="text-white/50 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  if (style === "lista") {
    return (
      <div className="rounded-lg overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10 p-3">
        <div className="h-1 bg-white/5 mb-3">
          <div className="h-full rounded-r-full" style={{ width: "40%", background: playerGradient || playerCor }} />
        </div>
        <div className="flex items-center gap-3">
          <button className="text-white/50 hover:text-white">
            <X className="w-4 h-4" />
          </button>
          <div className="w-10 h-10 rounded-lg overflow-hidden shadow-lg ring-2 ring-white/10">
            <img src={`${import.meta.env.BASE_URL}images/default-cover.png`} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-bold truncate">Nome da Música</p>
            <p className="text-white/50 text-xs truncate">Artista</p>
          </div>
          <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: playBtnBg }}>
            <Play className="w-5 h-5 text-black fill-black ml-0.5" />
          </button>
          <span className="text-xs text-white/50 font-mono">0:00/3:45</span>
        </div>
      </div>
    );
  }

  if (style === "waveform") {
    return (
      <div className="rounded-lg overflow-hidden bg-[#0a0a1a] border border-cyan-500/30 p-3">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg overflow-hidden shadow-lg ring-2 ring-cyan-500/30">
            <img src={`${import.meta.env.BASE_URL}images/default-cover.png`} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-bold truncate">Nome da Música</p>
            <p className="text-cyan-300/60 text-xs truncate">Artista</p>
          </div>
          <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: playBtnBg }}>
            <Play className="w-5 h-5 text-black fill-black ml-0.5" />
          </button>
          <button className="text-cyan-300/50 hover:text-cyan-300">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-cyan-300/50 font-mono w-8">0:00</span>
          <div className="flex-1 h-6 bg-cyan-500/10 rounded flex items-center gap-0.5 px-1">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-1 rounded-full"
                style={{
                  height: `${Math.random() * 60 + 20}%`,
                  background: i < 8 ? (playerGradient || playerCor) : 'rgba(6, 182, 212, 0.3)'
                }}
              />
            ))}
          </div>
          <span className="text-xs text-cyan-300/50 font-mono w-8 text-right">3:45</span>
        </div>
      </div>
    );
  }

  if (style === "moderno") {
    return (
      <div className="rounded-lg overflow-hidden bg-gradient-to-r from-purple-900/95 to-pink-900/95 border border-white/10 p-3">
        <div className="h-0.5 bg-white/10 mb-3">
          <div className="h-full rounded-r-full" style={{ width: "40%", background: playerGradient || 'linear-gradient(to right, #a855f7, #ec4899)' }} />
        </div>
        <div className="flex items-center justify-between">
          <button className="text-white/50 hover:text-white">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 flex-1 max-w-[200px] mx-auto">
            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg ring-2 ring-white/20" style={{ background: playerCor }}>
              <img src={`${import.meta.env.BASE_URL}images/default-cover.png`} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-bold truncate">Nome da Música</p>
              <p className="text-white/60 text-xs truncate">Artista</p>
            </div>
          </div>
          <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: playBtnBg, boxShadow: `0 0 15px ${playerCor}80` }}>
            <Play className="w-5 h-5 text-black fill-black ml-0.5" />
          </button>
        </div>
      </div>
    );
  }

  if (style === "vintage") {
    return (
      <div className="rounded-lg overflow-hidden border border-amber-700/50 p-3" style={{ background: 'linear-gradient(to right, #451a03, #1c1917)' }}>
        <div className="h-1.5 bg-amber-900/30 mb-3">
          <div className="h-full rounded-full" style={{ width: "40%", background: playerGradient || 'linear-gradient(to right, #d97706, #ea580c)' }} />
        </div>
        <div className="flex items-center gap-3">
          <button className="text-amber-200/50 hover:text-amber-200">
            <X className="w-4 h-4" />
          </button>
          <div className="w-10 h-10 text-amber-600 flex items-center justify-center">
            <Disc className="w-8 h-8 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg ring-4 ring-amber-700/50">
            <img src={`${import.meta.env.BASE_URL}images/default-cover.png`} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-amber-100 text-sm font-bold truncate">Nome da Música</p>
            <p className="text-amber-300/60 text-xs truncate">Artista</p>
          </div>
          <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: playerGradient || '#d97706' }}>
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </button>
          <span className="text-xs text-amber-200/50 font-mono hidden sm:block">0:00/3:45</span>
        </div>
      </div>
    );
  }

  // Padrao (default)
  return (
    <div className="rounded-lg overflow-hidden bg-[#0f0f23]/98 border border-purple-500/30 p-3">
      <div className="h-0.5 bg-purple-900/30 mb-3">
        <div className="h-full rounded-b-full" style={{ width: "40%", background: playerGradient || playerCor }} />
      </div>
      <div className="flex items-center justify-center gap-3">
        <button className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-500/30 hover:bg-purple-500/50">
          <X className="w-4 h-4 text-purple-200" />
        </button>
        <div className="w-10 h-10 rounded-lg overflow-hidden shadow-lg ring-2 ring-purple-500/30">
          <img src={`${import.meta.env.BASE_URL}images/default-cover.png`} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-bold truncate">Nome da Música</p>
          <p className="text-purple-300/60 text-xs truncate">Artista</p>
        </div>
        <button className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg" style={{ background: playBtnBg, boxShadow: `0 0 15px ${playerCor}40` }}>
          <Play className="w-5 h-5 text-black fill-black ml-0.5" />
        </button>
        <span className="text-xs text-purple-200/60 font-mono hidden sm:block">0:00/3:45</span>
      </div>
    </div>
  );
}

export default function ArtistDashboard() {
  const [location, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const artistTabBarRef = useRef<HTMLDivElement>(null);

  const handleArtistScrollLeft = () => {
    if (artistTabBarRef.current) {
      artistTabBarRef.current.scrollBy({ left: -260, behavior: "smooth" });
    }
  };

  const handleArtistScrollRight = () => {
    if (artistTabBarRef.current) {
      artistTabBarRef.current.scrollBy({ left: 260, behavior: "smooth" });
    }
  };
  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [stats, setStats] = useState<ArtistStats>({ totalSongs: 0, totalPlays: 0, totalLikes: 0, vipContent: 0 });
  const [songs, setSongs] = useState<any[]>([]);
  const [openaiEnabled, setOpenaiEnabled] = useState(false);
  const [supportChannels, setSupportChannels] = useState({ instagram: "", whatsapp: "", email: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { genres } = useGenres();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSong, setEditingSong] = useState<any | null>(null);
  const [instagramShareModal, setInstagramShareModal] = useState<{ open: boolean; songTitle: string } | null>(null);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [newSong, setNewSong] = useState({
    titulo: "", descricao: "", genero: "Sertanejo", subgenero: "",
    compositor: "", status: "Disponível", precoX: "", precoY: "", hasPrice: "false",
    isVip: "false", tipoMidia: "audio", youtubeUrl: "", vipCode: "", isPrivate: "false",
  });
  const [musicTermsAccepted, setMusicTermsAccepted] = useState(false);
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
    documento: "",
    biografia: "",
  });

  const [editCustom, setEditCustom] = useState({
    fonte: "Arial",
    cor: "#ffffff",
    background: "padrao",
    player: "padrao",
    playerGradient: "",
    playerCor: "",
    cardStyle: "default",
  });

  const [profileCapaFile, setProfileCapaFile] = useState<File | null>(null);
  const [profileBannerFile, setProfileBannerFile] = useState<File | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingCustom, setSavingCustom] = useState(false);
  const [deletingSongId, setDeletingSongId] = useState<number | null>(null);
  const [vipSenha, setVipSenha] = useState("");
  const [savingVipSenha, setSavingVipSenha] = useState(false);

  // Playlists state
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [dbPlans, setDbPlans] = useState<any[]>([]);
  const [planCouponCode, setPlanCouponCode] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [upgradeBillingType, setUpgradeBillingType] = useState<"CREDIT_CARD" | "PIX">("CREDIT_CARD");
  const [pixModalData, setPixModalData] = useState<{
    encodedImage: string;
    payload: string;
    expirationDate: string;
    invoiceUrl?: string;
  } | null>(null);
  const [planCouponResult, setPlanCouponResult] = useState<{ discountType: string; discountValue: string; discountAmount: string; finalPrice: string; originalPrice: string } | null>(null);
  const [planCouponError, setPlanCouponError] = useState("");
  const [validatingPlanCoupon, setValidatingPlanCoupon] = useState(false);

  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "👋 Olá! Eu sou a Vivi, mentora virtual do PORTALDOARTISTA.COM. Estou aqui para ajudar você a organizar sua carreira, divulgar suas músicas e aproveitar todas as ferramentas da plataforma. Como posso te ajudar hoje?" }
  ]);
  const [currentTool, setCurrentTool] = useState<string>("chat");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [quickQuestion, setQuickQuestion] = useState<string | null>(null);

  const handleQuickMentorQuestion = (text: string) => {
    setQuickQuestion(text);
    setActiveTab("mentor");
  };

  const handleSelectTool = (toolName: string) => {
    setCurrentTool(toolName);
    let intro = "👋 Olá! Eu sou a Vivi. Escolha uma das ferramentas ao lado ou faça uma pergunta livre sobre sua carreira.";
    if (toolName === "biografia") {
      intro = "✍️ Cole sua biografia profissional atual ou conte-me sua história para eu reescrevê-la de forma impactante!";
    } else if (toolName === "potencial") {
      intro = "🎵 Envie a letra, gênero ou tema da sua música para eu analisar seu apelo comercial e público-alvo.";
    } else if (toolName === "legenda") {
      intro = "📱 Diga sobre o que é a sua música ou publicação para eu gerar opções de legendas para Instagram, TikTok e Facebook.";
    } else if (toolName === "reels") {
      intro = "📢 Fale do tema que quer gravar para eu criar um roteiro de vídeo de Reels/TikTok dinâmico de até 60 segundos.";
    } else if (toolName === "hashtags") {
      intro = "🎯 Digite o tema ou estilo do seu post para eu listar hashtags estratégicas.";
    } else if (toolName === "release") {
      intro = "📄 Me conte sobre seu novo lançamento, show ou conquista para eu redigir um press release completo.";
    } else if (toolName === "titulos") {
      intro = "🎼 Conte sobre o tema ou a letra da música para eu sugerir 5 títulos marcantes.";
    }
    
    setChatMessages([
      { role: "assistant", content: intro }
    ]);
  };

  const triggerVivi = async (messagesList: { role: "user" | "assistant"; content: string }[], toolName: string) => {
    setChatLoading(true);
    try {
      const res = await fetch("/api/artists/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: messagesList,
          tool: toolName
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setChatMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
        if (artist) {
          setArtist({
            ...artist,
            aiQueriesCount: data.aiQueriesCount
          });
        }
      } else {
        toast({
          title: "Erro ao consultar a Vivi",
          description: data.error || "Não foi possível obter resposta no momento.",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error("Error communicating with Vivi:", err);
      toast({
        title: "Erro de conexão",
        description: "Falha ao se conectar com a mentora virtual.",
        variant: "destructive"
      });
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "mentor" && quickQuestion) {
      const question = quickQuestion;
      setQuickQuestion(null);
      setCurrentTool("chat");
      const newMsgs = [...chatMessages, { role: "user" as const, content: question }];
      setChatMessages(newMsgs);
      triggerVivi(newMsgs, "chat");
    }
  }, [activeTab, quickQuestion]);

  const getProfileCompletion = () => {
    if (!artist) return { percent: 0, items: [] as { label: string; status: "success" | "warning" | "error" }[] };
    
    let score = 10;
    const items: { label: string; status: "success" | "warning" | "error" }[] = [];
    
    if (artist.profissao && artist.profissao.trim()) {
      score += 10;
      items.push({ label: "Profissão cadastrada", status: "success" });
    } else {
      items.push({ label: "Defina sua profissão no perfil", status: "warning" });
    }
    
    if (artist.cidade && artist.cidade.trim()) {
      score += 10;
      items.push({ label: "Cidade cadastrada", status: "success" });
    } else {
      items.push({ label: "Informe sua cidade de atuação", status: "warning" });
    }
    
    if (artist.contato && artist.contato.trim()) {
      score += 10;
      items.push({ label: "Contato preenchido", status: "success" });
    } else {
      items.push({ label: "Adicione telefone/contato no perfil", status: "warning" });
    }
    
    const artistGenero = (artist as any).genero;
    if (artistGenero && artistGenero.trim()) {
      score += 10;
      items.push({ label: "Gênero musical definido", status: "success" });
    } else {
      items.push({ label: "Selecione seu gênero principal", status: "warning" });
    }
    
    if (artist.capaUrl && !artist.capaUrl.includes("default")) {
      score += 15;
      items.push({ label: "Foto de perfil personalizada", status: "success" });
    } else {
      items.push({ label: "Você está usando a foto padrão", status: "warning" });
    }
    
    if (artist.bannerUrl && !artist.bannerUrl.includes("default")) {
      score += 15;
      items.push({ label: "Banner personalizado", status: "success" });
    } else {
      items.push({ label: "Adicione um banner de destaque", status: "warning" });
    }
    
    const hasInstagram = artist.instagram && artist.instagram.trim();
    const hasTiktok = artist.tiktok && artist.tiktok.trim();
    const hasSpotify = artist.spotify && artist.spotify.trim();
    
    if (hasInstagram) {
      score += 10;
      items.push({ label: "Instagram conectado", status: "success" });
    } else {
      items.push({ label: "Você ainda não conectou seu Instagram", status: "warning" });
    }
    
    if (hasTiktok || hasSpotify) {
      score += 10;
      items.push({ label: "Outras redes conectadas", status: "success" });
    } else {
      items.push({ label: "Preencha links do Spotify ou TikTok", status: "warning" });
    }
    
    if (songs.length === 0) {
      items.push({ label: "Nenhuma música no catálogo", status: "error" });
    } else {
      items.push({ label: `${songs.length} música(s) cadastrada(s)`, status: "success" });
      
      const defaultCoversCount = songs.filter(s => !s.capaUrl || s.capaUrl.includes("default-cover")).length;
      if (defaultCoversCount > 0) {
        items.push({ label: `${defaultCoversCount} música(s) sem capa personalizada`, status: "warning" });
      } else {
        items.push({ label: "Todas as músicas têm capa", status: "success" });
      }
    }

    if (songs.length > 0) {
      const dates = songs.map(s => s.createdAt ? new Date(s.createdAt).getTime() : 0);
      const newestDate = Math.max(...dates);
      if (newestDate > 0) {
        const diffDays = (Date.now() - newestDate) / (1000 * 60 * 60 * 24);
        if (diffDays > 60) {
          items.push({ label: `Sem novas músicas há mais de 60 dias`, status: "error" });
        } else {
          items.push({ label: "Catálogo atualizado recentemente", status: "success" });
        }
      }
    }
    
    return { percent: score, items };
  };
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<any[]>([]);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDesc, setNewPlaylistDesc] = useState("");
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<any | null>(null);
  const { autoPlayPlaylist, setAutoPlayPlaylist, setPlayerColors, setPlayerStyle } = usePlayer();

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: "dashboard",      label: "Dashboard",       icon: BarChart3      },
    { id: "songs",          label: "Músicas",         icon: Music          },
    { id: "playlists",      label: "Playlists",       icon: ListMusic      },
    { id: "gallery",        label: "Galeria",         icon: Image          },
    { id: "profile",        label: "Perfil",          icon: User           },
    ...(openaiEnabled ? [{ id: "mentor" as TabId, label: "Mentora IA", icon: Bot }] : []),
    { id: "vip",            label: "VIP",             icon: Crown          },
    { id: "plano",          label: "Plano",           icon: CreditCard     },
    { id: "interesses",     label: "Interesses",      icon: MessageSquare  },
  ];

  useEffect(() => {
    loadData();
    fetch("/api/plans")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const mapped = data.map((p: any) => ({
            id: p.nome,
            label: p.label,
            preco: p.preco,
            limiteMusicas: parseInt(p.limiteMusicas) || 0,
          }));
          setDbPlans(mapped);
        }
      })
      .catch((err) => console.error("Erro ao carregar planos no dashboard:", err));
  }, []);

  useEffect(() => {
    if (artist && chatMessages.length === 1 && chatMessages[0].content.startsWith("👋 Olá! Eu sou a Vivi")) {
      let welcome = "";
      if (artist.plano === "free") {
        welcome = `👋 Olá, ${artist.name}! Eu sou a Vivi, sua mentora virtual aqui no Portal do Artista. No seu plano **Gratuito**, você pode cadastrar até 2 músicas e possui 10 consultas de IA por mês. Posso te ajudar a organizar sua carreira, gerar ideias de posts ou analisar suas letras. Como posso te apoiar hoje?`;
      } else if (artist.plano === "basico") {
        welcome = `👋 Olá, ${artist.name}! Eu sou a Vivi. Parabéns pelo seu plano **Básico**! Com ele, você pode subir até 20 músicas no catálogo e conta com 30 consultas de IA por mês. Vamos trabalhar na sua biografia, divulgações ou títulos das suas faixas? Me diga o que precisamos fazer hoje.`;
      } else if (artist.plano === "premium") {
        welcome = `👑 Olá, ${artist.name}! Eu sou a Vivi. Como membro **Premium**, você tem acesso total: até 200 músicas, personalização ilimitada do catálogo e 200 consultas de IA por mês. Vamos construir uma estratégia de lançamento de alto impacto para sua carreira? O que quer criar hoje?`;
      } else {
        const planName = artist.plano.charAt(0).toUpperCase() + artist.plano.slice(1);
        welcome = `👋 Olá, ${artist.name}! Eu sou a Vivi. Excelente escolha com o plano **${planName}**! Você tem limites estendidos e ${artist.aiCreditsLimit || 50} consultas de IA por mês. Como posso te ajudar a divulgar suas músicas e alcançar mais fãs hoje?`;
      }
      setChatMessages([{ role: "assistant", content: welcome }]);
    }
  }, [artist]);

  const loadData = async () => {
    try {
      const [statusRes, songsRes, settingsRes] = await Promise.all([
        fetch("/api/artists/status", { credentials: "include" }).then(r => r.json()),
        fetch("/api/songs", { credentials: "include" }).then(r => r.json()),
        fetch("/api/settings").then(r => r.json()).catch(() => ({})),
      ]);

      if (!statusRes.loggedIn) {
        setLocation("/artista/login");
        return;
      }

      setOpenaiEnabled(settingsRes.openaiEnabled || false);
      setSupportChannels({
        instagram: settingsRes.suporteInstagram || "@Portaldoartista.oficial",
        whatsapp: settingsRes.suporteWhatsapp || "21 99589 7040",
        email: settingsRes.suporteEmail || "portaldoartistaoficial@gmail.com"
      });

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
        documento: a.documento || "",
        biografia: a.biografia || "",
      });
      setEditCustom({
        fonte: a.fonte || "Arial",
        cor: a.cor || "#ffffff",
        background: a.layout || "padrao",
        player: a.player || "padrao",
        playerGradient: a.playerGradient || "",
        playerCor: a.playerCor || "",
        cardStyle: a.cardStyle || "default",
      });
      // Apply saved player colors to global player context
      setPlayerColors(a.playerGradient || null, a.playerCor || null);
      setVipSenha(a.vipSenha || "");
    } catch (err) {
      setError("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  // Playlist functions
  const loadPlaylists = async () => {
    try {
      const res = await fetch("/api/playlists", { credentials: "include" });
      const data = await res.json();
      setPlaylists(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading playlists:", err);
    }
  };

  const loadPlaylistSongs = async (playlistId: number) => {
    try {
      const res = await fetch(`/api/playlists/${playlistId}/songs`, { credentials: "include" });
      const data = await res.json();
      setPlaylistSongs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading playlist songs:", err);
    }
  };

  useEffect(() => {
    if (artist?.id) {
      loadPlaylists();
    }
  }, [artist?.id]);

  useEffect(() => {
    if (selectedPlaylist?.id) {
      loadPlaylistSongs(selectedPlaylist.id);
    }
  }, [selectedPlaylist?.id]);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nome: newPlaylistName, descricao: newPlaylistDesc }),
      });
      if (res.ok) {
        setNewPlaylistName("");
        setNewPlaylistDesc("");
        setShowCreatePlaylist(false);
        loadPlaylists();
      }
    } catch (err) {
      console.error("Error creating playlist:", err);
    }
  };

  const handleDeletePlaylist = async (playlistId: number) => {
    if (!confirm("Excluir esta playlist?")) return;
    try {
      const res = await fetch(`/api/playlists/${playlistId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        if (selectedPlaylist?.id === playlistId) setSelectedPlaylist(null);
        loadPlaylists();
      }
    } catch (err) {
      console.error("Error deleting playlist:", err);
    }
  };

  const handleAddSongToPlaylist = async (playlistId: number) => {
    if (!songToAddToPlaylist) return;
    try {
      const res = await fetch(`/api/playlists/${playlistId}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ songId: songToAddToPlaylist.id }),
      });
      if (res.ok) {
        setShowAddToPlaylist(false);
        setSongToAddToPlaylist(null);
        loadPlaylists();
        if (selectedPlaylist?.id === playlistId) {
          loadPlaylistSongs(playlistId);
        }
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao adicionar música");
      }
    } catch (err) {
      console.error("Error adding song to playlist:", err);
    }
  };

  const handleRemoveSongFromPlaylist = async (playlistId: number, songId: number) => {
    try {
      const res = await fetch(`/api/playlists/${playlistId}/songs/${songId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        loadPlaylists();
        loadPlaylistSongs(playlistId);
      }
    } catch (err) {
      console.error("Error removing song from playlist:", err);
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
      // Map background to layout for API
      formData.append("fonte", editCustom.fonte);
      formData.append("cor", editCustom.cor);
      formData.append("layout", editCustom.background);
      formData.append("player", editCustom.player);
      if (editCustom.playerGradient) formData.append("playerGradient", editCustom.playerGradient);
      if (editCustom.playerCor) formData.append("playerCor", editCustom.playerCor);
      formData.append("cardStyle", editCustom.cardStyle);
      if (editProfile.instagram) formData.append("instagram", editProfile.instagram);
      if (editProfile.tiktok) formData.append("tiktok", editProfile.tiktok);
      if (editProfile.spotify) formData.append("spotify", editProfile.spotify);

      const res = await fetch("/api/artists/profile", {
        method: "PUT",
        credentials: "include",
        body: formData,
      });
      if (res.ok) {
        showSaveSuccess();
        // Update global player context with new colors and style immediately
        setPlayerColors(editCustom.playerGradient || null, editCustom.playerCor || null);
        setPlayerStyle(editCustom.player as PlayerStyle);
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
      const body: any = { planId, artistId: artist.id, billingType: upgradeBillingType };
      if (planCouponResult && selectedPlanId === planId) {
        body.couponCode = planCouponCode;
      }
      const res = await fetch("/api/payments/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.activatedDirectly) {
        alert("Plano ativado com sucesso!");
        loadData();
      } else if (data.invoiceUrl) {
        window.open(data.invoiceUrl, "_blank");
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      alert("Erro ao processar pagamento");
    }
  };

  const handleValidatePlanCoupon = async () => {
    if (!planCouponCode || !selectedPlanId) return;
    setValidatingPlanCoupon(true);
    setPlanCouponError("");
    setPlanCouponResult(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: planCouponCode, planId: selectedPlanId }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setPlanCouponError(data.error || "Cupom inválido para este plano");
      } else {
        setPlanCouponResult(data.coupon);
      }
    } catch {
      setPlanCouponError("Erro ao validar cupom");
    } finally {
      setValidatingPlanCoupon(false);
    }
  };

  const handleCancelPlan = async () => {
    if (!artist) return;
    if (!confirm("Tem certeza que deseja cancelar seu plano? Você perderá acesso às funcionalidades premium ao final do ciclo atual.")) return;
    try {
      const res = await fetch("/api/payments/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId: artist.id }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Plano cancelado com sucesso. Você foi movido para o plano gratuito.");
        loadData();
      } else {
        alert(data.error || "Erro ao cancelar plano");
      }
    } catch (err) {
      alert("Erro ao cancelar plano");
    }
  };

  const handleSaveVipSenha = async () => {
    setSavingVipSenha(true);
    try {
      const formData = new FormData();
      formData.append("vipSenha", vipSenha);
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
        alert(data.error || "Erro ao salvar senha VIP");
      }
    } catch (err) {
      alert("Erro ao salvar senha VIP");
    } finally {
      setSavingVipSenha(false);
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
      const isEditing = !!editingSong;
      const url = isEditing
        ? `/api/artist/${artist?.id}/songs/${editingSong.id}`
        : `/api/artist/${artist?.id}/songs`;
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        credentials: "include",
        body: formData,
      });
      if (res.ok) {
        if (!isEditing) {
          setInstagramShareModal({ open: true, songTitle: newSong.titulo });
        }
        setShowAddForm(false);
        setEditingSong(null);
        setNewSong({ titulo: "", descricao: "", genero: "Sertanejo", subgenero: "", compositor: "", status: "Disponível", precoX: "", precoY: "", hasPrice: "false", isVip: "false", tipoMidia: "audio", youtubeUrl: "", vipCode: "", isPrivate: "false" });
        setCapaFile(null);
        setMp3File(null);
        setMusicTermsAccepted(false);
        loadData();
      } else {
        let errorMsg = isEditing ? "Erro ao editar música" : "Erro ao adicionar música";
        try {
          const data = await res.json();
          if (data && data.error) errorMsg = data.error;
        } catch (e) {
          try {
            const rawText = await res.text();
            if (rawText) errorMsg = rawText;
          } catch (e2) {}
        }
        alert(errorMsg);
      }
    } catch (err) {
      alert("Erro ao processar música");
    } finally {
      setUploading(false);
    }
  };

  const [interests, setInterests] = useState<any[]>([]);
  const [loadingInterests, setLoadingInterests] = useState(false);

  const loadInterests = () => {
    if (!artist?.id) return;
    setLoadingInterests(true);
    fetch(`/api/interests/artist/${artist.id}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setInterests(Array.isArray(d) ? d : []))
      .catch(() => setInterests([]))
      .finally(() => setLoadingInterests(false));
  };

  useEffect(() => {
    if (artist?.id) loadInterests();
  }, [artist?.id]);

  useEffect(() => {
    const handler = () => loadInterests();
    document.addEventListener("interestSubmitted", handler);
    return () => document.removeEventListener("interestSubmitted", handler);
  }, []);

  const handleMarkRead = async (id: number) => {
    await fetch(`/api/interests/${id}/read`, { method: "PATCH", credentials: "include" });
  };

  const handleDeleteInterest = async (id: number) => {
    await fetch(`/api/interests/${id}`, { method: "DELETE", credentials: "include" });
    setInterests(prev => prev.filter(i => i.id !== id));
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

      {/* Add to Playlist Modal - fora das tabs */}
      {showAddToPlaylist && songToAddToPlaylist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border/40 rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-foreground">Adicionar à Playlist</h4>
              <button onClick={() => { setShowAddToPlaylist(false); setSongToAddToPlaylist(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">Música: <span className="text-foreground font-medium">{songToAddToPlaylist.titulo}</span></p>
            
            {playlists.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => handleAddSongToPlaylist(playlist.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-left"
                  >
                    <ListMusic className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{playlist.nome}</p>
                      <p className="text-xs text-muted-foreground">{playlist.songCount || 0} músicas</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma playlist criada ainda.
              </p>
            )}
            
            <div className="border-t border-border/50 pt-4">
              <p className="text-xs text-muted-foreground mb-2">Criar nova playlist:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="Nome da playlist"
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm"
                />
                <button
                  onClick={async () => {
                    if (!newPlaylistName.trim()) return;
                    try {
                      const res = await fetch("/api/playlists", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ nome: newPlaylistName }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setNewPlaylistName("");
                        loadPlaylists();
                        handleAddSongToPlaylist(data.id);
                      }
                    } catch (err) {
                      console.error("Error:", err);
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90"
                >
                  Criar e Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="pt-16 md:pt-20 pb-4 px-3 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">Painel do Artista</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Bem-vindo, {artist?.name}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {artist?.slug && (
                <>
                  <a href={`/${artist.slug}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-primary border border-primary/30 hover:bg-primary/10 transition-colors text-xs sm:text-sm font-medium">
                    <ExternalLink className="w-4 h-4" />
                    <span className="hidden sm:inline">Meu Perfil</span>
                    <span className="sm:hidden">Perfil</span>
                  </a>
                  <button onClick={() => setShowShareModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-xs sm:text-sm font-medium">
                    <Share2 className="w-4 h-4 text-primary" />
                    <span>Compartilhar</span>
                  </button>
                </>
              )}
              <button onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-xs sm:text-sm font-medium">
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </button>
              <NotificationBell
                interests={interests}
                onMarkRead={handleMarkRead}
                onDelete={handleDeleteInterest}
                inline
              />
            </div>
          </div>

          {/* Tabs bar com setas interativas (apenas no Desktop) */}
          <div className="relative mb-6 flex items-center group/artisttabbar">
            <button
              type="button"
              onClick={handleArtistScrollLeft}
              className="hidden sm:flex absolute left-0 z-20 w-7 h-7 rounded-full bg-black/90 border border-primary/40 text-primary items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer hover:bg-primary hover:text-black"
              title="Rolar para a esquerda"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background via-background/80 to-transparent z-10 hidden sm:block" />

            <div
              ref={artistTabBarRef}
              className="flex gap-1.5 overflow-x-auto py-2 px-1 sm:px-7 scrollbar-none [&&::-webkit-scrollbar]:hidden [scrollbar-width:none] touch-pan-x scroll-smooth w-full"
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={(e) => {
                      setActiveTab(tab.id);
                      e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                    }}
                    className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? "bg-primary text-black shadow-[0_0_15px_rgba(245,197,24,0.3)] scale-[1.02]"
                        : "bg-card text-muted-foreground border border-border/60 hover:text-white hover:border-primary/50"
                    }`}
                  >
                    <tab.icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-black" : "text-primary/70"}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background via-background/80 to-transparent z-10 hidden sm:block" />

            <button
              type="button"
              onClick={handleArtistScrollRight}
              className="hidden sm:flex absolute right-0 z-20 w-7 h-7 rounded-full bg-black/90 border border-primary/40 text-primary items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer hover:bg-primary hover:text-black"
              title="Rolar para a direita"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* CRM Card */}
          <a href="/artista/crm"
            className="block mb-4 rounded-xl border-2 border-yellow-500/40 bg-gradient-to-r from-yellow-500/10 to-amber-500/5 hover:border-yellow-500/60 hover:from-yellow-500/15 hover:to-amber-500/10 transition-all cursor-pointer overflow-hidden group"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <TrendingUpDown className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-yellow-500">CRM — Gestão de Carreira</h3>
                <p className="text-[11px] text-muted-foreground">Contatos, financeiro, liberações, calendário e suporte</p>
              </div>
              <span className="text-[10px] text-yellow-500 font-medium shrink-0">Abrir →</span>
            </div>
          </a>

          {/* Tab Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Dashboard */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                {/* Alerta de pagamento pendente */}
                {artist && artist.plano !== "free" && !artist.planoAtivo && (
                  <div className="p-4.5 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg">
                    <div className="flex items-start gap-3">
                      <Zap className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <h4 className="font-bold text-white text-sm">Assinatura Pendente de Pagamento</h4>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed font-normal">
                          Seu perfil e os recursos do plano <strong>{artist.plano.toUpperCase()}</strong> estão limitados. Eles serão totalmente liberados assim que o pagamento for confirmado pelo Asaas.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        // Open the invoice by fetching subscription
                        fetch(`/api/payments/subscription/${artist.id}`)
                          .then((r) => r.json())
                          .then((data) => {
                            if (data.subscriptions && data.subscriptions.length > 0) {
                              const sub = data.subscriptions[0];
                              fetch(`/api/payments/invoice/${sub.asaasSubscriptionId}`)
                                .then((r) => r.json())
                                .then((pData) => {
                                  if (pData.invoiceUrl) {
                                    window.open(pData.invoiceUrl, "_blank");
                                  } else {
                                    alert("Fatura não gerada ou indisponível. Fale com o suporte.");
                                  }
                                })
                                .catch(() => alert("Erro ao carregar fatura."));
                            } else {
                              alert("Nenhuma assinatura pendente encontrada.");
                            }
                          })
                          .catch(() => alert("Erro ao buscar assinaturas."));
                      }}
                      className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs transition-colors shrink-0 text-center cursor-pointer"
                    >
                      Pagar Fatura
                    </button>
                  </div>
                )}
                {/* Diagnóstico da Carreira & CTA Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Card do Diagnóstico */}
                  <div className="md:col-span-2 bg-card border border-border/40 rounded-2xl p-6 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        Diagnóstico da Carreira
                      </h3>
                      <span className="text-sm font-semibold text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                        {getProfileCompletion().percent}% completo
                      </span>
                    </div>
                    
                    {/* Barra de progresso */}
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500" 
                        style={{ width: `${getProfileCompletion().percent}%` }}
                      />
                    </div>
                    
                    {/* Checklist */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      {getProfileCompletion().items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          {item.status === "success" && (
                            <span className="w-4 h-4 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 flex items-center justify-center shrink-0">✓</span>
                          )}
                          {item.status === "warning" && (
                            <span className="w-4 h-4 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center justify-center shrink-0">!</span>
                          )}
                          {item.status === "error" && (
                            <span className="w-4 h-4 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center shrink-0">✗</span>
                          )}
                          <span className={item.status === "success" ? "text-muted-foreground" : "text-foreground font-medium"}>
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card de Próximas Ações (Pílulas de CTA) */}
                  <div className="bg-card border border-border/40 rounded-2xl p-6 space-y-4 flex flex-col justify-between shadow-xl">
                    <div>
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-3">
                        <Bot className="w-5 h-5 text-purple-400" />
                        Ação Recomendada
                      </h3>
                      
                      {/* Lógica das Pílulas de CTA */}
                      {(() => {
                        const completion = getProfileCompletion().percent;
                        const hasSongs = songs.length > 0;
                        const isFree = artist?.plano === "free";
                        
                        if (completion < 90) {
                          return (
                            <div className="space-y-3">
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                Complete seu perfil para passar mais credibilidade a fãs e contratantes. Adicione redes sociais, banner e biografia.
                              </p>
                              <button 
                                onClick={() => setActiveTab("profile")}
                                className="w-full py-2 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/95 transition-all shadow-md"
                              >
                                Completar Perfil
                              </button>
                            </div>
                          );
                        }
                        
                        if (!hasSongs) {
                          return (
                            <div className="space-y-3">
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                Sua vitrine está vazia! Envie suas faixas ou releases para que seu perfil fique visível na busca de artistas.
                              </p>
                              <button 
                                onClick={() => setActiveTab("songs")}
                                className="w-full py-2 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/95 transition-all shadow-md"
                              >
                                Subir Músicas
                              </button>
                            </div>
                          );
                        }
                        
                        if (isFree) {
                          return (
                            <div className="space-y-3">
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                Você está no plano Gratuito com limites de upload e personalização. Faça o upgrade e impulsione sua carreira!
                              </p>
                              <button 
                                onClick={() => setActiveTab("plano")}
                                className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-xs font-bold hover:opacity-95 transition-all shadow-md"
                              >
                                Assinar Plano Básico
                              </button>
                            </div>
                          );
                        }
                        
                        // Lembrete da Vivi se tudo estiver concluído
                        return (
                          <div className="space-y-3">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Parabéns! Suas ações básicas estão concluídas. Lembre-se que você pode usar a nossa IA no menu <strong>Mentora IA</strong> para planejar lançamentos e fechar negócios.
                            </p>
                            {openaiEnabled && (
                              <button 
                                onClick={() => setActiveTab("mentor")}
                                className="w-full py-2 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/95 transition-all shadow-md"
                              >
                                Conversar com a Vivi
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    
                    {/* Dica da semana (se a IA estiver ativa) */}
                    {openaiEnabled && (
                      <div className="mt-3 p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                        <div className="flex items-center gap-1.5 text-xs text-purple-400 font-bold mb-1">
                          <Sparkles className="w-3 h-3" />
                          Dica da Semana:
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                          "Grave vídeos curtos mostrando os bastidores da criação da sua música e use-os para engajar no Reels."
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pergunte ao Mentor IA (Vivi) */}
                {openaiEnabled && (
                  <div className="bg-gradient-to-r from-purple-900/10 via-indigo-900/5 to-purple-900/10 border border-purple-500/20 rounded-2xl p-6 space-y-4 shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-lg shrink-0 border border-purple-500/30">
                        🤖
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-sm">Pergunte à Vivi — Sua Mentora Virtual</h4>
                        <p className="text-xs text-muted-foreground">Tire dúvidas sobre sua carreira, marketing ou crie legendas e roteiros de Reels.</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Ex: Como posso divulgar meu novo single nas redes sociais?"
                        id="quick-mentor-input"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const val = (e.target as HTMLInputElement).value;
                            if (val.trim()) {
                              handleQuickMentorQuestion(val);
                            }
                          }
                        }}
                        className="flex-1 px-4 py-2.5 bg-input border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-foreground text-sm"
                      />
                      <button 
                        onClick={() => {
                          const el = document.getElementById("quick-mentor-input") as HTMLInputElement;
                          if (el && el.value.trim()) {
                            handleQuickMentorQuestion(el.value);
                          }
                        }}
                        className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors shadow-md"
                      >
                        Perguntar
                      </button>
                    </div>
                  </div>
                )}

                {/* Gestão de Músicas */}
                <div className="bg-card border border-border/40 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Music className="w-5 h-5 text-primary" />
                      Gestão de Músicas
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{songs.length}/{artist?.limiteMusicas}</span>
                      <button
                        onClick={() => setActiveTab("songs")}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        Adicionar Música
                      </button>
                    </div>
                  </div>

                  {songs.length === 0 ? (
                    <div className="text-center py-8">
                      <Music className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">Nenhuma música cadastrada</p>
                      <button onClick={() => setActiveTab("songs")} className="mt-2 text-sm text-primary hover:underline">Adicionar primeira música</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {songs.slice(0, 6).map((song) => (
                        <div key={song.id} className="flex items-center gap-3 p-3 bg-background/50 rounded-xl border border-border/30 hover:border-primary/30 transition-colors">
                          <img src={song.capaUrl || "/images/default-cover.png"} alt={song.titulo} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground truncate text-sm">{song.titulo}</h4>
                            <p className="text-xs text-muted-foreground">{song.genero}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{Number(song.likes) || 0}</span>
                              <span className="flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />{Number(song.plays) || 0}</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            {song.isVip && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-400">VIP</span>}
                            {song.tipoMidia === "video" && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400">Vídeo</span>}
                          </div>
                        </div>
                      ))}
                      {songs.length > 6 && (
                        <button
                          onClick={() => setActiveTab("songs")}
                          className="flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-sm text-muted-foreground hover:text-primary"
                        >
                          Ver todas ({songs.length})
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Gestão de Perfil */}
                <div className="bg-card border border-border/40 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      Gestão de Perfil
                    </h3>
                    <button
                      onClick={() => setActiveTab("profile")}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
                    >
                      <Palette className="w-4 h-4" />
                      Editar Perfil
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    {artist?.capaUrl ? (
                      <img src={artist.capaUrl} alt={artist.name} className="w-16 h-16 rounded-full object-cover border-2 border-primary/30" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/30">
                        <User className="w-8 h-8 text-primary/50" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-foreground truncate">{artist?.name}</h4>
                      <p className="text-sm text-muted-foreground">{artist?.profissao} {artist?.cidade ? `· ${artist.cidade}` : ""}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {artist?.instagram && <span>@{artist.instagram}</span>}
                        {artist?.plano && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{artist.plano}</span>}
                      </div>
                    </div>
                    {artist?.bannerUrl && (
                      <img src={artist.bannerUrl} alt="Banner" className="w-28 h-12 rounded-lg object-cover border border-border hidden sm:block" />
                    )}
                  </div>
                </div>

                {/* Banner 30 dias grátis Premium */}
                {artist?.plano !== "premium" && (
                  <div className="bg-gradient-to-r from-yellow-500/20 via-yellow-500/10 to-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 mb-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                          <Crown className="w-6 h-6 text-yellow-500" />
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground">Experimente o Premium por 30 dias grátis!</h4>
                          <p className="text-sm text-muted-foreground">Desfrute de todas as vantagens do plano Premium com acesso completo e ilimitado.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab("plano")}
                        className="px-6 py-3 rounded-full bg-yellow-500 text-black font-bold text-sm hover:bg-yellow-400 transition-colors whitespace-nowrap"
                      >
                        Garantir meus 30 dias
                      </button>
                    </div>
                  </div>
                )}

                {/* Métricas do Artista com Elevação 3D */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <motion.div whileHover={{ y: -3 }} className="relative overflow-hidden bg-gradient-to-b from-card/90 via-card/60 to-card/40 border border-border/70 hover:border-primary/40 rounded-2xl p-5 shadow-lg group transition-all">
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/20 transition-all pointer-events-none" />
                    <div className="flex items-center justify-between mb-2 relative z-10">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Músicas</span>
                      <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                        <Music className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-3xl font-extrabold text-white tracking-tight relative z-10">{stats.totalSongs}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 relative z-10 font-medium">Limite do Plano: {artist?.limiteMusicas}</p>
                  </motion.div>

                  <motion.div whileHover={{ y: -3 }} className="relative overflow-hidden bg-gradient-to-b from-card/90 via-card/60 to-card/40 border border-border/70 hover:border-emerald-500/40 rounded-2xl p-5 shadow-lg group transition-all">
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
                    <div className="flex items-center justify-between mb-2 relative z-10">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reproduções</span>
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-3xl font-extrabold text-white tracking-tight relative z-10">{stats.totalPlays}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 relative z-10 font-medium">Plays acumulados</p>
                  </motion.div>

                  <motion.div whileHover={{ y: -3 }} className="relative overflow-hidden bg-gradient-to-b from-card/90 via-card/60 to-card/40 border border-border/70 hover:border-red-500/40 rounded-2xl p-5 shadow-lg group transition-all">
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-red-500/10 rounded-full blur-xl group-hover:bg-red-500/20 transition-all pointer-events-none" />
                    <div className="flex items-center justify-between mb-2 relative z-10">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Curtidas</span>
                      <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
                        <Heart className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-3xl font-extrabold text-white tracking-tight relative z-10">{stats.totalLikes}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 relative z-10 font-medium">Favoritadas por ouvintes</p>
                  </motion.div>

                  <motion.div whileHover={{ y: -3 }} className="relative overflow-hidden bg-gradient-to-b from-card/90 via-card/60 to-card/40 border border-border/70 hover:border-yellow-500/40 rounded-2xl p-5 shadow-lg group transition-all">
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-yellow-500/10 rounded-full blur-xl group-hover:bg-yellow-500/20 transition-all pointer-events-none" />
                    <div className="flex items-center justify-between mb-2 relative z-10">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Conteúdo VIP</span>
                      <div className="w-8 h-8 rounded-lg bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
                        <Crown className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-3xl font-extrabold text-white tracking-tight relative z-10">{stats.vipContent}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 relative z-10 font-medium">Faixas protegidas por senha</p>
                  </motion.div>
                </div>
              </div>
            )}

            {/* Songs */}
            {activeTab === "songs" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">Minhas Músicas ({songs.length}/{artist?.limiteMusicas})</h3>
                  <button 
                    onClick={() => {
                      setEditingSong(null);
                      setNewSong({
                        titulo: "", descricao: "", genero: "Sertanejo", subgenero: "",
                        compositor: "", status: "Disponível", precoX: "", precoY: "", hasPrice: "false",
                        isVip: "false", tipoMidia: "audio", youtubeUrl: "", vipCode: "", isPrivate: "false",
                      });
                      setShowAddForm(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Adicionar Música
                  </button>
                </div>

                {/* Add/Edit Song Form */}
                {showAddForm && (
                  <form onSubmit={handleAddSong} className="bg-card border border-border/40 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-foreground">{editingSong ? "Editar Música" : "Nova Música"}</h4>
                      <button type="button" onClick={() => { setShowAddForm(false); setEditingSong(null); }} className="text-muted-foreground hover:text-foreground">
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
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Arquivo de Áudio (MP3, WAV, M4A, etc.) {!editingSong && " *"}</label>
                            <input type="file" accept="audio/*, .mp3, .wav, .m4a, .aac, .ogg, .flac, .wma" onChange={e => setMp3File(e.target.files?.[0] || null)} required={!editingSong}
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

                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="isPrivate" checked={newSong.isPrivate === "true"} onChange={e => setNewSong({...newSong, isPrivate: e.target.checked ? "true" : "false"})} className="accent-primary" />
                        <label htmlFor="isPrivate" className="text-sm text-muted-foreground">Música Privada</label>
                      </div>

                      <div className="sm:col-span-2 border-t border-border/50 pt-4">
                        <label className="flex items-center gap-2 cursor-pointer mb-3">
                          <input type="checkbox" id="hasPrice" checked={newSong.hasPrice === "true"} onChange={e => setNewSong({...newSong, hasPrice: e.target.checked ? "true" : "false"})} className="accent-primary" />
                          <span className="text-sm font-medium text-foreground">Definir valor para esta música (compositores)</span>
                        </label>
                        {newSong.hasPrice === "true" && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">Valor X (Uso Livre)</label>
                              <input value={newSong.precoX} onChange={e => setNewSong({...newSong, precoX: e.target.value})} placeholder="Ex: 50,00"
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">Valor Y (Uso Exclusivo)</label>
                              <input value={newSong.precoY} onChange={e => setNewSong({...newSong, precoY: e.target.value})} placeholder="Ex: 500,00"
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground" />
                            </div>
                          </div>
                        )}
                        {newSong.hasPrice === "false" && (
                          <p className="text-xs text-muted-foreground">Música será marcada como "A combinar" no perfil público.</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground">
                        Cancelar
                      </button>
                      <button type="submit" disabled={uploading || !musicTermsAccepted} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 disabled:opacity-50">
                        {uploading ? "Enviando..." : "Adicionar"}
                      </button>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                      <input type="checkbox" id="musicTerms" checked={musicTermsAccepted} onChange={e => setMusicTermsAccepted(e.target.checked)} className="accent-primary mt-0.5" />
                      <label htmlFor="musicTerms" className="text-xs text-muted-foreground leading-relaxed">
                        Ao subir esta música, você declara que possui todos os direitos autorais e autorizações necessários para exibir e reproduzir este conteúdo na plataforma. Você concorda que a música pode ser utilizada para fins de demonstração e promoção dentro do Portal do Artista.
                      </label>
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
                          {song.isPrivate && <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-500/20 text-gray-400">Privada</span>}
                          {song.tipoMidia === "video" && <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400">Vídeo</span>}
                          <button
                            onClick={() => {
                              const publicPath = artist?.slug ? `/${artist.slug}` : `/artista/${artist?.id}`;
                              const shareUrl = `${window.location.origin}${publicPath}?musica=${song.id}`;
                              navigator.clipboard.writeText(shareUrl);
                              toast({
                                title: "Link de compartilhamento copiado!",
                                description: "Você pode colar e enviar para quem quiser.",
                              });
                            }}
                            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                            title="Copiar link de compartilhamento da música"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setSongToAddToPlaylist(song); setShowAddToPlaylist(true); }}
                            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                            title="Adicionar à playlist"
                          >
                            <ListMusic className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingSong(song);
                              setNewSong({
                                titulo: song.titulo || "",
                                descricao: song.descricao || "",
                                genero: song.genero || "Sertanejo",
                                subgenero: song.subgenero || "",
                                compositor: song.compositor || "",
                                status: song.status || "Disponível",
                                precoX: song.precoX || "",
                                precoY: song.precoY || "",
                                hasPrice: song.precoX ? "true" : "false",
                                isVip: song.isVip ? "true" : "false",
                                tipoMidia: song.tipoMidia || "audio",
                                youtubeUrl: song.youtubeUrl || "",
                                vipCode: song.vipCode || "",
                                isPrivate: song.isPrivate ? "true" : "false",
                              });
                              setShowAddForm(true);
                            }}
                            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                            title="Editar música"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSong(song.id)}
                            disabled={deletingSongId === song.id}
                            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 disabled:opacity-50"
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

            {/* Playlists */}
            {activeTab === "playlists" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">Minhas Playlists</h3>
                  <button
                    onClick={() => setShowCreatePlaylist(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Nova Playlist
                  </button>
                </div>

                {/* Create Playlist Modal */}
                {showCreatePlaylist && (
                  <div className="bg-card border border-border/40 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-foreground">Criar Playlist</h4>
                      <button onClick={() => setShowCreatePlaylist(false)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Nome da Playlist</label>
                      <input
                        type="text"
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        placeholder="Ex: minhas favoritas"
                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Descrição (opcional)</label>
                      <input
                        type="text"
                        value={newPlaylistDesc}
                        onChange={(e) => setNewPlaylistDesc(e.target.value)}
                        placeholder="Breve descrição"
                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setShowCreatePlaylist(false)} className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground">
                        Cancelar
                      </button>
                      <button onClick={handleCreatePlaylist} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90">
                        Criar
                      </button>
                    </div>
                  </div>
                )}

                {/* Playlists Grid */}
                {playlists.length === 0 ? (
                  <div className="text-center py-12 bg-card border border-dashed border-border/40 rounded-xl">
                    <ListMusic className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhuma playlist criada</p>
                    <p className="text-sm text-muted-foreground mt-1">Crie playlists para organizar suas músicas</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {playlists.map((playlist) => (
                      <div
                        key={playlist.id}
                        className={`bg-card border rounded-xl p-4 cursor-pointer transition-all ${
                          selectedPlaylist?.id === playlist.id ? "border-primary" : "border-border/40 hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedPlaylist(selectedPlaylist?.id === playlist.id ? null : playlist)}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <ListMusic className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-foreground truncate">{playlist.nome}</h4>
                            <p className="text-xs text-muted-foreground">{playlist.songCount || 0} músicas</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeletePlaylist(playlist.id); }}
                            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {playlist.descricao && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{playlist.descricao}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Auto-play toggle */}
                <div className="flex items-center gap-3 p-4 bg-card border border-border/40 rounded-xl">
                  <input
                    type="checkbox"
                    id="autoPlayPlaylist"
                    checked={autoPlayPlaylist}
                    onChange={(e) => setAutoPlayPlaylist(e.target.checked)}
                    className="accent-primary w-4 h-4"
                  />
                  <label htmlFor="autoPlayPlaylist" className="text-sm text-foreground cursor-pointer">
                    <span className="font-medium">Tocar playlists automaticamente</span>
                    <span className="text-muted-foreground"> - Quando terminar uma playlist, toca a próxima automaticamente</span>
                  </label>
                </div>

                {/* Selected Playlist Songs */}
                {selectedPlaylist && (
                  <div className="bg-card border border-border/40 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-foreground">{selectedPlaylist.nome}</h4>
                        <p className="text-sm text-muted-foreground">{playlistSongs.length} músicas</p>
                      </div>
                      <button onClick={() => setSelectedPlaylist(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {playlistSongs.length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-border/40 rounded-lg">
                        <Music className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhuma música nesta playlist</p>
                        <p className="text-xs text-muted-foreground mt-1">Adicione músicas pela aba "Minhas Músicas"</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {playlistSongs.map((song, index) => (
                          <div key={`${song.id}-${index}`} className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border border-border/30 group">
                            <GripVertical className="w-4 h-4 text-muted-foreground opacity-50" />
                            <img src={song.capaUrl || "/images/default-cover.png"} alt={song.titulo} className="w-10 h-10 rounded object-cover" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate text-sm">{song.titulo}</p>
                              <p className="text-xs text-muted-foreground">{song.genero}</p>
                            </div>
                            <button
                              onClick={() => handleRemoveSongFromPlaylist(selectedPlaylist.id, song.id)}
                              className="p-2 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Gallery */}
            {activeTab === "gallery" && artist && (
              <GalleryTab artistId={String(artist.id)} />
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
                      <label className="block text-sm font-medium text-muted-foreground mb-1">CPF ou CNPJ (Obrigatório Asaas)</label>
                      <input
                        type="text"
                        value={editProfile.documento}
                        onChange={(e) => setEditProfile({ ...editProfile, documento: e.target.value })}
                        placeholder="CPF ou CNPJ"
                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground"
                    </div>
                  </div>

                  {/* Nova Seção: Biografia Oficial */}
                  <div className="pt-4 border-t border-border/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-bold text-foreground">
                        Biografia Oficial do Artista *
                      </label>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        Fonte Única (Perfil & Press Kit)
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Escreva a história e trajetória da sua carreira. Esta biografia será utilizada automaticamente no seu perfil público, no Press Kit online e no PDF do Press Kit.
                    </p>
                    <textarea
                      rows={6}
                      maxLength={5000}
                      value={editProfile.biografia}
                      onChange={(e) => setEditProfile({ ...editProfile, biografia: e.target.value })}
                      placeholder="Ex: Nascido em Maricá, Alan Ribeiro iniciou sua trajetória na música aos 12 anos. Com forte influência do sertanejo e da MPB, já compôs mais de 50 canções gravadas por diversos artistas do cenário nacional..."
                      className="w-full bg-background border border-border rounded-xl p-3.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 leading-relaxed font-sans"
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <span>Suporta quebra de linha.</span>
                      <span className={editProfile.biografia.length >= 4800 ? "text-amber-400 font-bold" : ""}>
                        {editProfile.biografia.length} / 5.000 caracteres
                      </span>
                    </div>
                  </div>

                  {artist?.slug && (
                    <div className="flex items-center gap-2 p-3 bg-background/50 rounded-lg border border-border/30">
                      <Link2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Seu link:</span>
                      <a href={`/${artist.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate">
                        {window.location.origin}/{artist.slug}
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

                {/* Personalização */}
                <div className="bg-card border border-border/40 rounded-xl p-6 space-y-4">
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    Personalização
                  </h3>

                  {/* Redes Sociais */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Link2 className="w-4 h-4" /> Redes Sociais
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Instagram</label>
                        <input
                          type="text"
                          value={editProfile.instagram}
                          onChange={(e) => setEditProfile({ ...editProfile, instagram: e.target.value })}
                          placeholder="@seuinstagram"
                          className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">TikTok</label>
                        <input
                          type="text"
                          value={editProfile.tiktok}
                          onChange={(e) => setEditProfile({ ...editProfile, tiktok: e.target.value })}
                          placeholder="@seutiktok"
                          className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground text-sm"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-muted-foreground mb-1">Spotify</label>
                        <input
                          type="url"
                          value={editProfile.spotify}
                          onChange={(e) => setEditProfile({ ...editProfile, spotify: e.target.value })}
                          placeholder="https://open.spotify.com/artist/..."
                          className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fonte */}
                  {artist?.canCustomizeFont ? (
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <Type className="w-4 h-4" /> Fonte do Nome
                      </label>
                      <Command className="rounded-lg border border-border overflow-hidden">
                        <CommandInput 
                          placeholder="Buscar fonte..." 
                          className="border-b border-border"
                        />
                        <CommandList className="max-h-64 overflow-y-auto">
                          <CommandEmpty>Nenhuma fonte encontrada.</CommandEmpty>
                          <CommandGroup>
                            {FONTS.map(f => (
                              <CommandItem
                                key={f.value}
                                value={f.value}
                                onSelect={() => setEditCustom({ ...editCustom, fonte: f.value })}
                                className={`px-3 py-2 cursor-pointer ${
                                  editCustom.fonte === f.value
                                    ? "bg-primary/10"
                                    : "hover:bg-primary/5"
                                }`}
                              >
                                <span className="text-base" style={{ fontFamily: f.value }}>{f.label}</span>
                                {editCustom.fonte === f.value && (
                                  <CheckCheck className="w-4 h-4 text-primary ml-auto" />
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                      <div className="mt-2 p-3 bg-muted/30 rounded-lg border border-border/30">
                        <span className="text-sm text-muted-foreground">Preview: </span>
                        <span className="text-lg font-bold" style={{ fontFamily: editCustom.fonte }}>{artist.name || "Nome do Artista"}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 opacity-60">
                      <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <Type className="w-4 h-4" /> Fonte do Nome
                        <Lock className="w-3 h-3 text-muted-foreground" />
                      </label>
                      <div className="p-4 bg-muted/30 rounded-lg border border-border/30 flex items-center gap-3">
                        <Lock className="w-6 h-6 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-foreground">Fonte bloqueada</p>
                          <p className="text-xs text-muted-foreground">Atualize seu plano para desbloquear</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Background */}
                  {artist?.canCustomizeBackground ? (
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <ImageIcon className="w-4 h-4" /> Cor de Fundo
                    </label>
                    <div className="flex flex-wrap gap-2 items-center">
                      {BACKGROUNDS.map(b => (
                        <button
                          key={b.value}
                          onClick={() => setEditCustom({ ...editCustom, background: b.value })}
                          className={`w-9 h-9 rounded-full border-2 transition-all hover:scale-110 ${
                            (editCustom as any).background === b.value
                              ? "border-primary scale-110 ring-2 ring-primary"
                              : "border-transparent hover:border-primary/50"
                          }`}
                          style={{ background: b.preview, backgroundSize: "cover" }}
                          title={b.label}
                        />
                      ))}
                      <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border">
                        <input
                          type="color"
                          value={/^#[0-9a-fA-F]{3,6}$/.test((editCustom as any).background) ? (editCustom as any).background : "#1a1a2e"}
                          onChange={(e) => setEditCustom({ ...editCustom, background: e.target.value })}
                          className="w-9 h-9 rounded-full cursor-pointer border-0 p-0 hover:scale-110 transition-transform"
                        />
                        <span className="text-xs text-muted-foreground w-16 truncate">
                          {/^#[0-9a-fA-F]{3,6}$/.test((editCustom as any).background) ? (editCustom as any).background : "Personalizar"}
                        </span>
                      </div>
                    </div>
                  </div>
                  ) : (
                  <div className="space-y-3 opacity-60">
                    <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <ImageIcon className="w-4 h-4" /> Cor de Fundo
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    </label>
                    <div className="p-4 bg-muted/30 rounded-lg border border-border/30 flex items-center gap-3">
                      <Lock className="w-6 h-6 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-foreground">Background bloqueado</p>
                        <p className="text-xs text-muted-foreground">Atualize seu plano para desbloquear</p>
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Cor da Fonte */}
                  {artist?.canCustomizeTextColor ? (
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Palette className="w-4 h-4" /> Cor do Texto
                    </label>
                    <div className="flex flex-wrap gap-2 items-center">
                      {COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setEditCustom({ ...editCustom, cor: c })}
                          className={`w-9 h-9 rounded-full border-2 transition-all hover:scale-110 ${
                            editCustom.cor === c ? "border-primary scale-110 ring-2 ring-primary" : "border-transparent hover:border-primary/50"
                          }`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                      <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border">
                        <input
                          type="color"
                          value={editCustom.cor}
                          onChange={(e) => setEditCustom({ ...editCustom, cor: e.target.value })}
                          className="w-9 h-9 rounded-full cursor-pointer bg-transparent border-0 p-0"
                        />
                        <span className="text-xs text-muted-foreground w-16">{editCustom.cor}</span>
                      </div>
                    </div>
                  </div>
                  ) : (
                  <div className="space-y-3 opacity-60">
                    <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Palette className="w-4 h-4" /> Cor do Texto
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    </label>
                    <div className="p-4 bg-muted/30 rounded-lg border border-border/30 flex items-center gap-3">
                      <Lock className="w-6 h-6 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-foreground">Cor do texto bloqueada</p>
                        <p className="text-xs text-muted-foreground">Atualize seu plano para desbloquear</p>
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Player */}
                  {artist?.canCustomizePlayerStyle ? (
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Music className="w-4 h-4" /> Estilo do Player
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PLAYERS.map(p => (
                        <button
                          key={p.value}
                          onClick={() => setEditCustom({ ...editCustom, player: p.value })}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            editCustom.player === p.value
                              ? "border-primary bg-primary/10 ring-2 ring-primary"
                              : "border-border hover:border-primary/50 hover:bg-primary/5"
                          }`}
                        >
                          <span className="text-sm font-medium text-foreground block">{p.label}</span>
                          <span className="text-xs text-muted-foreground mt-0.5 block">{p.description}</span>
                          {editCustom.player === p.value && (
                            <div className="mt-2 pt-2 border-t border-primary/30">
                              <PlayerPreviewMini style={p.value} editCustom={editCustom} />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  ) : (
                  <div className="space-y-3 opacity-60">
                    <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Music className="w-4 h-4" /> Estilo do Player
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    </label>
                    <div className="p-4 bg-muted/30 rounded-lg border border-border/30 flex items-center gap-3">
                      <Lock className="w-6 h-6 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-foreground">Estilo do player bloqueado</p>
                        <p className="text-xs text-muted-foreground">Atualize seu plano para desbloquear</p>
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Cor do Player */}
                  {artist?.canCustomizePlayerColor ? (
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Palette className="w-4 h-4" /> Cor do Player
                    </label>
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs text-muted-foreground mb-2 block">Gradiente</span>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          <button
                            key="none"
                            onClick={() => setEditCustom({ ...editCustom, playerGradient: "", playerCor: "" })}
                            className={`p-1.5 rounded-lg border-2 text-center transition-all ${
                              !editCustom.playerGradient && !editCustom.playerCor ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/50"
                            }`}
                          >
                            <div className="w-full h-8 rounded-md bg-muted mb-0.5" />
                            <span className="text-[10px] text-muted-foreground">Padrão</span>
                          </button>
                          {PLAYER_GRADIENTS.map(g => (
                            <button
                              key={g.value}
                              onClick={() => setEditCustom({ ...editCustom, playerGradient: g.value, playerCor: "" })}
                              className={`p-1.5 rounded-lg border-2 text-center transition-all ${
                                editCustom.playerGradient === g.value ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/50"
                              }`}
                            >
                              <div
                                className="w-full h-8 rounded-md mb-0.5 shadow-inner"
                                style={{ background: g.value }}
                              />
                              <span className="text-[10px] text-muted-foreground">{g.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground mb-2 block">Cor Sólida</span>
                        <div className="flex flex-wrap gap-2 items-center">
                          {PLAYER_COLORS.map(c => (
                            <button
                              key={c}
                              onClick={() => setEditCustom({ ...editCustom, playerCor: c, playerGradient: "" })}
                              className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                                editCustom.playerCor === c ? "border-primary scale-110 ring-2 ring-primary" : "border-transparent hover:border-primary/50"
                              }`}
                              style={{ backgroundColor: c }}
                              title={c}
                            />
                          ))}
                          <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border">
                            <input
                              type="color"
                              value={editCustom.playerCor || "#ffffff"}
                              onChange={(e) => setEditCustom({ ...editCustom, playerCor: e.target.value, playerGradient: "" })}
                              className="w-8 h-8 rounded-full cursor-pointer bg-transparent border-0 p-0"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  ) : (
                  <div className="space-y-3 opacity-60">
                    <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Palette className="w-4 h-4" /> Cor do Player
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    </label>
                    <div className="p-4 bg-muted/30 rounded-lg border border-border/30 flex items-center gap-3">
                      <Lock className="w-6 h-6 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-foreground">Cor do player bloqueada</p>
                        <p className="text-xs text-muted-foreground">Atualize seu plano para desbloquear</p>
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Estilo dos Cards */}
                  {artist?.canCustomizePlayerStyle ? (
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Disc className="w-4 h-4" /> Estilo dos Cards de Música
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Default card */}
                      <button
                        onClick={() => setEditCustom({ ...editCustom, cardStyle: "default", player: editCustom.player === "ipod" ? "padrao" : editCustom.player })}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          editCustom.cardStyle === "default"
                            ? "border-primary bg-primary/10 ring-2 ring-primary"
                            : "border-border hover:border-primary/50 hover:bg-primary/5"
                        }`}
                      >
                        {/* Mini preview — default card */}
                        <div className="w-full max-w-[150px] aspect-square mx-auto rounded-lg bg-card border border-border/50 mb-2 overflow-hidden relative">
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-2 left-2 right-2">
                            <div className="h-2 bg-primary/60 rounded-full w-3/4 mb-1" />
                            <div className="h-1.5 bg-white/30 rounded-full w-1/2" />
                          </div>
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary/80 flex items-center justify-center">
                            <Play className="w-2.5 h-2.5 text-black fill-black ml-0.5" />
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-foreground block">Padrão</span>
                        <span className="text-xs text-muted-foreground">Card clássico com capa e player</span>
                      </button>

                      {/* iPod card */}
                      <button
                        onClick={() => setEditCustom({ ...editCustom, cardStyle: "ipod", player: "ipod" })}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          editCustom.cardStyle === "ipod"
                            ? "border-primary bg-primary/10 ring-2 ring-primary"
                            : "border-border hover:border-primary/50 hover:bg-primary/5"
                        }`}
                      >
                        {/* Mini preview — iPod */}
                        <div className="w-full max-w-[150px] aspect-square mx-auto rounded-[14px] mb-2 p-2 bg-[#1a1a1a] border border-white/10 flex flex-col justify-between shadow-inner">
                          {/* mini square cover art */}
                          <div className="w-full aspect-square rounded bg-[#121212] border border-white/5 flex items-center justify-center overflow-hidden relative">
                            <Music className="w-4 h-4 text-white/20" />
                            {/* Overlay tag indicator */}
                            <div className="absolute top-1 left-1 bg-[#1a1a1a]/80 scale-[0.6] origin-top-left px-1 py-0.5 rounded border border-white/10">
                              <span className="text-white text-[8px] font-bold">GEN</span>
                            </div>
                            <div className="absolute top-1 right-1 bg-emerald-500/80 scale-[0.6] origin-top-right px-1 py-0.5 rounded">
                              <span className="text-white text-[8px] font-bold">DISP</span>
                            </div>
                          </div>
                          {/* mini progress bar */}
                          <div className="w-full mt-1.5 space-y-0.5">
                            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: "65%", background: editCustom.playerCor || "#f5c518" }} />
                            </div>
                            <div className="flex items-center justify-between text-[7px] text-white/30 font-mono scale-[0.8] origin-top">
                              <span>0:45</span>
                              <span>3:10</span>
                            </div>
                          </div>
                          {/* mini click wheel */}
                          <div
                            className="w-9 h-9 rounded-full mx-auto mt-1 flex items-center justify-center relative bg-[#222] border border-white/10"
                            style={{ boxShadow: "inset 0 1px 3px rgba(0,0,0,0.8)" }}
                          >
                            <span className="absolute top-0.5 text-[4px] font-black text-white/30 tracking-[0.2px]">MENU</span>
                            <span className="absolute left-1 text-[4px] text-white/30">◄◄</span>
                            <span className="absolute right-1 text-[4px] text-white/30">►►</span>
                            <span className="absolute bottom-0.5 text-[4px] text-white/30 scale-[0.7]">►║</span>
                            {/* Center center button */}
                            <div
                              className="w-3.5 h-3.5 rounded-full shadow"
                              style={{ background: editCustom.playerGradient || editCustom.playerCor || "#f5c518" }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-foreground block">iPod</span>
                        <span className="text-xs text-muted-foreground">Player embutido no card</span>
                      </button>
                    </div>
                    {editCustom.cardStyle === "ipod" && (
                      <p className="text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                        ✨ No estilo iPod, a música toca <strong>dentro do card</strong> enquanto visível. Ao rolar a página, o player aparece no rodapé automaticamente.
                      </p>
                    )}
                  </div>
                  ) : (
                  <div className="space-y-3 opacity-60">
                    <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Disc className="w-4 h-4" /> Estilo dos Cards
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    </label>
                    <div className="p-4 bg-muted/30 rounded-lg border border-border/30 flex items-center gap-3">
                      <Lock className="w-6 h-6 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-foreground">Estilo dos cards bloqueado</p>
                        <p className="text-xs text-muted-foreground">Atualize seu plano para desbloquear</p>
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Preview */}
                  <div className="border-2 border-border/50 rounded-xl overflow-hidden">
                    <div className="bg-muted/50 px-4 py-2 border-b border-border/50">
                      <span className="text-xs font-medium text-muted-foreground">Prévia da sua página</span>
                    </div>
                    <div
                      className="relative min-h-[220px] overflow-hidden"
                      style={{
                        fontFamily: editCustom.fonte,
                      }}
                    >
                      {/* Banner Image or Background */}
                      {artist?.bannerUrl ? (
                        <div 
                          className="absolute inset-0"
                          style={{
                            backgroundImage: `url("${artist.bannerUrl}")`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        />
                      ) : (
                        <div 
                          className="absolute inset-0"
                          style={{
                            background: (editCustom as any).background === "padrao" ? "hsl(var(--background))" :
                                       (editCustom as any).background === "escuro" ? "#1a1a2e" :
                                       (editCustom as any).background === "escuro-azul" ? "#0f0f23" :
                                       (editCustom as any).background === "preto" ? "#000000" :
                                       (editCustom as any).background === "branco" ? "#ffffff" :
                                       (editCustom as any).background === "bege" ? "#f5f0e1" :
                                       (editCustom as any).background === "cinza-claro" ? "#e5e5e5" :
                                       (editCustom as any).background === "azul-escuro" ? "#1e3a5f" :
                                       (editCustom as any).background === "verde-escuro" ? "#1a4d1a" :
                                       (editCustom as any).background === "roxo-escuro" ? "#2d1b4e" :
                                       (editCustom as any).background === "verde-azul" ? "#1a4d4d" :
                                       (editCustom as any).background === "lilas" ? "#4a1a6b" :
                                       (editCustom as any).background === "cinza-escuro" ? "#2d2d2d" :
                                       (editCustom as any).background === "azul-azul" ? "#1a3a5f" :
                                       (editCustom as any).background === "vermelho-escuro" ? "#5f1a1a" :
                                       (editCustom as any).background === "dourado" ? "#5f4a1a" :
                                       (editCustom as any).background === "turquesa" ? "#1a5f5f" :
                                       (editCustom as any).background === "gradiente-azul" ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" :
                                       (editCustom as any).background === "gradiente-verde" ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" :
                                       (editCustom as any).background === "gradiente-roxo" ? "linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)" :
                                       (editCustom as any).background === "gradiente-sol" ? "linear-gradient(135deg, #f5af19 0%, #f12711 100%)" :
                                       (editCustom as any).background === "gradiente-oceano" ? "linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)" :
                                       (editCustom as any).background === "gradiente-rosa" ? "linear-gradient(135deg, #ff6a88 0%, #ff9a9e 100%)" :
                                       (editCustom as any).background === "gradiente-aurora" ? "linear-gradient(135deg, #00c6ff 0%, #0072ff 50%, #00c6ff 100%)" :
                                       (editCustom as any).background === "gradiente-tropical" ? "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)" :
                                       (editCustom as any).background === "gradiente-pink" ? "linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)" :
                                       "hsl(var(--background))",
                          }}
                        />
                      )}
                      
                      {/* Gradient overlay */}
                      <div 
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)",
                        }}
                      />
                      
                      {/* Profile photo */}
                      <div className="absolute top-20 left-4 z-10">
                        <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white/50 shadow-2xl bg-black/30 flex items-center justify-center">
                          {artist?.capaUrl ? (
                            <img src={artist.capaUrl} alt={artist.name} className="w-full h-full object-cover" />
                          ) : (
                            <Music className="w-8 h-8 text-white/70" />
                          )}
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="relative pt-28 pb-6 pl-4 pr-4 text-left" style={{ marginLeft: "6rem" }}>
                        <h2 className="text-2xl font-bold text-white mb-1">{artist?.name || "Nome do Artista"}</h2>
                        <p className="text-sm text-white/70">{artist?.profissao || "Cantor"} · {artist?.cidade || "Cidade"}</p>
                      </div>
                    </div>
                    
                    {/* Song preview */}
                    <div className="p-6 bg-card/30 border-t border-border/50">
                      <p className="text-sm font-bold text-white mb-4 tracking-tight">Músicas (Prévia do Layout)</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Se não houver músicas, usamos um modelo mock para demonstrar */}
                        {(songs.length > 0 ? songs.slice(0, 2) : [
                          {
                            id: 999,
                            titulo: "Exemplo de Música",
                            descricao: "Esta é uma prévia do card de música da sua página pública.",
                            genero: "Sertanejo Vanera",
                            compositor: "Nome do Compositor",
                            status: "Disponível",
                            precoX: "150.00",
                            precoY: "350.00",
                            duracao: "208",
                            capaUrl: null,
                            tipoMidia: "audio",
                            plays: "1250",
                            likes: "340"
                          }
                        ]).map((song) => {
                          const disponivel = song.status === "Disponível";
                          const accent = editCustom.playerGradient || editCustom.playerCor || "#f5c518";

                          if (editCustom.cardStyle === "ipod") {
                            return (
                              <div key={song.id} className="relative rounded-[24px] p-4 flex flex-col bg-[#161616] border border-white/10 shadow-xl">
                                {/* Cover Container */}
                                <div className="relative aspect-square w-full rounded-2xl overflow-hidden mb-4 bg-[#121212] border border-white/5 shadow-md">
                                  {song.capaUrl ? (
                                    <img src={song.capaUrl} alt={song.titulo} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-white/5">
                                      <Music className="w-12 h-12 text-white/20" />
                                    </div>
                                  )}

                                  {/* Badges Overlayed on Top of the Cover */}
                                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                                    <div className="flex items-center gap-1 bg-[#121212]/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                                      <Music className="w-3.5 h-3.5" style={{ color: accent }} />
                                      <span className="text-[9px] font-bold text-white/90 uppercase tracking-wider">
                                        {song.genero}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-[#121212]/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                                      <span className={`w-2 h-2 rounded-full ${disponivel ? "bg-emerald-500" : "bg-rose-500"}`} />
                                      <span className="text-[9px] font-bold text-white/90">
                                        {disponivel ? "Disponível" : "Reservado"}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Title & Info Block */}
                                <div className="flex items-center justify-between mb-3 min-w-0">
                                  <div className="min-w-0 flex-1 pr-2">
                                    <h3 className="font-bold text-base text-white truncate leading-tight tracking-tight">
                                      {song.titulo}
                                    </h3>
                                    <p className="text-xs text-white/50 truncate font-medium mt-0.5">
                                      {song.compositor || "-"}
                                    </p>
                                  </div>
                                  <button className="shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-full" style={{ background: accent, color: "#121212" }}>
                                    Tenho Interesse
                                  </button>
                                </div>

                                {/* Linear Progress Bar */}
                                <div className="space-y-1 mb-4">
                                  <div className="relative w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className="absolute top-0 left-0 h-full rounded-full" style={{ width: "30%", background: accent }} />
                                  </div>
                                  <div className="flex items-center justify-between text-[9px] text-white/40 font-mono tracking-tight">
                                    <span>0:45</span>
                                    <span>3:28</span>
                                  </div>
                                </div>

                                {/* Click Wheel Section */}
                                <div className="flex justify-center mb-2">
                                  <div className="relative w-28 h-28 rounded-full bg-[#202020] border border-white/10 flex items-center justify-center shadow-inner">
                                    {/* Click Wheel Labels */}
                                    <span className="absolute top-2 text-[8px] font-black text-white/40 tracking-wider">MENU</span>
                                    <span className="absolute left-2.5 text-[8px] font-bold text-white/40">◄◄</span>
                                    <span className="absolute right-2.5 text-[8px] font-bold text-white/40">►►</span>
                                    <span className="absolute bottom-2 text-[8px] font-bold text-white/40 flex items-center gap-0.5">►║</span>
                                    
                                    {/* Center Button */}
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#161616] border border-white/5">
                                      <Play className="w-3.5 h-3.5 ml-0.5" style={{ color: accent, fill: accent }} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          } else {
                            // Standard/Default card layout preview
                            const formatVal = (v: string | null) => v ? parseFloat(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : null;
                            const px = formatVal(song.precoX);
                            const py = formatVal(song.precoY);

                            return (
                              <div key={song.id} className="relative flex flex-col bg-card/60 border border-border/40 rounded-2xl overflow-hidden shadow-md">
                                {/* Thumbnail */}
                                <div className="relative aspect-square overflow-hidden bg-black/40">
                                  {song.capaUrl ? (
                                    <img src={song.capaUrl} alt={song.titulo} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-white/5">
                                      <Music className="w-12 h-12 text-white/20" />
                                    </div>
                                  )}

                                  {/* Badges topo-esquerda */}
                                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                                    <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                                      <Music className="w-3 h-3 text-primary" />
                                      <span className="text-[10px] font-medium text-white/95">{song.genero}</span>
                                    </div>
                                    <div className={`self-start px-2.5 py-0.5 rounded-full text-[10px] font-bold ${disponivel ? "bg-green-600/80" : "bg-red-600/80"} text-white`}>
                                      {disponivel ? "Disponível" : "Reservado"}
                                    </div>
                                  </div>
                                </div>

                                {/* Body */}
                                <div className="p-4 flex-1 flex flex-col">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <h3 className="text-base font-bold text-white truncate flex-1">{song.titulo}</h3>
                                    <button className="shrink-0 px-2 py-1 rounded bg-primary text-primary-foreground text-[10px] font-bold">
                                      Interesse
                                    </button>
                                  </div>
                                  {song.compositor && <p className="text-[11px] text-muted-foreground mb-1">Compositor: {song.compositor}</p>}
                                  <p className="text-xs text-muted-foreground line-clamp-2 flex-1 mb-3">{song.descricao}</p>

                                  {(px || py) && (
                                    <div className="flex gap-1.5 mb-3 text-[10px]">
                                      {px && (
                                        <div className="flex-1 bg-secondary/20 border border-border/50 rounded-lg p-1.5 text-center">
                                          <div className="text-muted-foreground scale-[0.9]">Livre</div>
                                          <div className="text-primary font-bold">{px}</div>
                                        </div>
                                      )}
                                      {py && (
                                        <div className="flex-1 bg-secondary/20 border border-border/50 rounded-lg p-1.5 text-center">
                                          <div className="text-muted-foreground scale-[0.9]">Exclusivo</div>
                                          <div className="text-primary font-bold">{py}</div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  <div className="space-y-2 mt-auto">
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                      <span className="flex items-center gap-0.5"><PlayCircle className="w-3 h-3" /> {song.plays}</span>
                                      <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {song.likes}</span>
                                    </div>
                                    <button className="w-full py-2 rounded-xl text-xs font-semibold bg-secondary/30 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all">
                                      Tocar Música
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Player Preview - matches actual AudioPlayer style */}
                  {artist?.canCustomizePlayerStyle && (
                    <div className="border-2 border-border/50 rounded-xl overflow-hidden">
                      <div className="bg-muted/50 px-4 py-2 border-b border-border/50">
                        <span className="text-xs font-medium text-muted-foreground">Prévia do Player - {PLAYERS.find(p => p.value === editCustom.player)?.label || "Padrão"}</span>
                      </div>
                      <div className="p-3">
                        <PlayerPreviewMini style={editCustom.player} editCustom={editCustom} />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleSaveCustom}
                    disabled={savingCustom}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 text-base"
                  >
                    {savingCustom ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Salvar Personalização
                  </button>
                </div>
              </div>
            )}

            {/* Personalização (merged into profile) - kept for logic */}


            {/* VIP */}
            {activeTab === "vip" && (
              <div className="space-y-6">
                <div className="bg-card border border-border/40 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    Senha de Acesso VIP
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Defina uma senha para que seus fãs acessem conteúdo exclusivo no seu perfil.
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={vipSenha}
                        onChange={(e) => setVipSenha(e.target.value)}
                        placeholder="Ex: fã2024"
                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground"
                      />
                    </div>
                    <button
                      onClick={handleSaveVipSenha}
                      disabled={savingVipSenha}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {savingVipSenha ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Salvar
                    </button>
                  </div>
                  {vipSenha && (
                    <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                      <CheckCheck className="w-3 h-3" /> Senha ativa — fãs precisam digitá-la para acessar conteúdo VIP
                    </p>
                  )}
                </div>

                <div className="bg-card border border-border/40 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Music className="w-5 h-5 text-primary" />
                      Músicas VIP
                    </h3>
                    <span className="text-sm text-muted-foreground">{songs.filter(s => s.isVip).length} música{songs.filter(s => s.isVip).length !== 1 ? "s" : ""}</span>
                  </div>

                  {songs.filter(s => s.isVip).length === 0 ? (
                    <div className="text-center py-8">
                      <Crown className="w-10 h-10 text-yellow-500/30 mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">Nenhuma música VIP</p>
                      <button onClick={() => setActiveTab("songs")} className="mt-2 text-sm text-primary hover:underline">Marcar música como VIP</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {songs.filter(s => s.isVip).map((song) => (
                        <div key={song.id} className="flex items-center gap-3 p-3 bg-background/50 rounded-xl border border-yellow-500/10">
                          <img src={song.capaUrl || "/images/default-cover.png"} alt={song.titulo} className="w-10 h-10 rounded-lg object-cover" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground truncate text-sm">{song.titulo}</h4>
                            <p className="text-xs text-muted-foreground">{song.genero}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-400">VIP</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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

                {artist?.plano && artist.plano !== "free" && (
                  <div className="mb-6">
                    <button
                      onClick={handleCancelPlan}
                      className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors"
                    >
                      Cancelar Plano
                    </button>
                  </div>
                )}

                <h4 className="font-bold text-foreground mb-3">Atualizar Plano</h4>

                <div className="mb-4">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Cupom de Desconto
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={planCouponCode}
                      onChange={(e) => { setPlanCouponCode(e.target.value.toUpperCase()); setPlanCouponResult(null); setPlanCouponError(""); }}
                      placeholder="Insira seu cupom"
                      className="flex-1 px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm font-mono focus:border-primary focus:ring-1 focus:ring-primary uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleValidatePlanCoupon}
                      disabled={!planCouponCode || validatingPlanCoupon}
                      className="px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 text-sm"
                    >
                      {validatingPlanCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
                    </button>
                  </div>
                  {planCouponError && (
                    <p className="text-xs text-red-400 mt-1">{planCouponError}</p>
                  )}
                  {planCouponResult && (
                    <p className="text-xs text-green-400 mt-1">
                      Cupom aplicado! Desconto de {planCouponResult.discountType === "percentage" ? `${planCouponResult.discountValue}%` : `R$ ${parseFloat(planCouponResult.discountValue).toFixed(2)}`}.
                      Selecione um plano abaixo para atualizar.
                    </p>
                  )}
                </div>

                <div className="mb-6 p-4 rounded-xl border border-border/40 bg-background/30 space-y-3">
                  <label className="block text-sm font-semibold text-foreground">
                    Forma de Pagamento para Atualização
                  </label>
                  <div className="flex gap-2 max-w-sm">
                    <button
                      type="button"
                      onClick={() => setUpgradeBillingType("CREDIT_CARD")}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                        upgradeBillingType === "CREDIT_CARD"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/40 bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      Cartão de Crédito
                    </button>
                    <button
                      type="button"
                      onClick={() => setUpgradeBillingType("PIX")}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                        upgradeBillingType === "PIX"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/40 bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="font-bold">PIX</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(dbPlans.length > 0 ? dbPlans : DEFAULT_PLANS).filter(p => p.id !== artist?.plano).map((plan) => {
                    const showDiscount = planCouponResult && selectedPlanId === plan.id;
                    return (
                    <div 
                      key={plan.id} 
                      onClick={() => { setSelectedPlanId(plan.id); handleUpgradePlan(plan.id); }}
                      className="p-4 rounded-xl border border-border/40 bg-background/50 hover:border-primary/60 transition-all cursor-pointer group clickable-item flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-bold text-foreground group-hover:text-primary transition-colors">{plan.label}</h5>
                          {showDiscount ? (
                            <div className="text-right">
                              <span className="text-lg font-bold text-green-400">
                                R$ {parseFloat(planCouponResult!.finalPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </span>
                              <span className="block text-xs text-muted-foreground line-through">
                                R$ {plan.preco}
                              </span>
                            </div>
                          ) : (
                            <span className="text-lg font-bold text-primary">R$ {plan.preco}/mês</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-3"> até {plan.limiteMusicas} músicas</p>
                      </div>
                      <button
                        className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm group-hover:bg-primary/90 flex items-center justify-center gap-2 transition-all pointer-events-none"
                      >
                        <CreditCard className="w-4 h-4" />
                        Atualizar para {plan.label}
                      </button>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Interesses */}
            {activeTab === "interesses" && artist && (
              <ArtistInteresses artistId={artist.id} />
            )}

            {/* Mentora IA (Vivi) */}
            {activeTab === "mentor" && openaiEnabled && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[500px]">
                {/* Painel Lateral - Ferramentas */}
                <div className="lg:col-span-1 bg-card border border-border/40 rounded-2xl p-4 space-y-3 shadow-xl">
                  <h4 className="font-bold text-foreground text-xs px-2 flex items-center gap-1.5 uppercase tracking-wider text-purple-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    Ferramentas de IA
                  </h4>
                  <p className="text-[11px] text-muted-foreground px-2 leading-relaxed">
                    Selecione uma tarefa específica para Vivi focar seu conhecimento:
                  </p>
                  
                  <div className="space-y-1">
                    {[
                      { id: "chat", label: "Conversa Livre", icon: MessageSquare },
                      { id: "biografia", label: "Melhorar Biografia", icon: User },
                      { id: "potencial", label: "Análise de Música", icon: Music },
                      { id: "legenda", label: "Legenda de Posts", icon: ImageIcon },
                      { id: "reels", label: "Roteiro de Reels", icon: PlayCircle },
                      { id: "hashtags", label: "Sugestão de Hashtags", icon: Share2 },
                      { id: "release", label: "Criar Press Release", icon: Disc },
                      { id: "titulos", label: "Ideias de Títulos", icon: Pencil }
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleSelectTool(t.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs transition-colors ${
                          currentTool === t.id
                            ? "bg-primary text-primary-foreground font-bold"
                            : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                        }`}
                      >
                        <t.icon className="w-3.5 h-3.5" />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Área de Chat */}
                <div className="lg:col-span-3 flex flex-col bg-card border border-border/40 rounded-2xl overflow-hidden h-[520px] shadow-xl">
                  {/* Top Bar do Chat */}
                  <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between bg-background/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold shrink-0">
                        Vivi
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-sm">Vivi — Mentora Musical</h4>
                        <span className="text-[10px] text-purple-400 font-medium">Online e pronta para ajudar</span>
                      </div>
                    </div>

                    {/* IA Usage Counter */}
                    {artist && (
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-muted-foreground block">Uso de IA no mês</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                            <div 
                              className="h-full bg-purple-500" 
                              style={{ width: `${Math.min(100, (((artist.aiQueriesCount || 0) / (artist.aiCreditsLimit || 10)) * 100))}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-foreground">
                            {artist.aiQueriesCount || 0} / {artist.aiCreditsLimit || 10}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Histórico do Chat */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: "thin" }}>
                    {chatMessages.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                      >
                        {msg.role === "assistant" && (
                          <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xs shrink-0 select-none">
                            👩‍🎤
                          </div>
                        )}
                        <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                          msg.role === "user" 
                            ? "bg-primary text-primary-foreground rounded-tr-none" 
                            : "bg-background/40 border border-border/30 text-foreground rounded-tl-none"
                        }`} style={{ whiteSpace: "pre-wrap" }}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    
                    {chatLoading && (
                      <div className="flex gap-3 mr-auto max-w-[85%] items-center">
                        <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xs shrink-0 select-none">
                          👩‍🎤
                        </div>
                        <div className="bg-background/40 border border-border/30 p-3 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input do Chat */}
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!chatInput.trim() || chatLoading) return;
                      const text = chatInput;
                      setChatInput("");
                      const newMsgs = [...chatMessages, { role: "user" as const, content: text }];
                      setChatMessages(newMsgs);
                      await triggerVivi(newMsgs, currentTool);
                    }}
                    className="p-3 border-t border-border/40 bg-background/20 flex gap-2"
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder={
                        currentTool === "biografia" ? "Cole sua biografia ou digite sobre sua carreira..." :
                        currentTool === "potencial" ? "Cole a letra ou conte o tema da música..." :
                        currentTool === "legenda" ? "Descreva seu lançamento para gerar a legenda..." :
                        currentTool === "reels" ? "Fale sobre a música para criar o roteiro de Reels..." :
                        currentTool === "hashtags" ? "Fale o tema do post para sugerir hashtags..." :
                        currentTool === "release" ? "Descreva seu lançamento/evento para o release..." :
                        currentTool === "titulos" ? "Descreva a história da música para sugerir títulos..." :
                        "Fale com a Vivi..."
                      }
                      disabled={chatLoading}
                      className="flex-1 px-4 py-2.5 bg-input border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-foreground text-sm disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={chatLoading || !chatInput.trim()}
                      className="px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      Enviar
                    </button>
                  </form>
                </div>
              </div>
            )}

          </motion.div>
        </div>
      </div>
    
      {pixModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border/40 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setPixModalData(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                <span className="font-bold text-lg">PIX</span>
              </div>
              <h3 className="font-bold text-lg text-white">Pagamento da Assinatura</h3>
              <p className="text-xs text-muted-foreground">
                Escaneie o QR Code abaixo com o app do seu banco ou copie a chave Copia e Cola.
              </p>
            </div>

            {/* QR Code */}
            <div className="bg-white p-4 rounded-2xl mx-auto w-48 h-48 flex items-center justify-center shadow-inner border border-zinc-200">
              <img
                src={`data:image/png;base64,${pixModalData.encodedImage}`}
                alt="PIX QR Code"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Copia e Cola */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-muted-foreground">Código Pix Copia e Cola</label>
              <div className="flex gap-2 bg-background border border-border rounded-xl p-1.5">
                <input
                  type="text"
                  readOnly
                  value={pixModalData.payload}
                  className="flex-1 bg-transparent border-0 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-0 truncate"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(pixModalData.payload);
                    alert("Código Copia e Cola copiado para a área de transferência!");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shrink-0"
                >
                  Copiar
                </button>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setPixModalData(null)}
                className="w-full py-2.5 rounded-xl font-bold bg-zinc-800 text-foreground hover:bg-zinc-700 transition-colors text-sm"
              >
                Já paguei, fechar janela
              </button>
              {pixModalData.invoiceUrl && (
                <a
                  href={pixModalData.invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-xs text-muted-foreground hover:text-foreground underline transition-colors"
                >
                  Abrir fatura completa no Asaas
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {showShareModal && artist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border/40 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowShareModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto mb-2">
                <Share2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-white">Compartilhar Perfil</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Divulgue seu link ou baixe o QR Code exclusivo para colocar em banners, flyers ou redes sociais.
              </p>
            </div>

            {/* Link Copy block */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-muted-foreground">Seu Link Profissional</label>
              <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-1.5">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/${artist.slug}`}
                  className="flex-1 bg-transparent border-0 text-xs text-foreground focus:outline-none focus:ring-0 truncate"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/${artist.slug}`);
                    alert("Link do perfil copiado para a área de transferência!");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/95 transition-colors shrink-0"
                >
                  Copiar
                </button>
              </div>
            </div>

            {/* QR Code block */}
            <div className="bg-background border border-border/60 rounded-2xl p-4.5 flex flex-col items-center justify-center space-y-4">
              <div className="p-3 bg-white rounded-xl shadow-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${window.location.origin}/${artist.slug}`)}`}
                  alt="QR Code do Perfil"
                  className="w-44 h-44 object-contain"
                />
              </div>
              
              <button
                type="button"
                onClick={async () => {
                  try {
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(`${window.location.origin}/${artist.slug}`)}`;
                    const response = await fetch(qrUrl);
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `qrcode-${artist.slug}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  } catch (err) {
                    alert("Erro ao baixar o QR Code. Tente salvar a imagem manualmente.");
                  }
                }}
                className="w-full py-2.5 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/95 transition-colors text-xs flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                Baixar Imagem do QR Code
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowShareModal(false)}
              className="w-full py-2.5 rounded-xl font-bold bg-zinc-800 text-foreground hover:bg-zinc-700 transition-colors text-xs"
            >
              Fechar Janela
            </button>
          </div>
        </div>
      )}
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

// ─── Gallery Tab ─────────────────────────────────────────────────────────────

function GalleryTab({ artistId }: { artistId: string }) {
  const [gallery, setGallery] = useState<any | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [newPhotoLegenda, setNewPhotoLegenda] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const loadGallery = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/galleries/${artistId}`);
      const data = await res.json();
      if (data.id) {
        setGallery(data);
        setPhotos(data.photos || []);
      }
    } catch (err) {
      console.error("Error loading gallery:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGallery();
  }, [artistId]);

  const handleCreateGallery = async () => {
    try {
      const res = await fetch("/api/galleries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ artistaId: artistId, titulo: "Galeria de Fotos" }),
      });
      if (res.ok) {
        loadGallery();
      }
    } catch (err) {
      console.error("Error creating gallery:", err);
    }
  };

  const handleAddPhoto = async () => {
    if (!gallery) return;
    if (!newPhotoUrl && !photoFile) return;
    setSaving(true);
    try {
      if (photoFile) {
        const formData = new FormData();
        formData.append("foto", photoFile);
        formData.append("legenda", newPhotoLegenda);
        const res = await fetch(`/api/galleries/${gallery.id}/photos/upload`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        if (res.ok) {
          setNewPhotoUrl("");
          setNewPhotoLegenda("");
          setPhotoFile(null);
          setPhotoPreview("");
          setShowAdd(false);
          loadGallery();
        }
      } else {
        const res = await fetch(`/api/galleries/${gallery.id}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ fotoUrl: newPhotoUrl, legenda: newPhotoLegenda }),
        });
        if (res.ok) {
          setNewPhotoUrl("");
          setNewPhotoLegenda("");
          setShowAdd(false);
          loadGallery();
        }
      }
    } catch (err) {
      console.error("Error adding photo:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePhoto = async (photoId: number) => {
    if (!gallery || !confirm("Remover esta foto?")) return;
    try {
      const res = await fetch(`/api/galleries/${gallery.id}/photos/${photoId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        loadGallery();
      }
    } catch (err) {
      console.error("Error removing photo:", err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setNewPhotoUrl("");
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
        <div className="flex items-center gap-2">
          <Image className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Galeria de Fotos</h3>
        </div>
        {gallery && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Adicionar Foto
          </button>
        )}
      </div>

      {/* Dicas Inteligentes para Galeria (Exibidas quando tem menos de 4 fotos) */}
      {(!gallery || photos.length < 4) && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-amber-500/10 to-primary/10 border border-primary/30 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <div>
              <h4 className="font-extrabold text-foreground text-sm">Dicas Inteligentes para Fortalecer seu Perfil</h4>
              <p className="text-xs text-muted-foreground">Momentos reais da sua carreira aumentam sua credibilidade com contratantes.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { icon: "🎙️", title: "Estúdio", desc: "Gravou uma música em estúdio? Compartilhe esse momento." },
              { icon: "🎸", title: "Palco & Shows", desc: "Fez uma apresentação? Mostre fotos do palco." },
              { icon: "🎪", title: "Eventos", desc: "Participou de um evento? Compartilhe esse registro." },
              { icon: "🎬", title: "Videoclipe", desc: "Gravou um videoclipe? Publique os bastidores." },
              { icon: "🤝", title: "Conexões", desc: "Encontrou outros artistas ou produtores? Compartilhe essas conexões." },
              { icon: "⭐", title: "Prova Social", desc: "Registros reais reforçam sua reputação profissional." },
            ].map((tip, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-card/80 border border-border/40 space-y-1.5 flex flex-col justify-between hover:border-primary/40 transition-colors">
                <div>
                  <span className="text-lg">{tip.icon}</span>
                  <h5 className="font-bold text-xs text-foreground mt-1">{tip.title}</h5>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{tip.desc}</p>
                </div>
                <button
                  onClick={() => setShowAdd(true)}
                  className="mt-2 text-[11px] font-bold text-primary hover:underline flex items-center gap-1 self-start"
                >
                  <Plus className="w-3 h-3" /> Postar foto
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!gallery ? (
        <div className="text-center py-12 bg-card border border-dashed border-border/40 rounded-xl">
          <Image className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Você ainda não tem uma galeria de fotos.</p>
          <button
            onClick={handleCreateGallery}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90"
          >
            Criar Galeria
          </button>
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-12 bg-card border border-dashed border-border/40 rounded-xl">
          <Image className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Nenhuma foto na galeria ainda.</p>
          <button
            onClick={() => setShowAdd(true)}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90"
          >
            Adicionar Primeira Foto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden bg-muted">
              <img
                src={photo.fotoUrl}
                alt={photo.legenda || ""}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => handleRemovePhoto(photo.id)}
                  className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              {photo.legenda && (
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white text-xs truncate">{photo.legenda}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border/40 rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground">Adicionar Foto</h3>
              <button onClick={() => { setShowAdd(false); setPhotoFile(null); setPhotoPreview(""); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {photoPreview && (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-contain" />
              </div>
            )}

            <div>
              <label className="block text-sm text-muted-foreground mb-1">Upload de imagem</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:bg-primary/10 file:text-primary file:border-0 file:cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">ou</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-1">URL da imagem</label>
              <input
                value={newPhotoUrl}
                onChange={(e) => { setNewPhotoUrl(e.target.value); setPhotoFile(null); setPhotoPreview(""); }}
                disabled={!!photoFile}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground disabled:opacity-50"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-1">Legenda (opcional)</label>
              <input
                value={newPhotoLegenda}
                onChange={(e) => setNewPhotoLegenda(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                placeholder="Descrição da foto"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowAdd(false); setPhotoFile(null); setPhotoPreview(""); }} className="px-4 py-2 rounded-lg text-muted-foreground">Cancelar</button>
              <button
                onClick={handleAddPhoto}
                disabled={saving || (!newPhotoUrl && !photoFile)}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {instagramShareModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-card border border-border/60 rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-5 shadow-2xl relative">
            <button
              onClick={() => setInstagramShareModal(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-yellow-500 flex items-center justify-center mx-auto shadow-lg">
                <Instagram className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-black text-foreground">
                Música Cadastrada! 🎉
              </h3>
              <p className="text-xs text-muted-foreground">
                "{instagramShareModal.songTitle}" já está disponível no seu portal. Compartilhe no Instagram para divulgar agora!
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-background/80 border border-border/50 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary block">
                Legenda Pronta para Instagram:
              </span>
              <p className="text-xs text-foreground/90 font-mono leading-relaxed bg-input/40 p-3 rounded-xl border border-border/40 select-all">
                {`Ouça minha nova música "${instagramShareModal.songTitle}" no Portal do Artista! 🎵\n\nLink no meu perfil: ${window.location.origin}/${artist?.slug}`}
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => {
                  const text = `Ouça minha nova música "${instagramShareModal.songTitle}" no Portal do Artista! 🎵\n\nLink no meu perfil: ${window.location.origin}/${artist?.slug}`;
                  navigator.clipboard.writeText(text);
                  setCopiedCaption(true);
                  setTimeout(() => setCopiedCaption(false), 2500);
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-md cursor-pointer"
              >
                {copiedCaption ? (
                  <>
                    <CheckCircle className="w-4.5 h-4.5" />
                    Texto e Link Copiados!
                  </>
                ) : (
                  <>
                    <Instagram className="w-4.5 h-4.5" />
                    Copiar Legenda e Link da Música
                  </>
                )}
              </button>

              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl border border-border bg-card text-foreground font-bold text-xs flex items-center justify-center gap-2 hover:bg-input transition-colors block text-center"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir Aplicativo do Instagram
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
