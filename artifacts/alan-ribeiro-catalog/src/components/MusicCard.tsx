import { Play, Pause, Music } from "lucide-react";
import { motion } from "framer-motion";
import { type Song } from "@workspace/api-client-react";
import { usePlayer } from "@/contexts/PlayerContext";

interface MusicCardProps {
  song: Song;
  index: number;
}

function formatPreco(val: string | null | undefined) {
  if (!val) return null;
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function MusicCard({ song, index }: MusicCardProps) {
  const { currentSong, isPlaying, playSong } = usePlayer();
  const isThisPlaying = currentSong?.id === song.id && isPlaying;
  const disponivel = !song.status || song.status === "Disponível";
  const precoX = formatPreco(song.precoX);
  const precoY = formatPreco(song.precoY);

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

        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
            <Music className="w-3 h-3 text-primary" />
            <span className="text-xs font-medium text-white/90">{song.genero}{song.subgenero ? ` · ${song.subgenero}` : ""}</span>
          </div>
          <div className={`self-start px-3 py-1 rounded-full text-xs font-bold ${disponivel ? "bg-green-600/80 text-white" : "bg-red-600/80 text-white"}`}>
            {disponivel ? "Disponível" : "Reservado"}
          </div>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-xl font-bold text-primary mb-1 line-clamp-1">{song.titulo}</h3>
        {song.compositor && (
          <p className="text-xs text-muted-foreground mb-2">Compositor: {song.compositor}</p>
        )}
        <p className="text-sm text-muted-foreground line-clamp-2 flex-1 mb-4">
          {song.descricao}
        </p>

        {(precoX || precoY) && (
          <div className="flex gap-3 mb-4 text-xs">
            {precoX && (
              <div className="flex-1 bg-secondary/20 border border-border/50 rounded-xl px-3 py-2 text-center">
                <div className="text-muted-foreground mb-0.5">Valor X · Livre</div>
                <div className="text-primary font-bold">{precoX}</div>
              </div>
            )}
            {precoY && (
              <div className="flex-1 bg-secondary/20 border border-border/50 rounded-xl px-3 py-2 text-center">
                <div className="text-muted-foreground mb-0.5">Valor Y · Exclusivo</div>
                <div className="text-primary font-bold">{precoY}</div>
              </div>
            )}
          </div>
        )}

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
