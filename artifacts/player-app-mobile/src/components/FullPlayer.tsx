import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Heart,
  Volume2,
  VolumeX,
  Share2,
  Smartphone,
  Music,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

function formatTime(seconds: number) {
  if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const FullPlayer: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    togglePlay,
    nextSong,
    prevSong,
    progress,
    duration,
    seek,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    isShuffle,
    toggleShuffle,
    repeatMode,
    toggleRepeatMode,
    favorites,
    toggleLike,
    isFullPlayerOpen,
    setIsFullPlayerOpen,
  } = usePlayer();

  if (!isFullPlayerOpen || !currentSong) return null;

  const isLiked = favorites.includes(currentSong.id);
  const pct = duration ? (progress / duration) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col justify-between p-6 overflow-y-auto max-w-lg mx-auto select-none"
      >
        {/* Ambient Blurred Background Glow */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none blur-3xl scale-125"
          style={{
            backgroundImage: `url(${currentSong.capaUrl || '/images/default-cover.png'})`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
        />

        {/* Top Header Bar */}
        <div className="relative z-10 flex items-center justify-between pt-2">
          <button
            onClick={() => setIsFullPlayerOpen(false)}
            className="p-2 rounded-full bg-white/5 text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
          <div className="text-center">
            <span className="text-[10px] font-extrabold tracking-widest text-[#f5c518] uppercase">
              TOCANDO AGORA
            </span>
            <p className="text-xs text-white/50 font-medium">
              {currentSong.isLocal ? 'Música do Seu Aparelho' : 'Portal do Artista'}
            </p>
          </div>
          <button
            onClick={() => toggleLike(currentSong.id)}
            className="p-2 rounded-full bg-white/5 text-white/70 hover:text-[#f5c518] transition-colors cursor-pointer"
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-[#f5c518] text-[#f5c518]' : ''}`} />
          </button>
        </div>

        {/* Main Artwork Showcase */}
        <div className="relative z-10 my-auto py-6 flex flex-col items-center">
          <div
            className={`relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(245,197,24,0.25)] border-2 border-white/10 ${
              isPlaying ? 'scale-105 transition-transform duration-500' : 'scale-100'
            }`}
          >
            <img
              src={currentSong.capaUrl || '/images/default-cover.png'}
              alt={currentSong.titulo}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';
              }}
            />
            {/* Spinning vinyl center effect */}
            <div
              className={`absolute inset-0 rounded-full border-4 border-white/10 pointer-events-none ${
                isPlaying ? 'animate-spin-slow' : ''
              }`}
              style={{ margin: '15%' }}
            >
              <div className="w-full h-full rounded-full border border-white/20 bg-black/40 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-[#f5c518] border border-black" />
              </div>
            </div>
          </div>

          {/* Title & Artist Info */}
          <div className="mt-8 text-center w-full px-4">
            <h2 className="text-2xl font-black text-white tracking-tight leading-tight truncate">
              {currentSong.titulo}
            </h2>
            <p className="text-sm font-semibold text-[#f5c518] mt-1 truncate">
              {currentSong.artista}
            </p>
            {currentSong.compositor && (
              <p className="text-xs text-white/40 mt-1">
                Composição: {currentSong.compositor}
              </p>
            )}
          </div>
        </div>

        {/* Progress Bar & Timing Controls */}
        <div className="relative z-10 space-y-2 mb-4">
          <div className="relative w-full h-2 bg-white/10 rounded-full cursor-pointer group">
            <div
              className="h-full bg-[#f5c518] rounded-full transition-all duration-150 relative"
              style={{ width: `${pct}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-[#f5c518] scale-100 group-hover:scale-125 transition-transform" />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={progress}
              onChange={(e) => seek(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <div className="flex items-center justify-between text-xs font-mono text-white/50">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main Audio Controls */}
        <div className="relative z-10 flex items-center justify-between mb-6">
          <button
            onClick={toggleShuffle}
            className={`p-3 rounded-full transition-colors cursor-pointer ${
              isShuffle ? 'text-[#f5c518] bg-[#f5c518]/10' : 'text-white/40 hover:text-white'
            }`}
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <button
            onClick={prevSong}
            className="p-3 rounded-full text-white/80 hover:text-white transition-colors cursor-pointer hover:bg-white/5"
          >
            <SkipBack className="w-7 h-7 fill-current" />
          </button>

          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-[#f5c518] text-black flex items-center justify-center shadow-[0_0_30px_rgba(245,197,24,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 fill-current" />
            ) : (
              <Play className="w-8 h-8 fill-current ml-1" />
            )}
          </button>

          <button
            onClick={nextSong}
            className="p-3 rounded-full text-white/80 hover:text-white transition-colors cursor-pointer hover:bg-white/5"
          >
            <SkipForward className="w-7 h-7 fill-current" />
          </button>

          <button
            onClick={toggleRepeatMode}
            className={`p-3 rounded-full transition-colors cursor-pointer relative ${
              repeatMode !== 'none' ? 'text-[#f5c518] bg-[#f5c518]/10' : 'text-white/40 hover:text-white'
            }`}
          >
            <Repeat className="w-5 h-5" />
            {repeatMode === 'one' && (
              <span className="absolute top-2 right-2 text-[9px] font-black bg-[#f5c518] text-black rounded-full px-1">
                1
              </span>
            )}
          </button>
        </div>

        {/* Volume Slider Bar */}
        <div className="relative z-10 flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3 mb-2">
          <button onClick={toggleMute} className="text-white/60 hover:text-white cursor-pointer">
            {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="flex-1 accent-[#f5c518] cursor-pointer"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
