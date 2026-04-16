import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";

function formatTime(seconds: number) {
  if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioPlayer() {
  const { 
    currentSong, 
    isPlaying, 
    togglePlay, 
    progress, 
    duration, 
    seek,
    volume,
    setVolume
  } = usePlayer();

  if (!currentSong) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border/50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] p-4 md:px-8"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4 md:gap-8">
          
          {/* Song Info */}
          <div className="flex items-center gap-4 w-full md:w-1/3">
            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 shadow-md">
              <img 
                src={currentSong.capaUrl || `${import.meta.env.BASE_URL}images/default-cover.png`} 
                alt={currentSong.titulo}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h4 className="text-primary font-bold truncate">{currentSong.titulo}</h4>
              <p className="text-muted-foreground text-xs truncate">{currentSong.compositor || "Artista"}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-2 w-full md:w-1/3">
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-[0_0_15px_rgba(245,197,24,0.3)]"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
            </button>
            <div className="flex items-center gap-3 w-full max-w-md">
              <span className="text-xs text-muted-foreground font-mono w-10 text-right">
                {formatTime(progress)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={progress}
                onChange={(e) => seek(Number(e.target.value))}
                className="flex-1 h-1.5 bg-input rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
              />
              <span className="text-xs text-muted-foreground font-mono w-10">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Volume */}
          <div className="hidden md:flex items-center justify-end gap-2 w-1/3">
            <button 
              onClick={() => setVolume(volume === 0 ? 1 : 0)}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-24 h-1.5 bg-input rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
