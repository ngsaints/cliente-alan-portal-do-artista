import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { MusicCard } from "@/components/MusicCard";
import { AudioPlayer } from "@/components/AudioPlayer";
import { useListSongs } from "@workspace/api-client-react";
import { Music, MapPin, Instagram, Disc3, Zap, CheckCircle, Phone, Mail, Globe } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";
import { PlansModal } from "@/components/PlansModal";
import { NotificationBell, type Interest } from "@/components/NotificationBell";
import { InterestModal } from "@/components/InterestModal";
import { useGenres } from "@/hooks/useGenres";
import { useSEO } from "@/hooks/useSEO";

const DEMO_ARTIST = {
  id: 1,
  name: "Alan Ribeiro",
  profissao: "Cantor e Compositor",
  cidade: "Maricá, RJ",
  contato: "(21) 99999-9999",
  email: "contato@alanribeiro.com",
  instagram: "alanribeiro",
  tiktok: "alanribeiro",
  spotify: "https://open.spotify.com/artist/alanribeiro",
  capaUrl: "",
  bannerUrl: "",
  cor: "#f5d76e",
};

export default function Demo() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { playSong } = usePlayer();
  const artistId = id || "1";
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const { genres } = useGenres();
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [interestModalOpen, setInterestModalOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<{ id: number; titulo: string } | null>(null);
  const [demoSettings, setDemoSettings] = useState<Record<string, string>>({});
  const [artistLoggedIn, setArtistLoggedIn] = useState(false);
  const [loggedInArtistId, setLoggedInArtistId] = useState<number | null>(null);
  const [banners, setBanners] = useState<any[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  useEffect(() => {
    fetch("/api/banners")
      .then((r) => r.json())
      .then((data) => setBanners(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = banners[currentBannerIndex]?.intervaloSegundos || 4;
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, interval * 1000);
    return () => clearInterval(timer);
  }, [banners, currentBannerIndex]);

  useSEO({
    title: "Demonstração - Portal do Artista",
    description: "Veja como funciona o perfil de artista no Portal do Artista. Descubra todos os recursos disponíveis para sua carreira musical.",
    ogUrl: "https://portaldoartista.com/demo",
    canonical: "https://portaldoartista.com/demo",
  });

  useEffect(() => {
    fetch("/api/demo-settings")
      .then(r => r.json())
      .then(data => setDemoSettings(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/artists/status", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data.authenticated) {
          setArtistLoggedIn(true);
          setLoggedInArtistId(data.artist?.id || null);
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectPlan = async (planId: string, couponCode?: string) => {
    setPlansModalOpen(false);
    if (planId === "free") {
      if (artistLoggedIn && loggedInArtistId) {
        const res = await fetch("/api/payments/cancel-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ artistId: loggedInArtistId }),
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) {
          alert("Você foi movido para o plano gratuito.");
        } else {
          alert(data.error || "Erro ao mudar para plano gratuito");
        }
      } else {
        setLocation("/cadastro?plano=free");
      }
      return;
    }
    if (artistLoggedIn && loggedInArtistId) {
      const res = await fetch("/api/payments/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, artistId: loggedInArtistId, couponCode }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.activatedDirectly) {
        alert("Plano ativado com sucesso!");
      } else if (data.invoiceUrl) {
        window.open(data.invoiceUrl, "_blank");
      } else if (data.error) {
        alert(data.error);
      }
    } else {
      setLocation(`/cadastro?plano=${planId}`);
    }
  };

  const artist = {
    ...DEMO_ARTIST,
    ...(demoSettings.demo_name ? { name: demoSettings.demo_name } : {}),
    ...(demoSettings.demo_profissao ? { profissao: demoSettings.demo_profissao } : {}),
    ...(demoSettings.demo_cidade ? { cidade: demoSettings.demo_cidade } : {}),
    ...(demoSettings.demo_contato ? { contato: demoSettings.demo_contato } : {}),
    ...(demoSettings.demo_email ? { email: demoSettings.demo_email } : {}),
    ...(demoSettings.demo_instagram ? { instagram: demoSettings.demo_instagram } : {}),
    ...(demoSettings.demo_tiktok ? { tiktok: demoSettings.demo_tiktok } : {}),
    ...(demoSettings.demo_spotify ? { spotify: demoSettings.demo_spotify } : {}),
    ...(demoSettings.demo_cor ? { cor: demoSettings.demo_cor } : {}),
    ...(demoSettings.demo_banner_url ? { bannerUrl: demoSettings.demo_banner_url } : {}),
    ...(demoSettings.demo_capa_url ? { capaUrl: demoSettings.demo_capa_url } : {}),
  };

  const currentBanner = banners[currentBannerIndex] || null;

  const [interests, setInterests] = useState<Interest[]>([
    {
      id: 1,
      songTitle: "Demo Song",
      nome: "João Silva",
      email: "joao@email.com",
      telefone: "(21) 98888-8888",
      mensagem: "Gostei muito da música!",
      contratarShow: false,
      reservarMusica: true,
      agendarReuniao: false,
      createdAt: new Date().toISOString(),
    },
  ]);

  const { data: songs, isLoading } = useListSongs({
    genre: selectedGenre || undefined,
  });

  const artistSongs = (songs || []).filter((s) => !s.isVip && !(s as any).isPrivate);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInterest = (song: { id: number; titulo: string }) => {
    setSelectedSong(song);
    setInterestModalOpen(true);
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const song = (e as CustomEvent).detail.song;
      handleOpenInterest({ id: song.id, titulo: song.titulo });
    };
    document.addEventListener("openInterest", handler);
    return () => document.removeEventListener("openInterest", handler);
  }, []);

  const handleInterestSubmit = (data: {
    nome: string; email: string; telefone: string; mensagem: string;
    contratarShow: boolean; reservarMusica: boolean; agendarReuniao: boolean;
  }) => {
    const newInterest: Interest = {
      id: Date.now(),
      songTitle: selectedSong?.titulo || undefined,
      ...data,
      createdAt: new Date().toISOString(),
    };
    setInterests((prev) => [newInterest, ...prev]);
    setInterestModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/80 pb-32">
      <Navbar />

      {/* Notification Bell */}
      <NotificationBell
        interests={interests}
        onDelete={(id) => setInterests((prev) => prev.filter((i) => i.id !== id))}
      />

      {/* Top Action Buttons */}
      <div className="pt-20 px-4">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-2 mb-6">
          <button
            onClick={() => setPlansModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg"
          >
            <Zap className="w-4 h-4" />
            Planos
          </button>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-card text-muted-foreground border border-border hover:border-primary/50 hover:text-foreground transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-400" />
                Link copiado!
              </>
            ) : (
              <>
                <Disc3 className="w-4 h-4" />
                Compartilhar Perfil
              </>
            )}
          </button>
        </div>
      </div>

      {/* Artist Profile with Banner (Carousel or Static Fallback) */}
      <section className="relative h-[320px] md:h-[400px] overflow-hidden">
        {banners.length > 0 ? (
          <div className="absolute inset-0">
            {banners.map((b, idx) => (
              <div
                key={b.id}
                className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
                  idx === currentBannerIndex ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
                style={{
                  backgroundImage: b.imagemFundoUrl ? `url("${b.imagemFundoUrl}")` : "none",
                  backgroundColor: b.corFundo || "#1a1a2e",
                }}
              />
            ))}
          </div>
        ) : (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: artist.bannerUrl ? `url("${artist.bannerUrl}")` : "none",
              backgroundColor: artist.cor || "#1a1a2e",
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

        {/* Demo Badge */}
        <div className="absolute top-4 left-4 z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 shadow-lg">
            <Zap className="w-3 h-3" />
            Demonstração
          </span>
        </div>

        {/* Banner Text in the center/top */}
        {currentBanner && currentBanner.texto && (
          <div className="absolute inset-x-0 top-12 bottom-20 flex items-center justify-center p-4 pointer-events-none z-10">
            <h2
              className="text-xl md:text-3xl font-extrabold text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] max-w-2xl px-6"
              style={{ color: currentBanner.corTexto || "#ffffff" }}
            >
              {currentBanner.texto}
            </h2>
          </div>
        )}

        {/* Artist info overlay */}
        <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 z-20">
          {/* Left: Artist Info without profile picture */}
          <div className="space-y-1">
            <h1 className="text-3xl md:text-5xl font-extrabold text-foreground mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
              {artist.name}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground font-medium mb-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
              {artist.profissao}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-muted-foreground">
              {artist.cidade && (
                <span className="flex items-center gap-1 bg-black/45 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-white font-medium">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  {artist.cidade}
                </span>
              )}
              {artist.instagram && (
                <a
                  href={`https://instagram.com/${artist.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 bg-black/45 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-white font-medium hover:text-primary transition-colors"
                >
                  <Instagram className="w-3.5 h-3.5 text-pink-400" />
                  @{artist.instagram}
                </a>
              )}
              {artist.spotify && (
                <a
                  href={artist.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 bg-black/45 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-white font-medium hover:text-primary transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-green-400" />
                  Spotify
                </a>
              )}
            </div>
          </div>

          {/* Right: Banner CTA button */}
          {currentBanner && currentBanner.botaoTexto && currentBanner.botaoLink && (
            <div className="mt-2 md:mt-0">
              <a
                href={currentBanner.botaoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all shadow-lg hover:scale-105"
              >
                <span>{currentBanner.botaoTexto}</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Contact Cards */}
      <section className="px-4 sm:px-6 lg:px-8 mb-8">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {artist.contato && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-card/50 border border-border/40">
                <Phone className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Telefone / WhatsApp</p>
                  <p className="text-sm text-foreground break-all">{artist.contato}</p>
                </div>
              </div>
            )}
            {artist.email && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-card/50 border border-border/40">
                <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm text-foreground break-all">{artist.email}</p>
                </div>
              </div>
            )}
            {artist.instagram && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-card/50 border border-border/40">
                <Instagram className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Instagram</p>
                  <a
                    href={`https://instagram.com/${artist.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-pink-500 hover:underline break-all"
                  >
                    @{artist.instagram}
                  </a>
                </div>
              </div>
            )}
            {artist.tiktok && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-card/50 border border-border/40">
                <Globe className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">TikTok</p>
                  <a
                    href={`https://tiktok.com/@${artist.tiktok}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white hover:underline break-all"
                  >
                    @{artist.tiktok}
                  </a>
                </div>
              </div>
            )}
            {artist.spotify && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-card/50 border border-border/40">
                <Globe className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Spotify</p>
                  <a
                    href={artist.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-500 hover:underline break-all"
                  >
                    Spotify
                  </a>
                </div>
              </div>
            )}
            {artist.cidade && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-card/50 border border-border/40">
                <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Cidade</p>
                  <p className="text-sm text-foreground">{artist.cidade}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Songs */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        {/* Genre Filters */}
        <section className="mb-8">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(selectedGenre === genre ? null : genre)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedGenre === genre
                    ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(245,197,24,0.3)]"
                    : "bg-card text-muted-foreground border border-border hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </section>

        <div className="flex items-center gap-2 mb-8">
          <Disc3 className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">
            Músicas ({artistSongs.length})
          </h2>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card rounded-2xl overflow-hidden border border-border animate-pulse">
                <div className="w-full aspect-square bg-muted/30" />
                <div className="p-5 space-y-4">
                  <div className="h-6 bg-muted/30 rounded w-3/4" />
                  <div className="h-4 bg-muted/30 rounded w-full" />
                  <div className="h-10 bg-muted/30 rounded-xl w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && artistSongs.length === 0 && (
          <div className="text-center py-20 bg-card/50 rounded-3xl border border-dashed border-border">
            <Music className="w-16 h-16 text-muted-foreground mb-4 opacity-50 mx-auto" />
            <h3 className="text-2xl font-bold text-foreground mb-2">Nenhuma música ainda</h3>
            <p className="text-muted-foreground">As músicas deste artista aparecerão aqui em breve.</p>
          </div>
        )}

        {!isLoading && artistSongs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {artistSongs.map((song, index) => (
              <MusicCard key={song.id} song={song} index={index} />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <InterestModal
        isOpen={interestModalOpen}
        onClose={() => { setInterestModalOpen(false); setSelectedSong(null); }}
        onSubmit={handleInterestSubmit}
        songId={selectedSong?.id ?? 0}
        songTitle={selectedSong?.titulo}
      />

      <PlansModal
        isOpen={plansModalOpen}
        onClose={() => setPlansModalOpen(false)}
        onSelectPlan={(planId) => handleSelectPlan(planId)}
      />

      <AudioPlayer />
    </div>
  );
}