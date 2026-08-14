import React from 'react';
import { Play, Pause, SkipForward, ChevronUp } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export const MiniPlayer: React.FC = () => {
  const { currentSong, isPlaying, togglePlay, nextSong, progress, duration, setIsFullPlayerOpen } = usePlayer();

  if (!currentSong) return null;

  const pct = duration ? (progress / duration) * 100 : 0;

  return (
    <div
      onClick={() => setIsFullPlayerOpen(true)}
      className="fixed bottom-[65px] left-3 right-3 z-30 bg-[#1a1a1a]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.8)] cursor-pointer max-w-lg mx-auto flex items-center justify-between gap-3"
    >
      {/* Top progress line */}
      <div className="absolute top-0 left-3 right-3 h-0.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#f5c518] transition-all duration-300 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Album Cover & Title */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-md">
          <img
            src={currentSong.capaUrl || '/images/default-cover.png'}
            alt={currentSong.titulo}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-xs text-white truncate leading-tight">
            {currentSong.titulo}
          </h4>
          <p className="text-[11px] text-white/50 truncate">
            {currentSong.artista}
          </p>
        </div>
      </div>

      {/* Control Action Buttons */}
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-[#f5c518] text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform cursor-pointer"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>
        <button
          onClick={nextSong}
          className="w-8 h-8 rounded-full text-white/60 hover:text-white flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
        >
          <SkipForward className="w-4 h-4 fill-current" />
        </button>
        <button
          onClick={() => setIsFullPlayerOpen(true)}
          className="w-8 h-8 rounded-full text-white/40 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
