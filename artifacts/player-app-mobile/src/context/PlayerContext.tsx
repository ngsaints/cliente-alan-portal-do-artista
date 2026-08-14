import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { SongItem } from '../types/music';
import { getFavorites, toggleFavorite as dbToggleFavorite } from '../services/db';

interface PlayerContextType {
  currentSong: SongItem | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'none' | 'all' | 'one';
  queue: SongItem[];
  favorites: string[];
  isFullPlayerOpen: boolean;
  
  playSong: (song: SongItem, newQueue?: SongItem[]) => void;
  togglePlay: () => void;
  nextSong: () => void;
  prevSong: () => void;
  seek: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeatMode: () => void;
  toggleLike: (songId: string) => Promise<void>;
  setIsFullPlayerOpen: (open: boolean) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSong, setCurrentSong] = useState<SongItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'all' | 'one'>('none');
  const [queue, setQueue] = useState<SongItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setProgress(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(console.error);
      } else {
        nextSong();
      }
    };

    const onError = (e: Event) => {
      console.error('Erro de reprodução no player:', e);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    // Load initial favorites from IndexedDB
    getFavorites().then(setFavorites).catch(console.error);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [repeatMode]);

  const playSong = (song: SongItem, newQueue?: SongItem[]) => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    if (newQueue && newQueue.length > 0) {
      setQueue(newQueue);
    } else if (!queue.some(s => s.id === song.id)) {
      setQueue(prev => [...prev, song]);
    }

    if (currentSong?.id === song.id) {
      togglePlay();
      return;
    }

    setCurrentSong(song);
    audio.src = song.audioUrl;
    audio.volume = isMuted ? 0 : volume;
    audio.play()
      .then(() => setIsPlaying(true))
      .catch(err => {
        console.error('Erro ao iniciar áudio:', err);
        setIsPlaying(false);
      });
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentSong) return;
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error('Erro ao dar play:', err));
    }
  };

  const nextSong = () => {
    if (queue.length === 0 || !currentSong) return;
    let nextIndex = queue.findIndex(s => s.id === currentSong.id) + 1;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        setIsPlaying(false);
        return;
      }
    }
    const next = queue[nextIndex];
    if (next) playSong(next);
  };

  const prevSong = () => {
    if (queue.length === 0 || !currentSong) return;
    let prevIndex = queue.findIndex(s => s.id === currentSong.id) - 1;
    if (prevIndex < 0) {
      prevIndex = queue.length - 1;
    }
    const prev = queue[prevIndex];
    if (prev) playSong(prev);
  };

  const seek = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setProgress(seconds);
    }
  };

  const setVolume = (vol: number) => {
    setVolumeState(vol);
    setIsMuted(vol === 0);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume || 0.8;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const toggleShuffle = () => setIsShuffle(prev => !prev);

  const toggleRepeatMode = () => {
    setRepeatMode(prev => (prev === 'none' ? 'all' : prev === 'all' ? 'one' : 'none'));
  };

  const toggleLike = async (songId: string) => {
    const isLiked = await dbToggleFavorite(songId);
    if (isLiked) {
      setFavorites(prev => [...prev, songId]);
    } else {
      setFavorites(prev => prev.filter(id => id !== songId));
    }
  };

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        progress,
        duration,
        volume,
        isMuted,
        isShuffle,
        repeatMode,
        queue,
        favorites,
        isFullPlayerOpen,
        playSong,
        togglePlay,
        nextSong,
        prevSong,
        seek,
        setVolume,
        toggleMute,
        toggleShuffle,
        toggleRepeatMode,
        toggleLike,
        setIsFullPlayerOpen,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer deve ser usado dentro de um PlayerProvider');
  }
  return context;
};
