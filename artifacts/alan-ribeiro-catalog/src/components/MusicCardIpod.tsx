import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Heart, PlayCircle, Youtube, ExternalLink, Music } from "lucide-react";
import { type Song } from "@workspace/api-client-react";
import { usePlayer } from "@/contexts/PlayerContext";

interface MusicCardIpodProps {
  song: Song;
  index: number;
}

function formatTime(sec: number) {
  if (!isFinite(sec) || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
  );
  return m ? m[1] : null;
}

export function MusicCardIpod({ song, index }: MusicCardIpodProps) {
  const {
    currentSong, isPlaying, playSong, togglePlay,
    progress, duration, seek,
    playerGradient, playerCor,
    setCardMode,
  } = usePlayer();

  const isThisSong   = currentSong?.id === song.id;
  const isThisPlaying = isThisSong && isPlaying;

  const disponivel = !song.status || song.status === "Disponível";
  const isVideo    = song.tipoMidia === "video";
  const youtubeId  = extractYouTubeId(song.youtubeUrl || "");

  const accent = playerGradient || playerCor || "#f5c518";
  const pct    = isThisSong && duration ? (progress / duration) * 100 : 0;

  // ── IntersectionObserver: card in view + playing → cardMode = true ──
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (isThisSong) {
          // If this card's song is active and card enters view → hide global player
          setCardMode(entry.isIntersecting);
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isThisSong, setCardMode]);

  // When this card stops being the active song, release cardMode
  useEffect(() => {
    if (!isThisSong) {
      // Only reset if we were the ones setting it
      setCardMode(false);
    }
  }, [isThisSong, setCardMode]);

  const handlePlay = () => {
    if (isThisSong) {
      togglePlay();
    } else {
      playSong(song);
    }
  };

  const handleInterest = () => {
    const event = new CustomEvent("openInterest", { detail: { song }, bubbles: true });
    document.dispatchEvent(event);
  };

  // ─── iPod body colours ───────────────────────────────────────────────────
  const bodyGrad  = "linear-gradient(145deg, #2d2d2d 0%, #1a1a1a 60%, #111 100%)";
  const screenBg  = "linear-gradient(180deg, #0a0a0a 0%, #111 100%)";
  const wheelBg   = "radial-gradient(circle at center, #333 0%, #222 60%, #1a1a1a 100%)";

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: "easeOut" }}
      className="group relative flex flex-col"
      style={{ fontFamily: "inherit" }}
    >
      {/* ── iPod body ─────────────────────────────────────────────────────── */}
      <div
        className="relative rounded-[28px] p-3 shadow-2xl transition-all duration-300 hover:-translate-y-1"
        style={{
          background: bodyGrad,
          boxShadow: isThisPlaying
            ? `0 20px 60px ${playerCor || "#f5c518"}50, 0 4px 20px rgba(0,0,0,0.8)`
            : "0 12px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)",
          border: isThisPlaying
            ? `1.5px solid ${playerCor || "#f5c518"}60`
            : "1.5px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* ── Screen ────────────────────────────────────────────────────── */}
        <div
          className="relative rounded-2xl overflow-hidden mb-3"
          style={{ background: screenBg, aspectRatio: "1/1" }}
        >
          {/* Status bar */}
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 pt-2 pb-1"
            style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)" }}
          >
            <div className="flex items-center gap-1.5">
              {isVideo
                ? <Youtube className="w-3 h-3 text-red-400" />
                : <Music className="w-3 h-3" style={{ color: accent }} />}
              <span className="text-[10px] font-medium text-white/70">
                {song.genero}{song.subgenero ? ` · ${song.subgenero}` : ""}
              </span>
            </div>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
              disponivel ? "bg-green-500/30 text-green-400" : "bg-red-500/30 text-red-400"
            }`}>
              {disponivel ? "Disponível" : "Reservado"}
            </span>
          </div>

          {/* Album art — spins when playing */}
          <div className="relative w-full h-full flex items-center justify-center">
            <div
              className="w-3/4 h-3/4 rounded-full overflow-hidden shadow-xl transition-all duration-700"
              style={{
                animation: isThisPlaying ? "spin 6s linear infinite" : "none",
                boxShadow: isThisPlaying
                  ? `0 0 30px ${playerCor || "#f5c518"}80, 0 0 60px ${playerCor || "#f5c518"}30`
                  : "0 4px 20px rgba(0,0,0,0.6)",
                border: `3px solid ${isThisPlaying ? (playerCor || "#f5c518") : "rgba(255,255,255,0.1)"}`,
              }}
            >
              <img
                src={song.capaUrl || `${import.meta.env.BASE_URL}images/default-cover.png`}
                alt={song.titulo}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Center hole */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="w-5 h-5 rounded-full border-2 border-white/10"
                style={{ background: screenBg }}
              />
            </div>

            {/* Play overlay (only when not playing this song) */}
            {!isThisPlaying && !isVideo && (
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: "rgba(0,0,0,0.5)" }}
              >
                <button
                  onClick={handlePlay}
                  className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xl"
                  style={{ background: accent, boxShadow: `0 0 30px ${accent}80` }}
                >
                  <Play className="w-6 h-6 text-black fill-black ml-0.5" />
                </button>
              </div>
            )}

            {/* YouTube video overlay */}
            {isVideo && youtubeId && (
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: "rgba(0,0,0,0.5)" }}
              >
                <button
                  onClick={() => window.open(song.youtubeUrl || "", "_blank", "noopener,noreferrer")}
                  className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xl"
                >
                  <ExternalLink className="w-6 h-6 text-white" />
                </button>
              </div>
            )}
          </div>

          {/* Progress bar on screen bottom */}
          {isThisSong && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${pct}%`, background: accent }}
              />
              <input
                type="range" min={0} max={duration || 100} value={progress}
                onChange={e => seek(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          )}

          {/* Time display */}
          {isThisSong && (
            <div className="absolute bottom-2 left-0 right-0 flex items-center justify-between px-3 pointer-events-none">
              <span className="text-[9px] text-white/50 font-mono">{formatTime(progress)}</span>
              <span className="text-[9px] text-white/50 font-mono">{formatTime(duration)}</span>
            </div>
          )}
        </div>

        {/* ── Track info (LCD style) ─────────────────────────────────── */}
        <div
          className="rounded-xl px-3 py-2 mb-3 text-center"
          style={{
            background: "rgba(0,0,0,0.5)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p
            className="font-bold text-sm leading-tight truncate mb-0.5"
            style={{ color: accent, fontFamily: "monospace", textShadow: `0 0 8px ${accent}60` }}
          >
            {song.titulo}
          </p>
          <p className="text-[10px] text-white/40 truncate font-mono">
            {song.genero}{song.compositor ? ` · ${song.compositor}` : ""}
          </p>
        </div>

        {/* ── Click Wheel ────────────────────────────────────────────── */}
        <div className="flex flex-col items-center mb-3">
          {/* Outer ring */}
          <div
            className="relative w-28 h-28 rounded-full flex items-center justify-center"
            style={{
              background: wheelBg,
              boxShadow: "0 4px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {/* Top — Menu / stats */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-white/30">
                <PlayCircle className="w-3 h-3" />
                <span className="text-[9px] font-mono">{Number(song.plays || 0).toLocaleString("pt-BR")}</span>
                <Heart className="w-3 h-3" />
                <span className="text-[9px] font-mono">{Number(song.likes || 0).toLocaleString("pt-BR")}</span>
              </div>
            </div>

            {/* Left — prev (skip back visual) */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 text-white/20">
              <span className="text-[10px] font-bold">◄◄</span>
            </div>

            {/* Right — next (skip fwd visual) */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20">
              <span className="text-[10px] font-bold">►►</span>
            </div>

            {/* Bottom — like button */}
            <button
              className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/30 hover:text-red-400 transition-colors"
              onClick={e => {
                e.stopPropagation();
                fetch(`/api/songs/${song.id}/like`, { method: "POST" }).catch(() => {});
              }}
              title="Curtir"
            >
              <Heart className="w-3.5 h-3.5" />
            </button>

            {/* Center play button */}
            <button
              onClick={handlePlay}
              className="w-12 h-12 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
              style={{
                background: isThisPlaying
                  ? `radial-gradient(circle, ${accent}, ${accent}cc)`
                  : "radial-gradient(circle, #444, #222)",
                boxShadow: isThisPlaying
                  ? `0 0 16px ${accent}80, inset 0 1px 0 rgba(255,255,255,0.2)`
                  : "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.4)",
                border: `1.5px solid ${isThisPlaying ? accent + "80" : "rgba(255,255,255,0.12)"}`,
              }}
            >
              {isThisPlaying
                ? <Pause className="w-5 h-5 text-black fill-black" />
                : <Play  className="w-5 h-5 fill-current ml-0.5" style={{ color: accent }} />}
            </button>
          </div>
        </div>

        {/* ── Bottom actions ─────────────────────────────────────────── */}
        <button
          onClick={handleInterest}
          className="w-full py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90 active:scale-[0.98]"
          style={{
            background: accent,
            color: "#000",
            boxShadow: `0 4px 12px ${accent}50`,
          }}
        >
          Tenho Interesse
        </button>
      </div>
    </motion.div>
  );
}
