import { Link } from "wouter";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useListSongs } from "@workspace/api-client-react";
import { Navbar } from "@/components/Navbar";
import { MusicCard } from "@/components/MusicCard";
import { AudioPlayer } from "@/components/AudioPlayer";
import { NotificationBell, type Interest } from "@/components/NotificationBell";
import { InterestModal } from "@/components/InterestModal";
import { Disc3, TrendingUp, Star, Sparkles, Search } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";
import { useGenres } from "@/hooks/useGenres";

export default function Home() {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const { genres } = useGenres();
  const [interestModalOpen, setInterestModalOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<{ id: number; titulo: string; artistaId?: number | null } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const { playSong } = usePlayer();

  const { data: songs, isLoading, error } = useListSongs({
    genre: selectedGenre || undefined,
  });

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setSearching(true);
        try {
          const res = await fetch(`/api/artists/public?search=${encodeURIComponent(searchQuery)}`);
          const data = await res.json();
          setSearchResults(data);
        } catch (e) {
          console.error("Search error:", e);
        } finally {
          setSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [interests, setInterests] = useState<Interest[]>([]);

  const filteredSongs = (songs || []).filter((s) => !(s as any).isVip);
  const highlights = filteredSongs.filter((s) => (s as any).destaque).slice(0, 5);
  const trends = filteredSongs.slice(-3).reverse();
  const allSongs = filteredSongs;

  const handleOpenInterest = (song: { id: number; titulo: string; artistaId?: number | null }) => {
    setSelectedSong(song);
    setInterestModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/80 pb-32">
      <Navbar />

      <NotificationBell
        interests={interests}
        onMarkRead={() => {}}
        onDelete={(id) => setInterests((prev) => prev.filter((i) => i.id !== id))}
      />

      <section className="pt-24 pb-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-primary/5 via-primary/3 to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Portal do Artista
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold text-foreground mb-4">
              Descubra{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-200">
                Músicas
              </span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore o catálogo de artistas independentes
            </p>

            <div className="max-w-md mx-auto mt-8 relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar artistas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-full bg-card/80 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl overflow-hidden shadow-xl z-50">
                  {searchResults.map((artist) => (
                    <Link
                      key={artist.id}
                      href={`/a/${artist.slug}`}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                      onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                    >
                      <img
                        src={artist.capaUrl || `${import.meta.env.BASE_URL}images/default-cover.png`}
                        alt={artist.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="text-left">
                        <p className="font-bold text-foreground">{artist.name}</p>
                        <p className="text-xs text-muted-foreground">{artist.cidade} • {artist.genero}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {searching && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl p-4 text-center text-muted-foreground z-50">
                  Buscando...
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-4 mt-6">
              <Link
                href="/vip"
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-yellow-500 text-black hover:bg-yellow-400 transition-colors"
              >
                <Star className="w-4 h-4" />
                Área VIP
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 mb-8">
        <div className="max-w-3xl mx-auto">
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
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {highlights.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Destaques</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {highlights.map((song, index) => (
                <motion.div
                  key={`highlight-${song.id}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative flex flex-col bg-card/80 border border-border/40 rounded-xl overflow-hidden hover:border-primary/50 transition-all cursor-pointer"
                  onClick={() => playSong(song)}
                >
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={song.capaUrl || `${import.meta.env.BASE_URL}images/default-cover.png`}
                      alt={song.titulo}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                        <Disc3 className="w-6 h-6 text-primary-foreground" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-bold text-foreground line-clamp-1">{song.titulo}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{song.genero}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {trends.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Star className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Novas Músicas</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {trends.map((song, index) => (
                <div key={`trend-${song.id}`} className="relative">
                  <MusicCard song={song} index={index} />
                  <button
                    onClick={() => handleOpenInterest({ id: song.id, titulo: song.titulo, artistaId: (song as any).artistaId })}
                    className="absolute bottom-3 right-3 z-10 px-3 py-1.5 rounded-lg bg-primary/90 text-primary-foreground text-xs font-bold hover:bg-primary transition-colors shadow-lg"
                  >
                    Tenho Interesse
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center gap-2 mb-6">
            <Disc3 className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">
              {allSongs.length > 0 ? `Todas as Músicas (${allSongs.length})` : "Nenhuma música encontrada"}
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

          {error && (
            <div className="text-center py-20 bg-card rounded-2xl border border-destructive/20 text-destructive">
              <p className="text-lg">Erro ao carregar músicas. Tente novamente mais tarde.</p>
            </div>
          )}

          {!isLoading && !error && allSongs.length === 0 && (
            <div className="text-center py-20 bg-card/50 rounded-3xl border border-dashed border-border">
              <Disc3 className="w-16 h-16 text-muted-foreground mb-4 opacity-50 mx-auto" />
              <h3 className="text-2xl font-bold text-foreground mb-2">Nenhuma música encontrada</h3>
              <p className="text-muted-foreground">Não há faixas disponíveis para a seleção atual.</p>
            </div>
          )}

          {!isLoading && !error && allSongs.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {allSongs.map((song, index) => (
                <div key={`all-${song.id}`} className="relative">
                  <MusicCard song={song} index={index} />
                  <button
                    onClick={() => handleOpenInterest({ id: song.id, titulo: song.titulo, artistaId: (song as any).artistaId })}
                    className="absolute bottom-3 right-3 z-10 px-3 py-1.5 rounded-lg bg-primary/90 text-primary-foreground text-xs font-bold hover:bg-primary transition-colors shadow-lg"
                  >
                    Tenho Interesse
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <InterestModal
        isOpen={interestModalOpen}
        onClose={() => { setInterestModalOpen(false); setSelectedSong(null); }}
        songId={selectedSong?.id ?? 0}
        artistaId={selectedSong?.artistaId}
        songTitle={selectedSong?.titulo}
      />

      <AudioPlayer />
    </div>
  );
}
