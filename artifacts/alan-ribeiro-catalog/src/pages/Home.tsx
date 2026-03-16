import { useState } from "react";
import { motion } from "framer-motion";
import { useListSongs } from "@workspace/api-client-react";
import { Navbar } from "@/components/Navbar";
import { MusicCard } from "@/components/MusicCard";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Disc3 } from "lucide-react";

const GENRES = ["Todos os gêneros", "Sertanejo", "Piseiro", "Pop", "Rock", "MPB", "Acústico"];

export default function Home() {
  const [selectedGenre, setSelectedGenre] = useState(GENRES[0]);

  const { data: songs, isLoading, error } = useListSongs({
    genre: selectedGenre === "Todos os gêneros" ? undefined : selectedGenre
  });

  return (
    <div className="min-h-screen bg-background pb-32">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center p-3 mb-6 rounded-full bg-primary/10 border border-primary/20 text-primary"
          >
            <Disc3 className="w-6 h-6 animate-[spin_4s_linear_infinite]" />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold text-foreground mb-6"
          >
            Catálogo de Músicas <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-200">
              Alan Ribeiro
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Mergulhe nas composições mais recentes. Descubra melodias que tocam a alma e letras que contam histórias inesquecíveis.
          </motion.p>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Filters */}
        <div className="mb-12 flex flex-wrap items-center justify-center gap-3">
          {GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                selectedGenre === genre
                  ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(245,197,24,0.4)] scale-105"
                  : "bg-card text-muted-foreground border border-border hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card rounded-2xl overflow-hidden border border-border animate-pulse">
                <div className="w-full aspect-square bg-muted/30" />
                <div className="p-5 space-y-4">
                  <div className="h-6 bg-muted/30 rounded w-3/4" />
                  <div className="space-y-2">
                    <div className="h-4 bg-muted/30 rounded w-full" />
                    <div className="h-4 bg-muted/30 rounded w-5/6" />
                  </div>
                  <div className="h-10 bg-muted/30 rounded-xl w-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-20 bg-card rounded-2xl border border-destructive/20 text-destructive">
            <p className="text-lg">Erro ao carregar músicas. Tente novamente mais tarde.</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && songs?.length === 0 && (
          <div className="text-center py-20 bg-card/50 rounded-3xl border border-dashed border-border flex flex-col items-center">
            <Disc3 className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-2xl font-bold text-foreground mb-2">Nenhuma música encontrada</h3>
            <p className="text-muted-foreground">Não há faixas disponíveis para a seleção atual.</p>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {songs?.map((song, index) => (
            <MusicCard key={song.id} song={song} index={index} />
          ))}
        </div>

      </main>

      <AudioPlayer />
    </div>
  );
}
