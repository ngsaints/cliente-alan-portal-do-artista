import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { SongItem } from '../types/music';
import { getFavorites, toggleFavorite as dbToggleFavorite } from '../services/db';
import { reportPlay, likeRemote, songShareUrl } from '../services/portalApi';

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
  shareSong: (song: SongItem) => Promise<boolean>;
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

  const playSong = useCallback((song: SongItem, newQueue?: SongItem[]) => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    if (newQueue && newQueue.length > 0) {
      setQueue(newQueue);
    } else if (!queue.some(s => s.id === song.id)) {
      setQueue(prev => [...prev, song]);
    }

    if (currentSong?.id === song.id) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play()
          .then(() => setIsPlaying(true))
          .catch(err => console.error('Erro ao dar play:', err));
      }
      return;
    }

    setCurrentSong(song);
    const playable =
      song.fileBlob instanceof Blob ? URL.createObjectURL(song.fileBlob) : song.audioUrl;
    audio.src = playable;
    audio.volume = isMuted ? 0 : volume;
    audio.play()
      .then(() => {
        setIsPlaying(true);
        reportPlay(song.id);
      })
      .catch(err => {
        console.error('Erro ao iniciar áudio:', err);
        setIsPlaying(false);
      });

    if ('mediaSession' in navigator && song) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: song.titulo,
          artist: song.artista,
          album: song.genero || 'Portal do Artista',
          artwork: song.capaUrl
            ? [{ src: song.capaUrl, sizes: '512x512', type: 'image/jpeg' }]
            : [],
        });
      } catch {
        // MediaSession opcional
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, currentSong, isPlaying, isMuted, volume]);

  const togglePlay = () => {
    if (!audioRef.current || !currentSong) return;
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play()
        .then(() => {
          setIsPlaying(true);
          reportPlay(currentSong.id);
        })
        .catch(err => console.error('Erro ao dar play:', err));
    }
  };

  // Controles de mídia do sistema (tela de bloqueio / fones / PWA)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.setActionHandler('play', () => togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => togglePlay());
      navigator.mediaSession.setActionHandler('previoustrack', () => prevSong());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextSong());
    } catch {
      // alguns browsers não suportam todos os handlers
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, queue, currentSong]);

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
      likeRemote(songId);
    } else {
      setFavorites(prev => prev.filter(id => id !== songId));
    }
  };

  const shareSong = async (song: SongItem): Promise<boolean> => {
    const url = songShareUrl(song);
    const text = `${song.titulo} — ${song.artista} no Portal do Artista`;
    try {
      if (navigator.share) {
        await navigator.share({ title: song.titulo, text, url });
        return true;
      }
    } catch {
      return false;
    }
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
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
        shareSong,
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
