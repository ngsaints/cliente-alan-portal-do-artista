import { useParams } from "wouter";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { MusicCard } from "@/components/MusicCard";
import { AudioPlayer } from "@/components/AudioPlayer";
import { useListSongs } from "@workspace/api-client-react";
import { Music, MapPin, Instagram, Mic2, Disc3, Zap, CheckCircle, Phone, Mail, Globe } from "lucide-react";
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
  const { playSong } = usePlayer();
  const artistId = id || "1";
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const { genres } = useGenres();
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [interestModalOpen, setInterestModalOpen] = useState(false);
  const [selectedSongTitle, setSelectedSongTitle] = useState<string>("");
  const [demoSettings, setDemoSettings] = useState<Record<string, string>>({});

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

  const artistSongs = (songs || []).filter((s) => !s.isVip && !s.isPrivate);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInterest = (songTitle: string) => {
    setSelectedSongTitle(songTitle);
    setInterestModalOpen(true);
  };

  const handleInterestSubmit = (data: {
    nome: string; email: string; telefone: string; mensagem: string;
    contratarShow: boolean; reservarMusica: boolean; agendarReuniao: boolean;
  }) => {
    const newInterest: Interest = {
      id: Date.now(),
      songTitle: selectedSongTitle || undefined,
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

      {/* Artist Profile with Banner */}
      <section className="relative h-[300px] md:h-[400px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: artist.bannerUrl
              ? `url("${artist.bannerUrl}")`
              : "none",
            backgroundColor: artist.cor || "#1a1a2e",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

        {/* Demo Badge */}
        <div className="absolute top-4 left-4 z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/20">
            <Zap className="w-3 h-3" />
            Demonstração
          </span>
        </div>

        {/* Artist info overlay */}
        <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 flex items-end gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-background shadow-2xl flex-shrink-0 bg-primary/20 flex items-center justify-center"
          >
            {artist.capaUrl ? (
              <img src={artist.capaUrl} alt={artist.name} className="w-full h-full object-cover" />
            ) : (
              <Music className="w-16 h-16 text-primary" />
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-3xl md:text-5xl font-extrabold text-foreground mb-2">{artist.name}</h1>
            <p className="text-lg text-muted-foreground mb-2">{artist.profissao}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {artist.cidade}
              </span>
              {artist.instagram && (
                <a
                  href={`https://instagram.com/${artist.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                  @{artist.instagram}
                </a>
              )}
              {artist.spotify && (
                <a
                  href={artist.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <Mic2 className="w-4 h-4" />
                  Spotify
                </a>
              )}
            </div>
          </motion.div>
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
        onClose={() => setInterestModalOpen(false)}
        onSubmit={handleInterestSubmit}
        songTitle={selectedSongTitle}
      />

      <PlansModal
        isOpen={plansModalOpen}
        onClose={() => setPlansModalOpen(false)}
        onSelectPlan={(planId) => {
          alert(`Plano selecionado: ${planId}. Integração com pagamento em breve!`);
          setPlansModalOpen(false);
        }}
      />

      <AudioPlayer />
    </div>
  );
}