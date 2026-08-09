import { Link } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useListSongs } from "@workspace/api-client-react";
import { Navbar } from "@/components/Navbar";
import { MusicCard } from "@/components/MusicCard";
import { AudioPlayer } from "@/components/AudioPlayer";
import { NotificationBell, type Interest } from "@/components/NotificationBell";
import { InterestModal } from "@/components/InterestModal";
import { Disc3, TrendingUp, Star, Sparkles, Search, Music, Users, MapPin, Instagram, Mail, Phone, Activity, Clock, ArrowRight, Shuffle, BookOpen, ChevronRight } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";
import { useGenres } from "@/hooks/useGenres";
import { useSEO } from "@/hooks/useSEO";
import { CTACarouselBanner } from "@/components/CTACarouselBanner";
import { Footer } from "@/components/Footer";

export default function Home() {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [visibleSongsCount, setVisibleSongsCount] = useState(8);
  const { genres } = useGenres();
  const [heroSettings, setHeroSettings] = useState<{ title: string | null; subtitle: string | null; cta: string | null }>({ title: null, subtitle: null, cta: null });
  
  useSEO({
    title: "Explorar Músicas e Compositores | Portal do Artista",
    description: "Plataforma para compositores e artistas apresentarem, organizarem e divulgarem seus trabalhos musicais. Descubra músicas, compositores e lançamentos independentes.",
    keywords: "música, catálogo musical, compositores, artistas independentes, portal do artista",
    ogUrl: "https://portaldoartista.com/explorar",
    canonical: "https://portaldoartista.com/explorar",
    breadcrumbs: [
      { name: "Início", item: "https://portaldoartista.com/" },
      { name: "Explorar", item: "https://portaldoartista.com/explorar" }
    ]
  });

  const [interestModalOpen, setInterestModalOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<{ id: number; titulo: string; artistaId?: number | null } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const { playSong } = usePlayer();

  const [interests, setInterests] = useState<Interest[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [vitrineArtists, setVitrineArtists] = useState<any[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [featuredArticles, setFeaturedArticles] = useState<any[]>([]);
  const [loadingArtists, setLoadingArtists] = useState(false);

  const { data: songs, isLoading, error } = useListSongs({
    genre: selectedGenre || undefined,
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.heroTitle || data.heroSubtitle || data.heroCTA) {
          setHeroSettings({ title: data.heroTitle, subtitle: data.heroSubtitle, cta: data.heroCTA });
        }
      })
      .catch(console.error);

    fetch("/api/showcase/artists-vitrine")
      .then(r => r.json())
      .then(data => { 
        if (Array.isArray(data) && data.length > 0) {
          setVitrineArtists([...data].sort(() => Math.random() - 0.5));
        }
      })
      .catch(() => {});

    fetch("/api/activity-feed")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setActivityFeed(data);
      })
      .catch(() => {});

    fetch("/api/articles/featured")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setFeaturedArticles(data.slice(0, 3));
        } else {
          fetch("/api/articles")
            .then(r => r.json())
            .then(allArt => {
              if (Array.isArray(allArt)) setFeaturedArticles(allArt.slice(0, 3));
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    setLoadingArtists(true);
    fetch("/api/artists/public")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setArtists([...data].sort(() => Math.random() - 0.5));
        }
        setLoadingArtists(false);
      })
      .catch(() => setLoadingArtists(false));
  }, []);

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

  // Intercalar dinamicamente as músicas entre diferentes artistas (Round-Robin com Shuffle)
  const filteredSongs = useMemo(() => {
    const base = (songs || []).filter((s) => !(s as any).isVip && !(s as any).isPrivate);
    if (base.length === 0) return [];

    // Agrupar faixas por artista
    const groups: { [key: string]: any[] } = {};
    for (const song of base) {
      const key = String(song.artistaId ?? song.compositor ?? "outros");
      if (!groups[key]) groups[key] = [];
      groups[key].push(song);
    }

    // Embaralhar a ordem dos artistas em cada carregamento/F5
    const keys = Object.keys(groups).sort(() => Math.random() - 0.5);

    // Embaralhar as músicas de cada artista internamente
    keys.forEach((k) => {
      groups[k].sort(() => Math.random() - 0.5);
    });

    // Intercalar Round-Robin entre os artistas
    const interleaved: any[] = [];
    let hasMore = true;
    while (hasMore) {
      hasMore = false;
      for (const k of keys) {
        if (groups[k].length > 0) {
          interleaved.push(groups[k].shift()!);
          hasMore = true;
        }
      }
    }

    return interleaved;
  }, [songs]);

  const highlights = useMemo(() => {
    const dest = filteredSongs.filter((s) => (s as any).destaque);
    return dest.length > 0 ? dest.slice(0, 5) : filteredSongs.slice(0, 5);
  }, [filteredSongs]);

  const trends = useMemo(() => {
    return filteredSongs.slice(0, 6);
  }, [filteredSongs]);

  const allSongs = filteredSongs;

  const handleOpenInterest = (song: { id: number; titulo: string; artistaId?: number | null }) => {
    setSelectedSong(song);
    setInterestModalOpen(true);
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const song = (e as CustomEvent).detail.song;
      handleOpenInterest({ id: song.id, titulo: song.titulo, artistaId: song.artistaId });
    };
    document.addEventListener("openInterest", handler);
    return () => document.removeEventListener("openInterest", handler);
  }, []);

  // Utilizar vitrine se houver, ou lista publica
  const showcaseList = vitrineArtists.length > 0 ? vitrineArtists : artists.filter(a => a.capaUrl);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/80 pb-32">
      <Navbar />

      {/* BARRA HORIZONTAL DE ATIVIDADES NO MOBILE (Ticker deslizante tipo notícias) */}
      <div className="block lg:hidden w-full bg-black/90 border-b border-primary/20 backdrop-blur-md pt-20 pb-2.5 px-3 relative z-30">
        <div className="flex items-center justify-between gap-2 mb-2 px-1">
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 text-[10px] font-extrabold uppercase tracking-wider">
              <Activity className="w-3 h-3 animate-pulse text-primary" /> Ao Vivo
            </span>
            <span className="text-xs font-extrabold text-white">Feed de Atividades</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
            Arraste pro lado <ArrowRight className="w-3 h-3 text-primary animate-pulse" />
          </span>
        </div>

        {activityFeed.length === 0 ? (
          <div className="text-xs text-muted-foreground py-1.5 px-2">Carregando novidades recentes...</div>
        ) : (
          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar snap-x snap-mandatory py-1 px-0.5">
            {activityFeed.map((item, i) => (
              <Link
                key={`mob-ticker-${i}`}
                href={item.slug ? `/${item.slug}` : "/explorar"}
                className="snap-start shrink-0 flex items-center gap-2.5 bg-card/90 border border-border/70 hover:border-primary/60 rounded-2xl px-3 py-2 shadow-lg active:scale-95 transition-all max-w-[270px]"
              >
                {item.avatar ? (
                  <img src={item.avatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-primary/40 shrink-0 shadow-sm" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0 font-bold">
                    <Music className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-xs text-white truncate leading-tight">{item.title}</p>
                  <p className="text-[10px] text-primary/90 font-mono truncate mt-0.5">{item.subtitle}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Hero */}
      <section className="pt-6 sm:pt-20 pb-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <Disc3 className="w-4 h-4" />
              Catálogo Musical
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold text-foreground mb-4 leading-tight">
              {heroSettings.title || "A plataforma completa para"}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-200">
                {heroSettings.subtitle || "cantores e compositores"}
              </span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              {heroSettings.cta || "Cadastre suas músicas, monte seu portfólio musical e seja encontrado por contratantes e fãs em todo o Brasil."}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link
                href="/cadastro?plano=free"
                className="flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                <Star className="w-5 h-5" />
                Criar Meu Portal
              </Link>
              <Link
                href="/artistas"
                className="flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-primary/80 to-yellow-500/80 text-primary-foreground font-bold text-base hover:scale-105 transition-all shadow-lg"
              >
                <Users className="w-5 h-5" />
                Contratar Artista
              </Link>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Encontre seu artista e contrate seu show
            </p>

            <div className="max-w-md mx-auto relative">
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
                      href={`/${artist.slug}`}
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
          </motion.div>
        </div>
      </section>

      <CTACarouselBanner />

      {/* Genre filter */}
      <section id="catalogo" className="px-4 sm:px-6 lg:px-8 mb-8 mt-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => { setSelectedGenre(selectedGenre === genre ? null : genre); setVisibleSongsCount(8); }}
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

        {/* VITRINE DINÂMICA DE ARTISTAS */}
        {showcaseList.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                <h2 className="text-2xl font-bold text-foreground">Vitrine Dinâmica de Artistas</h2>
              </div>
              <Link href="/artistas" className="text-xs text-primary hover:underline font-bold flex items-center gap-1">
                Ver todos <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {showcaseList.slice(0, 6).map((artist, index) => (
                <motion.div
                  key={`vitrine-${artist.id}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={`/${artist.slug}`}
                    className="group block bg-card border border-border/40 rounded-2xl overflow-hidden hover:border-primary/60 hover:shadow-xl transition-all duration-300 text-center p-3"
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden mb-2 bg-muted/40 border border-primary/20">
                      <img
                        src={artist.capaUrl}
                        alt={artist.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <h3 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">{artist.name}</h3>
                    <p className="text-[10px] text-muted-foreground truncate">{artist.profissao || artist.genero}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* FEED LATERAL DE ATIVIDADES + SEÇÃO PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">

          {/* COLUNA PRINCIPAL (3 cols em telas grandes) */}
          <div className="lg:col-span-3 space-y-12">
            
            {highlights.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h2 className="text-2xl font-bold text-foreground">Destaques</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-card rounded-2xl overflow-hidden border border-border animate-pulse">
                      <div className="w-full aspect-square bg-muted/30" />
                      <div className="p-5 space-y-4">
                        <div className="h-6 bg-muted/30 rounded w-3/4" />
                        <div className="h-4 bg-muted/30 rounded w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && !error && allSongs.length > 0 && (
                <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allSongs.slice(0, visibleSongsCount).map((song, index) => (
                    <MusicCard key={`all-${song.id}`} song={song} index={index} />
                  ))}
                </div>

                {allSongs.length > visibleSongsCount && (
                  <div className="text-center mt-10">
                    <button
                      onClick={() => setVisibleSongsCount(prev => prev + 8)}
                      className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all shadow-lg"
                    >
                      Carregar Mais Músicas ({allSongs.length - visibleSongsCount} restantes)
                    </button>
                  </div>
                )}
                </>
              )}
            </section>
          </div>

          {/* BARRA LATERAL: FEED DE ATIVIDADES (1 col em lg) */}
          <aside className="lg:col-span-1 space-y-6 bg-card/60 border border-border/40 rounded-3xl p-5 backdrop-blur-sm sticky top-24">
            <div className="flex items-center justify-between border-b border-border/30 pb-3">
              <h3 className="font-extrabold text-foreground text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Feed de Atividades
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>

            {activityFeed.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
                Carregando novidades recentes...
              </div>
            ) : (
              <div className="space-y-4">
                {activityFeed.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs pb-3 border-b border-border/20 last:border-0 last:pb-0">
                    {item.avatar ? (
                      <img src={item.avatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-primary/30 shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Music className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground leading-tight">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{item.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-border/30">
              <Link href="/cadastro?plano=free" className="w-full py-2.5 px-3 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 font-bold text-xs flex items-center justify-center gap-2 transition-all">
                <Star className="w-3.5 h-3.5" />
                Divulgar Minha Música
              </Link>
            </div>
          </aside>
        </div>

        {/* SEÇÃO DE ARTIGOS EM DESTAQUE - FIQUE LIGADO! */}
        {featuredArticles.length > 0 && (
          <section className="bg-gradient-to-r from-card via-card/90 to-background border border-border/60 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden my-8">
            <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4 relative z-10">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-[11px] font-extrabold uppercase tracking-wider mb-1">
                  <BookOpen className="w-3.5 h-3.5" /> Dicas de Carreira & Direito Autoral
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Fique Ligado! 💡
                </h2>
              </div>

              <Link href="/artigos" className="inline-flex items-center gap-2 text-xs font-extrabold text-primary hover:underline">
                Ver Todos os Artigos <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              {featuredArticles.map((art) => (
                <motion.div
                  key={`feat-art-${art.id}`}
                  whileHover={{ y: -4 }}
                  className="bg-black/40 border border-border/60 hover:border-primary/40 rounded-2xl overflow-hidden shadow-xl flex flex-col group transition-all"
                >
                  <Link href={`/artigos/${art.slug}`} className="block relative aspect-video overflow-hidden">
                    <img
                      src={art.coverUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop"}
                      alt={art.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-[10px] font-extrabold uppercase text-primary border border-primary/30">
                      {art.category}
                    </div>
                  </Link>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <Link href={`/artigos/${art.slug}`}>
                        <h3 className="font-extrabold text-base text-white group-hover:text-primary transition-colors leading-snug line-clamp-2">
                          {art.title}
                        </h3>
                      </Link>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {art.excerpt}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border/40 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-white/80">{art.authorName || "Redação Portal do Artista"}</span>
                      <Link href={`/artigos/${art.slug}`} className="text-primary font-bold hover:underline flex items-center gap-1">
                        Ler Artigo <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </main>

      <InterestModal
        isOpen={interestModalOpen}
        onClose={() => { setInterestModalOpen(false); setSelectedSong(null); }}
        songId={selectedSong?.id ?? 0}
        artistaId={selectedSong?.artistaId}
        songTitle={selectedSong?.titulo}
      />

      <Footer />
      <AudioPlayer />
    </div>
  );
}
