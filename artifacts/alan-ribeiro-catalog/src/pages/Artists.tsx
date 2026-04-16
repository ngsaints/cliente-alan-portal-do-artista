import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Music, MapPin, Instagram, Users, Star, ExternalLink, Loader2 } from "lucide-react";
import { useGenres } from "@/hooks/useGenres";

interface ArtistCard {
  id: number;
  name: string;
  profissao: string;
  cidade: string;
  genero: string;
  instagram: string;
  capaUrl: string;
  plano: string;
  musicaCount: string;
}

export default function Artists() {
  const [loading, setLoading] = useState(true);
  const [artists, setArtists] = useState<ArtistCard[]>([]);
  const [filterGenero, setFilterGenero] = useState("Todos");
  const { genres } = useGenres();
  const GENEROS = ["Todos", ...genres];
  const [filterCidade, setFilterCidade] = useState("Todas");

  useEffect(() => {
    fetch("/api/artists/public")
      .then(r => r.json())
      .then(data => {
        setArtists(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredArtists = artists.filter((a) => {
    if (filterGenero !== "Todos" && a.genero !== filterGenero) return false;
    if (filterCidade !== "Todas" && !a.cidade?.includes(filterCidade)) return false;
    return true;
  });

  const cidades = ["Todas", ...new Set(artists.map((a) => a.cidade?.split(",")[0].trim()).filter(Boolean))];

  const sortedArtists = [...filteredArtists].sort((a, b) => {
    const planoOrder: Record<string, number> = { premium: 5, pro: 4, intermediario: 3, basico: 2, free: 1 };
    return (planoOrder[b.plano] || 0) - (planoOrder[a.plano] || 0);
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/80 pb-32">
      <Navbar />

      <section className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <Music className="w-4 h-4" />
              Portal do Artista
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-foreground mb-4">
              Nossos{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-200">
                Artistas
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Descubra e acompanhe artistas independentes de todo o Brasil
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="px-4 sm:px-6 lg:px-8 mb-8">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-4 items-center justify-center">
          <select
            value={filterGenero}
            onChange={(e) => setFilterGenero(e.target.value)}
            className="bg-card border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {GENEROS.map(g => <option key={g} value={g}>{g === "Todos" ? "Todos os Gêneros" : g}</option>)}
          </select>
          <select
            value={filterCidade}
            onChange={(e) => setFilterCidade(e.target.value)}
            className="bg-card border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {cidades.map(c => <option key={c} value={c}>{c === "Todas" ? "Todas as Cidades" : c}</option>)}
          </select>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : sortedArtists.length === 0 ? (
          <div className="text-center py-20 bg-card/50 rounded-3xl border border-dashed border-border">
            <Users className="w-16 h-16 text-muted-foreground mb-4 opacity-50 mx-auto" />
            <h3 className="text-2xl font-bold text-foreground mb-2">Nenhum artista encontrado</h3>
            <p className="text-muted-foreground">Tente ajustar os filtros de busca.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedArtists.map((artist, index) => (
              <motion.div
                key={artist.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={artist.slug ? `/a/${artist.slug}` : `/artista/${artist.id}`}>
                  <div className="group bg-card border border-border/40 rounded-2xl overflow-hidden hover:border-primary/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.8)] hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full flex flex-col">
                    <div className="relative aspect-square overflow-hidden bg-black/50">
                      {artist.capaUrl ? (
                        <img src={artist.capaUrl} alt={artist.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                          <Users className="w-16 h-16 text-primary/50" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          artist.plano === 'premium' ? 'bg-yellow-500/80 text-black' :
                          artist.plano === 'pro' ? 'bg-purple-500/80 text-white' :
                          artist.plano === 'intermediario' ? 'bg-blue-500/80 text-white' :
                          artist.plano === 'basico' ? 'bg-green-500/80 text-white' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {artist.plano.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="text-lg font-bold text-foreground truncate">{artist.name}</h3>
                      <p className="text-sm text-muted-foreground">{artist.profissao}</p>
                      {artist.cidade && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {artist.cidade}
                        </p>
                      )}
                      {artist.genero && (
                        <p className="text-xs text-primary mt-2">{artist.genero}</p>
                      )}
                      <div className="mt-auto pt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Music className="w-3 h-3" />
                          {artist.musicaCount || 0} músicas
                        </span>
                        {artist.instagram && (
                          <span className="flex items-center gap-1">
                            <Instagram className="w-3 h-3" />
                            @{artist.instagram}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <AudioPlayer />
    </div>
  );
}