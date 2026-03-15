import { Play, Music } from "lucide-react";
import { motion } from "framer-motion";
import { type Song } from "@/data/songs";

interface MusicCardProps {
  song: Song;
  index: number;
}

export function MusicCard({ song, index }: MusicCardProps) {
  const imageUrl = `${import.meta.env.BASE_URL}images/${song.image}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay: index * 0.15,
        ease: "easeOut"
      }}
      className="group relative flex flex-col bg-card rounded-2xl overflow-hidden border border-border/50 shadow-lg hover:shadow-primary/10 hover:border-primary/30 transition-all duration-500 hover:-translate-y-2"
    >
      {/* Image Container with Glow Effect */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {/* Glow behind image on hover */}
        <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 z-0" />
        
        <img 
          src={imageUrl} 
          alt={`Capa da música ${song.title}`}
          className="w-full h-full object-cover relative z-10 transition-transform duration-700 group-hover:scale-110"
          onError={(e) => {
            // Fallback if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.parentElement?.classList.add('flex', 'items-center', 'justify-center');
          }}
        />
        
        {/* Overlay gradient for text readability if we placed text over image */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent z-20" />
        
        {/* Subtle icon overlay */}
        <div className="absolute inset-0 z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-primary/90 text-primary-foreground p-4 rounded-full transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-xl shadow-black/50">
            <Play className="w-8 h-8 ml-1" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-grow relative z-30">
        <div className="flex items-center gap-2 mb-3 text-primary">
          <Music className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Novo Lançamento</span>
        </div>
        
        <h3 className="text-2xl font-display font-bold text-foreground mb-3 group-hover:text-primary transition-colors duration-300">
          {song.title}
        </h3>
        
        <p className="text-muted-foreground text-sm leading-relaxed mb-8 flex-grow">
          {song.description}
        </p>
        
        {/* Button */}
        <a 
          href={song.link}
          target="_blank"
          rel="noopener noreferrer"
          className="relative overflow-hidden w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-primary-foreground bg-primary shadow-[0_0_20px_rgba(245,197,24,0.15)] hover:shadow-[0_0_25px_rgba(245,197,24,0.3)] transition-all duration-300 hover:scale-[1.02] active:scale-95"
        >
          <span className="relative z-10 flex items-center gap-2">
            Ouça Agora
            <Play className="w-4 h-4" fill="currentColor" />
          </span>
          {/* Button inner shine effect */}
          <div className="absolute inset-0 -translate-x-full bg-white/20 group-hover:animate-[shimmer_1.5s_infinite] skew-x-12" />
        </a>
      </div>
    </motion.div>
  );
}
