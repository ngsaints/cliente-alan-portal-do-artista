import { useParams } from "wouter";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { MusicCard } from "@/components/MusicCard";
import { AudioPlayer } from "@/components/AudioPlayer";
import { useListSongs } from "@workspace/api-client-react";
import { Music, MapPin, Instagram, Mic2, ExternalLink, Disc3, Zap, CheckCircle, Phone, Mail, Globe, Star, ListMusic, Play, Image } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";
import { useGenres } from "@/hooks/useGenres";
import { PlansModal } from "@/components/PlansModal";
import { NotificationBell, type Interest } from "@/components/NotificationBell";
import { InterestModal } from "@/components/InterestModal";
import { useSEO } from "@/hooks/useSEO";



// Legacy fallback data (used only if API fails)
const FALLBACK_ARTIST = {
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
  cor: "#f5c518",
};

export default function ArtistProfile() {
  const { slug } = useParams();
  const { playSong, setPlayerColors, setPlayerStyle, setCardStyle } = usePlayer();
  const artistId = slug || "1";
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const { genres } = useGenres();
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [interestModalOpen, setInterestModalOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<{ id: number; titulo: string } | null>(null);
  const [artistData, setArtistData] = useState<any>(null);
  const [loadingArtist, setLoadingArtist] = useState(true);
  const numericArtistId = artistData?.id;

  // Update player colors, style and card style when artist data loads
  useEffect(() => {
    if (artistData) {
      setPlayerColors(artistData.playerGradient || null, artistData.playerCor || null);
      if (artistData.player) {
        setPlayerStyle(artistData.player);
      }
      setCardStyle((artistData.cardStyle as any) || "default");
    }
    return () => {
      setPlayerColors(null, null);
      setCardStyle("default");
    };
  }, [artistData, setPlayerColors, setPlayerStyle, setCardStyle]);

  // Load custom font when artist has one
  useEffect(() => {
    if (artistData?.fonte && artistData.fonte !== "Arial") {
      const fontName = artistData.fonte.replace(/\s+/g, "+");
      const linkId = "custom-artist-font";
      if (!document.getElementById(linkId)) {
        const link = document.createElement("link");
        link.id = linkId;
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;500;600;700;800&display=swap`;
        document.head.appendChild(link);
      }
    }
  }, [artistData?.fonte]);

  // Fetch artist data from API (supports ID or slug)
  useEffect(() => {
    fetch(`/api/artists/${artistId}`)
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setArtistData(data);
        }
        setLoadingArtist(false);
      })
      .catch(() => setLoadingArtist(false));
  }, [artistId]);

  const [interests, setInterests] = useState<any[]>([]);

  useSEO({
    title: `${artistData?.name || 'Artista'} - Portal do Artista`,
    description: artistData?.profissao ? `${artistData.name} - ${artistData.profissao}. ${artistData.cidade ? 'De ' + artistData.cidade + '.' : ''} Ouça suas músicas no Portal do Artista.` : "Perfil de artista no Portal do Artista",
    ogImage: artistData?.capaUrl || undefined,
    ogUrl: `https://portaldoartista.com/${artistData?.slug || artistId}`,
    canonical: `https://portaldoartista.com/${artistData?.slug || artistId}`,
  });

  const { data: songs, isLoading } = useListSongs({
    genre: selectedGenre || undefined,
  });

  const artistSongs = (songs || []).filter((s) => !s.isVip && !(s as any).isPrivate && (s as any).artistaId == numericArtistId);

  // Playlists
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);

  useEffect(() => {
    if (numericArtistId) {
      setLoadingPlaylists(true);
      fetch(`/api/playlists/public/${numericArtistId}`)
        .then(r => r.json())
        .then(data => {
          setPlaylists(Array.isArray(data) ? data : []);
        })
        .catch(() => setPlaylists([]))
        .finally(() => setLoadingPlaylists(false));
    }
  }, [numericArtistId]);

  // Gallery
  const [gallery, setGallery] = useState<any | null>(null);

  useEffect(() => {
    if (numericArtistId) {
      fetch(`/api/galleries/${numericArtistId}?limit=6`)
        .then(r => r.json())
        .then(data => {
          if (data.photos && data.photos.length > 0) {
            setGallery(data);
          }
        })
        .catch(() => {});
    }
  }, [numericArtistId]);

  const handlePlayPlaylist = (playlistSongs: any[], clickedPlaylistIdx?: number) => {
    if (playlistSongs.length > 0) {
      // Pass all playlists for auto-play feature
      const allPlaylists = playlists.map((p, idx) => ({
        id: p.id,
        nome: p.nome,
        songs: p.songs,
      }));
      playSong(playlistSongs[0], playlistSongs, allPlaylists, clickedPlaylistIdx);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getBackgroundStyle = (layout: string | undefined): string => {
    if (!layout || layout === "padrao") {
      return "hsl(var(--background))";
    }
    const backgrounds: Record<string, string> = {
      "gradiente-azul": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      "gradiente-verde": "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
      "gradiente-roxo": "linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)",
      "gradiente-sol": "linear-gradient(135deg, #f5af19 0%, #f12711 100%)",
      "gradiente-oceano": "linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)",
      "gradiente-rosa": "linear-gradient(135deg, #ff6a88 0%, #ff9a9e 100%)",
      "gradiente-aurora": "linear-gradient(135deg, #00c6ff 0%, #0072ff 50%, #00c6ff 100%)",
      "gradiente-tropical": "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)",
      "gradiente-pink": "linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)",
      "escuro": "#1a1a2e",
      "escuro-azul": "#0f0f23",
      "preto": "#000000",
      "branco": "#ffffff",
      "bege": "#f5f0e1",
      "cinza-claro": "#e5e5e5",
      "azul-escuro": "#1e3a5f",
      "verde-escuro": "#1a4d1a",
      "roxo-escuro": "#2d1b4e",
      "verde-azul": "#1a4d4d",
      "lilas": "#4a1a6b",
      "cinza-escuro": "#2d2d2d",
      "azul-azul": "#1a3a5f",
      "vermelho-escuro": "#5f1a1a",
      "dourado": "#5f4a1a",
      "turquesa": "#1a5f5f",
    };
    return backgrounds[layout] || "hsl(var(--background))";
  };

  // Show loading or fallback if artist not found
  if (loadingArtist) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Use API data or fallback to default
  const artist = artistData || FALLBACK_ARTIST;

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

  return (
    <div 
      className="min-h-screen pb-32"
      style={{ 
        fontFamily: artistData?.fonte || "inherit",
        background: getBackgroundStyle(artistData?.layout)
      }}
    >
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
                <ExternalLink className="w-4 h-4" />
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
            <h1 
              className="text-3xl md:text-5xl font-extrabold text-foreground mb-2"
              style={{ fontFamily: artistData?.fonte ? `"${artistData.fonte}", var(--font-display)` : "var(--font-display)" }}
            >
              {artist.name}
            </h1>
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

      {/* Contact Cards - like the reference layout */}
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

            {/* VIP Button */}
            <Link
              href={`/artista/${artistData?.id ?? slug}/vip`}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors"
            >
              <Star className="w-5 h-5 text-yellow-500 flex-shrink-0" />
              <div className="text-left">
                <p className="text-xs text-yellow-500 font-bold">Área VIP</p>
                <p className="text-xs text-muted-foreground">Conteúdo exclusivo</p>
              </div>
            </Link>
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
              <MusicCard
                key={song.id}
                song={song}
                index={index}
                cardStyle={(artistData?.cardStyle as any) || "default"}
              />
            ))}
          </div>
        )}

        {/* Playlists */}
        {playlists.length > 0 && (
          <section className="mt-16">
            <div className="flex items-center gap-2 mb-6">
              <ListMusic className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">
                Playlists ({playlists.length})
              </h2>
            </div>

            <div className="space-y-6">
              {playlists.map((playlist, playlistIdx) => (
                <div
                  key={playlist.id}
                  className="bg-card border border-border/40 rounded-xl overflow-hidden"
                >
                  <div className="p-4 border-b border-border/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <ListMusic className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground">{playlist.nome}</h3>
                          <p className="text-xs text-muted-foreground">
                            {playlist.songs?.length || 0} músicas
                            {playlist.descricao && ` • ${playlist.descricao}`}
                          </p>
                        </div>
                      </div>
                      {playlist.songs?.length > 0 && (
                        <button
                          onClick={() => handlePlayPlaylist(playlist.songs, playlistIdx)}
                          className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
                        >
                          <Play className="w-4 h-4" />
                          Tocar
                        </button>
                      )}
                    </div>
                  </div>

                  {playlist.songs?.length > 0 && (
                    <div className="max-h-80 overflow-y-auto">
                      {playlist.songs.map((song: any, index: number) => (
                        <button
                          key={song.id}
                          onClick={() => playSong(song, playlist.songs)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                        >
                          <span className="text-sm text-muted-foreground w-6">{index + 1}</span>
                          <img
                            src={song.capaUrl || "/images/default-cover.png"}
                            alt={song.titulo}
                            className="w-12 h-12 rounded object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{song.titulo}</p>
                            <p className="text-xs text-muted-foreground truncate">{song.genero}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {song.plays || 0} plays
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {(!playlist.songs || playlist.songs.length === 0) && (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      Nenhuma música nesta playlist
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Gallery */}
        {gallery && gallery.photos && gallery.photos.length > 0 && (
          <section className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Image className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Galeria</h2>
              </div>
              <Link
                href={`/${slug}/galeria`}
                className="px-4 py-2 rounded-lg bg-card border border-border/40 text-foreground text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                Ver mais
              </Link>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {gallery.photos.slice(0, 6).map((photo: any) => (
                <Link
                  key={photo.id}
                  href={`/${slug}/galeria`}
                  className="aspect-square rounded-xl overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all"
                >
                  <img
                    src={photo.fotoUrl}
                    alt={photo.legenda || ""}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Modals */}
      <InterestModal
        isOpen={interestModalOpen}
        onClose={() => { setInterestModalOpen(false); setSelectedSong(null); }}
        songId={selectedSong?.id ?? 0}
        artistaId={artistData?.id}
        songTitle={selectedSong?.titulo}
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
