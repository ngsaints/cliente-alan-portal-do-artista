import React, { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { usePlayer } from "@/contexts/PlayerContext";
import { formatImageUrl } from "@/lib/utils";
import {
  Play,
  Pause,
  Music,
  Search,
  Sparkles,
  Smartphone,
  Headphones,
  Download,
  Share2,
  Heart,
  TrendingUp,
  Radio,
  ExternalLink,
  Volume2,
  ChevronRight,
  Disc3,
  SlidersHorizontal,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InterestModal } from "@/components/InterestModal";

interface SongData {
  id: number;
  titulo: string;
  genero: string;
  subgenero?: string | null;
  capaUrl?: string | null;
  capaPath?: string | null;
  arquivoUrl?: string | null;
  mp3Path?: string | null;
  artistaNome?: string | null;
  compositor?: string | null;
  artistaSlug?: string | null;
  artistaId?: number | null;
  status?: string | null;
  precoX?: string | null;
  precoY?: string | null;
  plays?: number | string | null;
  likes?: number | string | null;
  duracao?: number | string | null;
  tipoMidia?: string | null;
  youtubeUrl?: string | null;
}

export default function PortalPlay() {
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const { toast } = useToast();

  const [songs, setSongs] = useState<SongData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("Todos");
  const [interestSong, setInterestSong] = useState<SongData | null>(null);

  useEffect(() => {
    fetch("/api/songs")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSongs(data);
        }
      })
      .catch((e) => console.error("Erro ao carregar catálogo:", e))
      .finally(() => setLoading(false));
  }, []);

  const genres = useMemo(() => {
    const set = new Set<string>();
    songs.forEach((s) => {
      if (s.genero) set.add(s.genero);
    });
    return ["Todos", ...Array.from(set)];
  }, [songs]);

  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      const matchGenre = selectedGenre === "Todos" || song.genero?.toLowerCase() === selectedGenre.toLowerCase();
      const matchSearch =
        !search ||
        song.titulo?.toLowerCase().includes(search.toLowerCase()) ||
        song.artistaNome?.toLowerCase().includes(search.toLowerCase()) ||
        song.compositor?.toLowerCase().includes(search.toLowerCase()) ||
        song.genero?.toLowerCase().includes(search.toLowerCase());
      return matchGenre && matchSearch;
    });
  }, [songs, selectedGenre, search]);

  const handlePlaySong = (song: SongData) => {
    playSong(song as any, filteredSongs as any[]);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-foreground flex flex-col selection:bg-primary selection:text-black">
      <Navbar />

      {/* Hero Banner Portal Play */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 border-b border-white/5 bg-gradient-to-b from-[#121222] via-[#0d0d16] to-[#0a0a0f]">
        <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/30 via-purple-600/10 to-transparent" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-bold uppercase tracking-wider">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                Portal do Artista Play • Streaming & Catálogo
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                Ouça, Descubra e <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-amber-200 to-primary">
                  Libere Músicas Inéditas
                </span>
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                O reprodutor oficial do Portal do Artista. Ouça faixas de compositores de todo o Brasil,
                escolha seu próximo sucesso e acesse o aplicativo mobile exclusivo.
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                <a
                  href="/play-app"
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 rounded-full bg-primary text-black font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                  <Smartphone className="w-4 h-4" />
                  Abrir Player Mobile Web
                </a>
                <button
                  onClick={() => {
                    toast({
                      title: "📱 App Portal do Artista Player",
                      description: "Para instalar no Android/iOS, toque em Compartilhar e selecione 'Adicionar à Tela de Início'!",
                    });
                  }}
                  className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-sm flex items-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4 text-primary" />
                  Instalar Aplicativo (PWA)
                </button>
              </div>
            </div>

            {/* Visual Mini Mockup */}
            <div className="w-full max-w-sm bg-gradient-to-br from-white/10 to-white/5 p-4 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl shrink-0">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3 text-xs text-muted-foreground font-mono">
                <span className="flex items-center gap-1.5 text-primary font-bold">
                  <Headphones className="w-4 h-4" /> REPRODUÇÃO ATIVA
                </span>
                <span>Portal Play v1.0</span>
              </div>
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-black/60 mb-3 border border-white/10 group">
                <img
                  src={formatImageUrl(currentSong?.capaUrl || songs[0]?.capaUrl, "/images/default-cover.png")}
                  alt="Now Playing"
                  className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 flex flex-col justify-end p-4">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    {currentSong?.genero || "Catálogo em Destaque"}
                  </span>
                  <h3 className="text-lg font-bold text-white truncate">
                    {currentSong?.titulo || songs[0]?.titulo || "Pronto para tocar"}
                  </h3>
                  <p className="text-xs text-white/70 truncate">
                    {currentSong?.artistaNome || currentSong?.compositor || songs[0]?.artistaNome || "Portal do Artista"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {isPlaying ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Tocando Agora
                    </span>
                  ) : (
                    <span>Pausado</span>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (currentSong) {
                      togglePlay();
                    } else if (songs[0]) {
                      handlePlaySong(songs[0]);
                    }
                  }}
                  className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-black font-black hover:scale-105 active:scale-95 transition-all shadow-md shadow-primary/30"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black ml-0.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog View */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-6">
        {/* Search and Genre Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar música, artista ou compositor..."
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
            />
          </div>

          {/* Genre Badges */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGenre(g)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedGenre === g
                    ? "bg-primary text-black shadow-sm"
                    : "bg-white/5 text-muted-foreground hover:text-white border border-white/5 hover:border-white/20"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-32 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
            ))}
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
            <Music className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <h3 className="text-base font-bold text-white">Nenhuma música encontrada</h3>
            <p className="text-xs text-muted-foreground mt-1">Tente ajustar o termo de busca ou selecione outro gênero.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSongs.map((song) => {
              const isThisSong = currentSong?.id === song.id;
              const isThisPlaying = isThisSong && isPlaying;
              const disponivel = !song.status || song.status === "Disponível";

              return (
                <div
                  key={song.id}
                  className={`relative flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all duration-300 group hover:border-primary/50 hover:bg-white/[0.06] ${
                    isThisSong
                      ? "bg-primary/10 border-primary/60 shadow-[0_0_20px_rgba(245,197,24,0.15)]"
                      : "bg-white/[0.03] border-white/10"
                  }`}
                >
                  {/* Capa com Play Overlay */}
                  <div
                    onClick={() => handlePlaySong(song)}
                    className="relative w-16 h-16 rounded-xl overflow-hidden bg-black/60 shrink-0 cursor-pointer border border-white/10"
                  >
                    <img
                      src={formatImageUrl(song.capaUrl, "/images/default-cover.png")}
                      alt={song.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-all"
                    />
                    <div
                      className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                        isThisPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {isThisPlaying ? (
                        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg">
                          <Pause className="w-3.5 h-3.5 fill-black text-black" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg">
                          <Play className="w-3.5 h-3.5 fill-black text-black ml-0.5" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Informações da Música */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground font-medium truncate">
                        {song.genero}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          disponivel
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                        }`}
                      >
                        {disponivel ? "Livre" : "Reservado"}
                      </span>
                    </div>

                    <h4
                      onClick={() => handlePlaySong(song)}
                      className="text-sm font-bold text-white truncate cursor-pointer hover:text-primary transition-colors"
                    >
                      {song.titulo}
                    </h4>

                    <p className="text-xs text-muted-foreground truncate">
                      {song.artistaNome || song.compositor || "Artista"}
                    </p>

                    {/* Preços de liberação se houver */}
                    {(song.precoX || song.precoY) && (
                      <div className="flex items-center gap-2 mt-1 text-[11px]">
                        {song.precoX && (
                          <span className="text-primary font-bold">Livre: R$ {song.precoX}</span>
                        )}
                        {song.precoY && (
                          <span className="text-amber-400 font-bold">Excl: R$ {song.precoY}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Ações Rápidas */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <button
                      onClick={() => setInterestSong(song)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary/20 text-primary border border-primary/40 hover:bg-primary hover:text-black transition-all cursor-pointer"
                    >
                      {disponivel ? "Gravar" : "Interesse"}
                    </button>
                    {song.artistaSlug && (
                      <Link
                        href={`/${song.artistaSlug}`}
                        className="text-[10px] text-muted-foreground hover:text-white flex items-center gap-0.5"
                      >
                        Perfil <ChevronRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de Interesse / Liberação */}
      {interestSong && (
        <InterestModal
          isOpen={!!interestSong}
          onClose={() => setInterestSong(null)}
          songTitle={interestSong.titulo}
          songId={interestSong.id}
          artistId={interestSong.artistaId || 0}
          artistName={interestSong.artistaNome || interestSong.compositor || "Compositor"}
          whatsappNumber=""
        />
      )}
    </div>
  );
}
