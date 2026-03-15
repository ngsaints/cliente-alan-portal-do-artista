import { Play, Pause, Music } from "lucide-react";
import { motion } from "framer-motion";
import { type Song } from "@workspace/api-client-react";
import { usePlayer } from "@/contexts/PlayerContext";

interface MusicCardProps {
  song: Song;
  index: number;
}

export function MusicCard({ song, index }: MusicCardProps) {
  const { currentSong, isPlaying, playSong } = usePlayer();
  const isThisPlaying = currentSong?.id === song.id && isPlaying;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="group relative flex flex-col bg-card border border-border/40 rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.8)] hover:-translate-y-1"
    >
      <div className="relative aspect-square overflow-hidden bg-black/50">
        <img
          src={song.capaUrl || `${import.meta.env.BASE_URL}images/default-cover.png`}
          alt={song.titulo}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
          <button
            onClick={() => playSong(song)}
            className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
          >
            {isThisPlaying ? (
              <Pause className="w-8 h-8 fill-current" />
            ) : (
              <Play className="w-8 h-8 fill-current ml-1" />
            )}
          </button>
        </div>
        
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
          <Music className="w-3 h-3 text-primary" />
          <span className="text-xs font-medium text-white/90">{song.genero}</span>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-xl font-bold text-primary mb-2 line-clamp-1">{song.titulo}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 flex-1 mb-4">
          {song.descricao}
        </p>
        
        <button
          onClick={() => playSong(song)}
          className="w-full py-2.5 rounded-xl font-semibold bg-secondary/30 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all duration-300 active:scale-[0.98]"
        >
          {isThisPlaying ? "Pausar" : "Tocar Música"}
        </button>
      </div>
    </motion.div>
  );
}
