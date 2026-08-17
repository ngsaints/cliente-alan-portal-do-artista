import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, X, SkipBack, SkipForward, ListMusic, Disc, Zap, Radio } from "lucide-react";
import { usePlayer, type PlayerStyle } from "@/contexts/PlayerContext";
import { formatImageUrl } from "@/lib/utils";

function formatTime(seconds: number) {
  if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function PlayerPadrao() {
  const { 
    currentSong, isPlaying, togglePlay, progress, duration, seek,
    volume, setVolume, playerGradient, playerCor, setCurrentSong, setIsPlaying,
  } = usePlayer();

  const accent = playerGradient || playerCor || "#f5c518";

  const closePlayer = () => {
    if (currentSong) {
      setCurrentSong(null);
      setIsPlaying(false);
    }
  };

  if (!currentSong) return null;

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#121212]/98 backdrop-blur-xl border-t shadow-2xl p-3 sm:p-4"
      style={{
        borderTopColor: `${playerCor || '#f5c518'}40`,
        boxShadow: `0 -10px 40px ${playerCor || '#f5c518'}15`
      }}
    >
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 -mt-px">
        <div 
          className="h-full rounded-b-full transition-all duration-300"
          style={{ width: `${duration ? (progress / duration) * 100 : 0}%`, background: accent }}
        />
        <input type="range" min={0} max={duration || 100} value={progress} onChange={(e) => seek(Number(e.target.value))} className="absolute top-0 left-0 w-full h-1 opacity-0 cursor-pointer -mt-px" />
      </div>

      {/* DESKTOP LAYOUT */}
      <div className="hidden sm:flex items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Left: Info */}
        <div className="flex items-center gap-3 w-1/3 min-w-0">
          <button onClick={closePlayer} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
          
          <div 
            className="w-12 h-12 rounded-lg overflow-hidden shrink-0 shadow-lg border"
            style={{ borderColor: `${playerCor || '#f5c518'}40` }}
          >
            <img src={formatImageUrl(currentSong.capaUrl, `${import.meta.env.BASE_URL}images/default-cover.png`)} alt={currentSong.titulo} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-white truncate text-sm">{currentSong.titulo}</h4>
            <p className="text-white/60 text-xs truncate">{currentSong.compositor || "Artista"}</p>
          </div>
        </div>

        {/* Center: Play Controls */}
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <button
            onClick={togglePlay}
            className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg border border-white/10"
            style={{ background: accent, boxShadow: `0 0 25px ${playerCor || '#f5c518'}50` }}
          >
            {isPlaying ? <Pause className="w-6 h-6 text-black fill-black" /> : <Play className="w-6 h-6 text-black fill-black ml-0.5" />}
          </button>
          <div className="flex items-center gap-2 text-xs text-white/50 font-mono">
            <span>{formatTime(progress)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Volume */}
        <div className="flex items-center gap-2 w-1/3 justify-end">
          <button onClick={() => setVolume(volume === 0 ? 1 : 0)} className="text-white/60 hover:text-white transition-colors p-1 flex-shrink-0">
            {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden relative">
            <div className="absolute top-0 left-0 h-full rounded-full transition-all" style={{ width: `${volume * 100}%`, background: accent }} />
            <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="absolute top-0 left-0 w-full h-1 opacity-0 cursor-pointer" />
          </div>
        </div>
      </div>

      {/* MOBILE LAYOUT */}
      <div className="sm:hidden flex items-center justify-between w-full gap-3">
        {/* Left: Capa + Info */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div 
            className="w-10 h-10 rounded overflow-hidden shrink-0 border"
            style={{ borderColor: `${playerCor || '#f5c518'}30` }}
          >
            <img src={formatImageUrl(currentSong.capaUrl, `${import.meta.env.BASE_URL}images/default-cover.png`)} alt={currentSong.titulo} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-white text-xs truncate leading-snug">{currentSong.titulo}</h4>
            <p className="text-white/50 text-[10px] truncate leading-none mt-0.5">{currentSong.compositor || "Artista"}</p>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[10px] text-white/40 font-mono">{formatTime(progress)} / {formatTime(duration)}</span>
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md"
            style={{ background: accent }}
          >
            {isPlaying ? <Pause className="w-4 h-4 text-black fill-black" /> : <Play className="w-4 h-4 text-black fill-black ml-0.5" />}
          </button>
          <button onClick={closePlayer} className="w-7 h-7 rounded-full flex items-center justify-center bg-white/5 text-white/50 hover:text-white transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function PlayerMinimalista() {
  const { currentSong, isPlaying, togglePlay, progress, duration, seek, setCurrentSong, setIsPlaying, playerGradient, playerCor } = usePlayer();

  const trackGradient = playerGradient || playerCor || "#f5c518";

  if (!currentSong) return null;

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-lg border-t border-white/10 p-2"
    >
      <div className="h-0.5 bg-white/10">
        <div className="h-full transition-all duration-300" style={{ width: `${duration ? (progress / duration) * 100 : 0}%`, background: trackGradient }} />
        <input type="range" min={0} max={duration || 100} value={progress} onChange={(e) => seek(Number(e.target.value))} className="absolute top-0 left-0 w-full h-0.5 opacity-0 cursor-pointer" />
      </div>
      <div className="flex items-center justify-between px-2 py-1.5">
        <div className="w-7 h-7 rounded overflow-hidden">
          <img src={formatImageUrl(currentSong.capaUrl, `${import.meta.env.BASE_URL}images/default-cover.png`)} alt={currentSong.titulo} className="w-full h-full object-cover" />
        </div>
        <button onClick={togglePlay} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: trackGradient }}>
          {isPlaying ? <Pause className="w-4 h-4 text-black fill-black" /> : <Play className="w-4 h-4 text-black fill-black ml-0.5" />}
        </button>
        <button onClick={() => { setCurrentSong(null); setIsPlaying(false); }} className="text-white/50 hover:text-white p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="sm:hidden flex items-center justify-center gap-2 px-2">
        <span className="text-[10px] text-white/50 font-mono">{formatTime(progress)}</span>
        <span className="text-[10px] text-white/30">/</span>
        <span className="text-[10px] text-white/50 font-mono">{formatTime(duration)}</span>
      </div>
    </motion.div>
  );
}

export function PlayerLista() {
  const { currentSong, isPlaying, togglePlay, progress, duration, seek, volume, setVolume, setCurrentSong, setIsPlaying, playerGradient, playerCor } = usePlayer();

  const playButtonBg = playerGradient || playerCor || "#f5c518";
  const trackGradient = playerGradient || "linear-gradient(to right, #f5c518, #f5c518)";

  if (!currentSong) return null;

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-br from-gray-900 to-gray-800 backdrop-blur-xl border-t border-white/10 p-3 sm:p-4"
    >
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/5 -mt-px">
        <div className="h-full rounded-r-full transition-all duration-300" style={{ width: `${duration ? (progress / duration) * 100 : 0}%`, background: trackGradient }} />
        <input type="range" min={0} max={duration || 100} value={progress} onChange={(e) => seek(Number(e.target.value))} className="absolute top-0 left-0 w-full h-1.5 opacity-0 cursor-pointer" />
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button onClick={() => { setCurrentSong(null); setIsPlaying(false); }} className="text-white/50 hover:text-white p-1">
          <X className="w-4 h-4" />
        </button>
        
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 sm:w-14 sm:h-14 rounded-lg overflow-hidden shadow-lg ring-2 ring-white/10">
            <img src={formatImageUrl(currentSong.capaUrl, `${import.meta.env.BASE_URL}images/default-cover.png`)} alt={currentSong.titulo} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1 hidden sm:block">
            <h4 className="font-bold text-white truncate text-sm">{currentSong.titulo}</h4>
            <p className="text-white/50 text-xs truncate">{currentSong.compositor || "Artista"}</p>
          </div>
        </div>

        <button onClick={togglePlay} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center hover:scale-105 transition-all" style={{ background: playButtonBg }}>
          {isPlaying ? <Pause className="w-5 h-5 text-black fill-black" /> : <Play className="w-5 h-5 text-black fill-black ml-0.5" />}
        </button>

        <div className="hidden sm:flex items-center gap-1 text-xs text-white/50 font-mono">
          <span>{formatTime(progress)}</span>
          <span className="mx-1">/</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="hidden sm:flex items-center gap-1">
          <ListMusic className="w-5 h-5 text-white/30" />
        </div>
      </div>

      <div className="sm:hidden flex items-center justify-center gap-2 mt-1.5">
        <span className="text-[10px] text-white/50 font-mono">{formatTime(progress)}</span>
        <span className="text-[10px] text-white/30">/</span>
        <span className="text-[10px] text-white/50 font-mono">{formatTime(duration)}</span>
      </div>
    </motion.div>
  );
}

export function PlayerWaveform() {
  const { currentSong, isPlaying, togglePlay, progress, duration, seek, volume, setVolume, setCurrentSong, setIsPlaying, playerGradient, playerCor } = usePlayer();

  const playButtonBg = playerGradient || playerCor || "#f5c518";

  if (!currentSong) return null;

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a1a] backdrop-blur-2xl border-t border-cyan-500/30 shadow-[0_-4px_30px_rgba(6,182,212,0.3)] p-3 sm:p-4"
    >
      <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-3">
        <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg overflow-hidden shadow-lg ring-2 ring-cyan-500/30">
          <img src={formatImageUrl(currentSong.capaUrl, `${import.meta.env.BASE_URL}images/default-cover.png`)} alt={currentSong.titulo} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0 hidden sm:block">
          <h4 className="font-bold text-white truncate text-sm">{currentSong.titulo}</h4>
          <p className="text-cyan-300/60 text-xs truncate">{currentSong.compositor || "Artista"}</p>
        </div>
        <button onClick={togglePlay} className="w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center hover:scale-105 transition-all" style={{ background: playButtonBg }}>
          {isPlaying ? <Pause className="w-4 h-4 sm:w-6 sm:h-6 text-black fill-black" /> : <Play className="w-4 h-4 sm:w-6 sm:h-6 text-black fill-black ml-0.5" />}
        </button>
        <button onClick={() => { setCurrentSong(null); setIsPlaying(false); }} className="text-cyan-300/50 hover:text-cyan-300 p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <span className="text-[10px] sm:text-xs text-cyan-300/50 font-mono w-6 sm:w-10 hidden sm:block">{formatTime(progress)}</span>
        <div className="flex-1 h-6 sm:h-8 bg-cyan-500/10 rounded flex items-center justify-center gap-0.5 px-0.5 sm:px-1">
          {Array.from({ length: 30 }).map((_, i) => {
            const height = Math.random() * 60 + 20;
            const isPlayed = (i / 30) * 100 < (progress / duration) * 100;
            return (
              <div
                key={i}
                className="w-0.5 sm:w-1 rounded-full transition-all"
                style={{
                  height: `${height}%`,
                  background: isPlayed ? playButtonBg : 'rgba(6, 182, 212, 0.3)'
                }}
              />
            );
          })}
        </div>
        <span className="text-[10px] sm:text-xs text-cyan-300/50 font-mono w-6 sm:w-10 text-right hidden sm:block">{formatTime(duration)}</span>
      </div>
      <input type="range" min={0} max={duration || 100} value={progress} onChange={(e) => seek(Number(e.target.value))} className="w-full h-1 opacity-0 cursor-pointer absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4" />
    </motion.div>
  );
}

export function PlayerModerno() {
  const { currentSong, isPlaying, togglePlay, progress, duration, seek, volume, setVolume, setCurrentSong, setIsPlaying, playerGradient, playerCor } = usePlayer();

  const playButtonBg = playerGradient || playerCor || "#a855f7";
  const trackGradient = playerGradient || "linear-gradient(to right, #a855f7, #ec4899)";

  if (!currentSong) return null;

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-900/95 to-pink-900/95 backdrop-blur-2xl border-t border-white/10 p-2 sm:p-4"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 -mt-px">
        <div className="h-full rounded-r-full transition-all duration-100" style={{ width: `${duration ? (progress / duration) * 100 : 0}%`, background: trackGradient }} />
        <input type="range" min={0} max={duration || 100} value={progress} onChange={(e) => seek(Number(e.target.value))} className="absolute top-0 left-0 w-full h-1 opacity-0 cursor-pointer" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <button onClick={() => { setCurrentSong(null); setIsPlaying(false); }} className="text-white/50 hover:text-white p-1">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-[180px] sm:max-w-md mx-auto">
          <div className="w-9 h-9 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl overflow-hidden shadow-lg ring-2 ring-white/20" style={{ background: playButtonBg }}>
            <img src={formatImageUrl(currentSong.capaUrl, `${import.meta.env.BASE_URL}images/default-cover.png`)} alt={currentSong.titulo} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1 hidden sm:block">
            <h4 className="font-bold text-white truncate text-base">{currentSong.titulo}</h4>
            <p className="text-white/60 text-sm truncate">{currentSong.compositor || "Artista"}</p>
          </div>
        </div>

        <button onClick={togglePlay} className="w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center hover:scale-110 transition-all" style={{ background: playButtonBg, boxShadow: `0 0 15px ${playButtonBg}80` }}>
          {isPlaying ? <Pause className="w-4 h-4 sm:w-6 sm:h-6 text-white fill-white" /> : <Play className="w-4 h-4 sm:w-6 sm:h-6 text-white fill-white ml-0.5" />}
        </button>
      </div>
    </motion.div>
  );
}

export function PlayerVintage() {
  const { currentSong, isPlaying, togglePlay, progress, duration, seek, volume, setVolume, setCurrentSong, setIsPlaying, playerGradient, playerCor } = usePlayer();

  const playButtonBg = playerGradient || playerCor || "#d97706";
  const trackGradient = playerGradient || "linear-gradient(to right, #d97706, #ea580c)";

  if (!currentSong) return null;

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-amber-950/95 backdrop-blur-xl border-t border-amber-700/50 shadow-[0_-4px_30px_rgba(217,119,6,0.3)] p-2 sm:p-4"
      style={{ background: 'linear-gradient(to right, #451a03, #1c1917)' }}
    >
      <div className="absolute top-0 left-0 right-0 h-1.5 sm:h-2 bg-amber-900/30 -mt-px">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${duration ? (progress / duration) * 100 : 0}%`, background: trackGradient }} />
        <input type="range" min={0} max={duration || 100} value={progress} onChange={(e) => seek(Number(e.target.value))} className="absolute top-0 left-0 w-full h-1.5 sm:h-2 opacity-0 cursor-pointer" />
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button onClick={() => { setCurrentSong(null); setIsPlaying(false); }} className="text-amber-200/50 hover:text-amber-200 p-1">
          <X className="w-4 h-4" />
        </button>

        <div className="hidden sm:block text-amber-600">
          <Disc className="w-8 h-8 animate-spin" style={{ animationDuration: isPlaying ? '3s' : '0s' }} />
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 sm:w-14 sm:h-14 rounded-full overflow-hidden shadow-lg ring-2 sm:ring-4 ring-amber-700/50">
            <img src={formatImageUrl(currentSong.capaUrl, `${import.meta.env.BASE_URL}images/default-cover.png`)} alt={currentSong.titulo} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1 hidden sm:block">
            <h4 className="font-bold text-amber-100 truncate text-sm sm:text-base">{currentSong.titulo}</h4>
            <p className="text-amber-300/60 text-xs truncate">{currentSong.compositor || "Artista"}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button onClick={togglePlay} className="w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center hover:scale-105 transition-all" style={{ background: playButtonBg }}>
            {isPlaying ? <Pause className="w-4 h-4 sm:w-6 sm:h-6 text-white fill-white" /> : <Play className="w-4 h-4 sm:w-6 sm:h-6 text-white fill-white ml-0.5" />}
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-amber-200/50 font-mono text-sm">
          <span>{formatTime(progress)}</span>
          <span className="mx-1">/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="sm:hidden flex items-center justify-center gap-2 mt-1">
        <span className="text-[10px] text-amber-200/50 font-mono">{formatTime(progress)}</span>
        <span className="text-[10px] text-amber-300/30">/</span>
        <span className="text-[10px] text-amber-200/50 font-mono">{formatTime(duration)}</span>
      </div>
    </motion.div>
  );
}

export function PlayerIpod() {
  const {
    currentSong, isPlaying, togglePlay, progress, duration, seek,
    volume, setVolume, setCurrentSong, setIsPlaying, playerGradient, playerCor,
  } = usePlayer();

  const accent = playerGradient || playerCor || "#f5c518";
  const pct = duration ? (progress / duration) * 100 : 0;

  if (!currentSong) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4"
      style={{
        background: "linear-gradient(to top, #1a1a1a 0%, #2a2a2a 100%)",
        borderTop: `2px solid ${playerCor || "#f5c518"}50`,
        boxShadow: `0 -8px 32px ${playerCor || "#f5c518"}20`,
      }}
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10">
        <div
          className="h-full transition-all duration-300 rounded-full"
          style={{ width: `${pct}%`, background: accent }}
        />
        <input
          type="range" min={0} max={duration || 100} value={progress}
          onChange={e => seek(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      <div className="flex items-center gap-3 max-w-2xl mx-auto">
        {/* Close */}
        <button
          onClick={() => { setCurrentSong(null); setIsPlaying(false); }}
          className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Spinning album art — iPod signature */}
        <div className="relative shrink-0">
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden"
            style={{
              animation: isPlaying ? "spin 4s linear infinite" : "none",
              boxShadow: `0 0 14px ${playerCor || "#f5c518"}70`,
              border: `2px solid ${playerCor || "#f5c518"}60`,
            }}
          >
            <img
              src={formatImageUrl(currentSong.capaUrl, `${import.meta.env.BASE_URL}images/default-cover.png`)}
              alt={currentSong.titulo}
              className="w-full h-full object-cover"
            />
          </div>
          {/* Center hole */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-2.5 h-2.5 rounded-full bg-[#2a2a2a] border border-white/20" />
          </div>
        </div>

        {/* Song info */}
        <div className="flex-1 min-w-0 hidden sm:block">
          <h4 className="font-bold text-white truncate text-sm" style={{ fontFamily: "monospace" }}>
            {currentSong.titulo}
          </h4>
          <p className="text-white/50 text-xs truncate">{currentSong.compositor || "Artista"}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-white/40 font-mono hidden sm:block">{formatTime(progress)}</span>
          <button
            onClick={togglePlay}
            className="w-11 h-11 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all border-2 border-white/10"
            style={{ background: accent, boxShadow: `0 0 20px ${playerCor || "#f5c518"}60` }}
          >
            {isPlaying
              ? <Pause className="w-5 h-5 text-black fill-black" />
              : <Play  className="w-5 h-5 text-black fill-black ml-0.5" />}
          </button>
          <span className="text-xs text-white/40 font-mono hidden sm:block">{formatTime(duration)}</span>
        </div>

        {/* Volume */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <button onClick={() => setVolume(volume === 0 ? 1 : 0)} className="text-white/40 hover:text-white transition-colors">
            {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden relative">
            <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${volume * 100}%`, background: accent }} />
            <input type="range" min={0} max={1} step={0.01} value={volume}
              onChange={e => setVolume(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer" />
          </div>
        </div>
      </div>

      {/* Mobile: song name + time */}
      <div className="sm:hidden flex items-center justify-center gap-2 mt-1.5">
        <span className="text-[10px] text-white/60 font-mono truncate max-w-[180px]">{currentSong.titulo}</span>
        <span className="text-[10px] text-white/30 font-mono">
          {formatTime(progress)} / {formatTime(duration)}
        </span>
      </div>
    </motion.div>
  );
}

export function AudioPlayerByStyle({ style }: { style: PlayerStyle }) {
  switch (style) {
    case "minimalista": return <PlayerMinimalista />;
    case "lista": return <PlayerLista />;
    case "waveform": return <PlayerWaveform />;
    case "moderno": return <PlayerModerno />;
    case "vintage": return <PlayerVintage />;
    case "ipod": return <PlayerIpod />;
    default: return <PlayerPadrao />;
  }
}