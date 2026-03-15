import { motion } from "framer-motion";
import { MusicCard } from "@/components/MusicCard";
import { catalogSongs } from "@/data/songs";
import { Disc, Instagram, Youtube, ChevronDown } from "lucide-react";

export default function Home() {
  const heroBg = `${import.meta.env.BASE_URL}images/hero-bg.png`;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary selection:text-primary-foreground">
      {/* Background ambient light */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Hero Section */}
      <header className="relative min-h-[60vh] flex flex-col items-center justify-center pt-20 pb-16 px-4 sm:px-6 lg:px-8 border-b border-border/40">
        {/* Background Image */}
        <div className="absolute inset-0 z-0 opacity-30">
          <img 
            src={heroBg} 
            alt="Background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8">
            <Disc className="w-4 h-4 text-primary animate-spin-slow" />
            <span className="text-xs font-semibold tracking-widest uppercase text-white/80">Catálogo Oficial</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white via-primary to-primary/80 drop-shadow-lg">
            Alan Ribeiro
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
            Mergulhe nas composições mais recentes. Descubra melodias que tocam a alma e letras que contam histórias inesquecíveis.
          </p>

          <div className="flex items-center justify-center gap-4">
            <a href="https://youtube.com/@alanribeirooficial" target="_blank" rel="noopener noreferrer" className="p-3 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-primary hover:border-primary/50 hover:bg-primary/10 transition-all duration-300">
              <Youtube className="w-6 h-6" />
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer" className="p-3 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-primary hover:border-primary/50 hover:bg-primary/10 transition-all duration-300">
              <Instagram className="w-6 h-6" />
            </a>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground animate-bounce"
        >
          <span className="text-xs font-medium tracking-widest uppercase">Explorar</span>
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </header>

      {/* Catalog Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl font-display font-bold text-white mb-2">Lançamentos</h2>
            <div className="h-1 w-20 bg-primary rounded-full" />
          </div>
          <span className="text-sm text-muted-foreground font-medium hidden sm:block">
            Mostrando {catalogSongs.length} faixas
          </span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
          {catalogSongs.map((song, index) => (
            <MusicCard key={song.id} song={song} index={index} />
          ))}
        </div>

        {/* Bottom Call to Action */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-32 p-10 rounded-3xl bg-card border border-border/50 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <h3 className="text-3xl font-display font-bold text-white mb-4">
            Acompanhe nas Redes
          </h3>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Inscreva-se no canal do YouTube para não perder nenhum lançamento, clipe oficial ou bastidores das produções.
          </p>
          <a 
            href="https://youtube.com/@alanribeirooficial?si=BX65PC2ZmsNTyY3P" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-bold text-white bg-white/10 border border-white/20 hover:bg-primary hover:border-primary hover:text-primary-foreground transition-all duration-300"
          >
            <Youtube className="w-5 h-5" />
            Inscrever-se no YouTube
          </a>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Alan Ribeiro. Todos os direitos reservados.</p>
      </footer>

      {/* Global CSS for custom animations like shimmer */}
      <style>{`
        @keyframes shimmer {
          100% {
            transform: translateX(200%) skewX(12deg);
          }
        }
        .animate-spin-slow {
          animation: spin 4s linear infinite;
        }
      `}</style>
    </div>
  );
}
