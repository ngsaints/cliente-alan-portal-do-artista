import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Music, MapPin, Instagram, Users, Star, ExternalLink, Loader2, Search, X } from "lucide-react";
import { useGenres } from "@/hooks/useGenres";
import { useSEO } from "@/hooks/useSEO";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

interface ArtistCard {
  id: number;
  name: string;
  slug?: string;
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
  const [allCities, setAllCities] = useState<string[]>([]);
  const [cityPopoverOpen, setCityPopoverOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [sectionTitle, setSectionTitle] = useState("Nossos Artistas");
  const [sectionSubtitle, setSectionSubtitle] = useState("Descubra e acompanhe cantores e compositores de todo o Brasil");

  useSEO({
    title: "Artistas - Portal do Artista",
    description: "Conheça os artistas do Portal do Artista. Cantores, compositores e bandas independentes de todo o Brasil.",
    keywords: "artistas, cantores, compositores, bandas, música independente",
    ogUrl: "https://portaldoartista.com/artistas",
    canonical: "https://portaldoartista.com/artistas",
  });

  useEffect(() => {
    fetch("/api/artists/public")
      .then(r => r.json())
      .then(data => {
        setArtists(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/cities")
      .then(r => r.json())
      .then(data => {
        const nomes = data.map((c: { nome: string; estado: string | null }) =>
          c.estado ? `${c.nome}, ${c.estado}` : c.nome
        );
        setAllCities(["Todas", ...nomes]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        if (data.artistsSectionTitle) setSectionTitle(data.artistsSectionTitle);
        if (data.artistsSectionSubtitle) setSectionSubtitle(data.artistsSectionSubtitle);
      })
      .catch(() => {});
  }, []);

  const filteredArtists = artists.filter((a) => {
    if (filterGenero !== "Todos" && a.genero !== filterGenero) return false;
    if (filterCidade !== "Todas" && a.cidade?.toLowerCase() !== filterCidade.toLowerCase()) return false;
    return true;
  });

  const cidades = allCities;

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
              {sectionTitle}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {sectionSubtitle}
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
          <Popover open={cityPopoverOpen} onOpenChange={setCityPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                className="bg-card border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 flex items-center gap-2 min-w-[180px] justify-between"
              >
                <span className="truncate">
                  {filterCidade === "Todas" ? "Todas as Cidades" : filterCidade}
                </span>
                <MapPin className="w-4 h-4 shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Buscar cidade..."
                  value={citySearch}
                  onValueChange={setCitySearch}
                />
                <CommandList>
                  <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      key="todas"
                      value="Todas"
                      onSelect={() => {
                        setFilterCidade("Todas");
                        setCitySearch("");
                        setCityPopoverOpen(false);
                      }}
                      className="flex items-center justify-between"
                    >
                      <span>Todas as Cidades</span>
                      {filterCidade === "Todas" && <span className="text-primary">✓</span>}
                    </CommandItem>
                    {cidades
                      .filter(c => c !== "Todas")
                      .filter(c => c.toLowerCase().includes(citySearch.toLowerCase()))
                      .map(c => (
                        <CommandItem
                          key={c}
                          value={c}
                          onSelect={() => {
                            setFilterCidade(c);
                            setCitySearch("");
                            setCityPopoverOpen(false);
                          }}
                          className="flex items-center justify-between"
                        >
                          <span>{c}</span>
                          {filterCidade === c && <span className="text-primary">✓</span>}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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