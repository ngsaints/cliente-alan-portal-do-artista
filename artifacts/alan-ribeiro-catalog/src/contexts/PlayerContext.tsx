import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { type Song } from "@workspace/api-client-react";

interface PlaylistInfo {
  id: number;
  nome: string;
  songs: Song[];
}

export type CardStyle = "default" | "ipod";

interface PlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  playerGradient: string | null;
  playerCor: string | null;
  playerStyle: PlayerStyle;
  cardStyle: CardStyle;
  setCardStyle: (style: CardStyle) => void;
  cardMode: boolean;
  setCardMode: (v: boolean) => void;
  playSong: (song: Song, playlist?: Song[], playlistsQueue?: PlaylistInfo[], currentPlaylistIdx?: number) => void;
  setPlayerColors: (gradient: string | null, cor: string | null) => void;
  setPlayerStyle: (style: PlayerStyle) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  setAutoPlayPlaylist: (enabled: boolean) => void;
  setCurrentSong: (song: Song | null) => void;
  setIsPlaying: (playing: boolean) => void;
  autoPlayPlaylist: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

export type PlayerStyle = "padrao" | "minimalista" | "lista" | "waveform" | "moderno" | "vintage" | "ipod";

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [autoPlayPlaylist, setAutoPlayPlaylistState] = useState(false);
  const [playerGradient, setPlayerGradient] = useState<string | null>(null);
  const [playerCor, setPlayerCor] = useState<string | null>(null);
  const [playerStyle, setPlayerStyle] = useState<PlayerStyle>("padrao");
  const [cardStyle, setCardStyleState] = useState<CardStyle>("default");
  const [cardMode, setCardMode] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const setCardStyle = (style: CardStyle) => setCardStyleState(style);

  // Playlist state
  const playlistRef = useRef<Song[]>([]);
  const playlistIndexRef = useRef(0);
  const playlistsQueueRef = useRef<PlaylistInfo[]>([]);
  const currentPlaylistIdxRef = useRef(0);

  const playSong = (song: Song, playlist?: Song[], playlistsQueue?: PlaylistInfo[], currentPlaylistIdx?: number) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      // Store playlist info
      if (playlist) {
        playlistRef.current = playlist;
        playlistIndexRef.current = playlist.findIndex(s => s.id === song.id);
      }
      if (playlistsQueue) {
        playlistsQueueRef.current = playlistsQueue;
        currentPlaylistIdxRef.current = currentPlaylistIdx ?? 0;
      }
      setCurrentSong(song);
      setIsPlaying(true);
      fetch(`/api/songs/${song.id}/play`, { method: 'POST' }).catch(() => {});
    }
  };

  const playNextInPlaylist = () => {
    // Try next song in current playlist
    if (playlistRef.current.length > 0) {
      const nextIndex = playlistIndexRef.current + 1;
      if (nextIndex < playlistRef.current.length) {
        const nextSong = playlistRef.current[nextIndex];
        playlistIndexRef.current = nextIndex;
        setCurrentSong(nextSong);
        setIsPlaying(true);
        fetch(`/api/songs/${nextSong.id}/play`, { method: 'POST' }).catch(() => {});
        return;
      }
    }
    
    // Try next playlist
    if (playlistsQueueRef.current.length > 0) {
      const nextPlaylistIdx = currentPlaylistIdxRef.current + 1;
      if (nextPlaylistIdx < playlistsQueueRef.current.length) {
        const nextPlaylist = playlistsQueueRef.current[nextPlaylistIdx];
        currentPlaylistIdxRef.current = nextPlaylistIdx;
        if (nextPlaylist.songs.length > 0) {
          playlistRef.current = nextPlaylist.songs;
          playlistIndexRef.current = 0;
          const nextSong = nextPlaylist.songs[0];
          setCurrentSong(nextSong);
          setIsPlaying(true);
          fetch(`/api/songs/${nextSong.id}/play`, { method: 'POST' }).catch(() => {});
          return;
        }
      }
    }
    
    // No more songs/playlists
    setIsPlaying(false);
  };

  const setAutoPlayPlaylist = (enabled: boolean) => {
    setAutoPlayPlaylistStateState(enabled);
  };

  const setAutoPlayPlaylistStateState = (enabled: boolean) => {
    setAutoPlayPlaylistState(enabled);
    localStorage.setItem('autoPlayPlaylist', String(enabled));
  };

  const setPlayerColors = (gradient: string | null, cor: string | null) => {
    setPlayerGradient(gradient);
    setPlayerCor(cor);
  };

  const setPlayerStyleFn = (style: PlayerStyle) => {
    setPlayerStyle(style);
  };

  // Load autoPlay setting from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('autoPlayPlaylist');
    if (saved === 'true') {
      setAutoPlayPlaylistState(true);
    }
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Playback failed", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const setVolume = (vol: number) => {
    if (audioRef.current) {
      audioRef.current.volume = vol;
      setVolumeState(vol);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => setProgress(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (autoPlayPlaylist) {
        playNextInPlaylist();
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [currentSong, autoPlayPlaylist]);

  useEffect(() => {
    if (currentSong && isPlaying && audioRef.current) {
      audioRef.current.play().catch(e => {
        console.error("Playback failed:", e);
        setIsPlaying(false);
      });
    }
  }, [currentSong]);

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        progress,
        duration,
        volume,
        playerGradient,
        playerCor,
        playerStyle,
        cardStyle,
        setCardStyle,
        cardMode,
        setCardMode,
        playSong,
        setPlayerColors,
        setPlayerStyle: setPlayerStyleFn,
        togglePlay,
        seek,
        setVolume,
        setAutoPlayPlaylist,
        setCurrentSong,
        setIsPlaying,
        autoPlayPlaylist,
        audioRef,
      }}
    >
      {children}
      <audio 
        ref={audioRef} 
        src={currentSong?.mp3Url || undefined} 
        preload="metadata"
      />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}
