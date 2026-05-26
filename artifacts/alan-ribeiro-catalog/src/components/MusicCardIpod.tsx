import { useRef, useEffect } from "react";
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
          setCardMode(entry.isIntersecting);
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isThisSong, setCardMode]);

  useEffect(() => {
    if (!isThisSong) {
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

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: "easeOut" }}
      className="group relative flex flex-col w-full"
      style={{ fontFamily: "inherit" }}
    >
      {/* iPod Outer Body */}
      <div
        className="relative rounded-[20px] p-4 flex flex-col bg-[#161616] transition-all duration-300 hover:-translate-y-1"
        style={{
          boxShadow: isThisPlaying
            ? `0 15px 40px ${playerCor || "#f5c518"}30, 0 4px 12px rgba(0,0,0,0.5)`
            : "0 10px 25px rgba(0,0,0,0.5)",
          border: isThisPlaying
            ? `1.5px solid ${playerCor || "#f5c518"}80`
            : "1.5px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Top bar (Badge + Status) */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-md">
            {isVideo ? <Youtube className="w-3 h-3 text-red-500" /> : <Music className="w-3 h-3" style={{ color: accent }} />}
            <span className="text-[10px] font-bold text-white/80 uppercase tracking-wide">
              {song.genero}
            </span>
          </div>
          <span className={`text-[10px] font-bold flex items-center gap-1 ${disponivel ? "text-emerald-400" : "text-rose-400"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${disponivel ? "bg-emerald-400" : "bg-rose-400"}`} />
            {disponivel ? "Disponível" : "Reservado"}
          </span>
        </div>

        {/* Square Album Cover */}
        <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 bg-black/40 border border-white/5">
          <img
            src={song.capaUrl || `${import.meta.env.BASE_URL}images/default-cover.png`}
            alt={song.titulo}
            className="w-full h-full object-cover"
          />
          {/* Overlay play button on hover */}
          {!isThisPlaying && !isVideo && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <button
                onClick={handlePlay}
                className="w-14 h-14 rounded-full flex items-center justify-center bg-black/80 hover:scale-105 transition-transform"
                style={{ border: `2px solid ${accent}` }}
              >
                <Play className="w-6 h-6 ml-0.5" style={{ color: accent, fill: accent }} />
              </button>
            </div>
          )}
          {isVideo && youtubeId && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <button
                onClick={() => window.open(song.youtubeUrl || "", "_blank", "noopener,noreferrer")}
                className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center hover:scale-105 transition-transform"
              >
                <ExternalLink className="w-6 h-6 text-white" />
              </button>
            </div>
          )}
        </div>

        {/* Song Info */}
        <div className="mb-2">
          <h3 className="font-bold text-base text-white truncate leading-snug">
            {song.titulo}
          </h3>
          <p className="text-xs text-white/50 truncate font-medium">
            {song.compositor || song.subgenero || "-"}
          </p>
        </div>

        {/* Progress Bar & Time */}
        <div className="space-y-1 mb-4">
          <div className="relative w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full rounded-full transition-all duration-300"
              style={{ width: `${isThisSong ? pct : 0}%`, background: accent }}
            />
            {isThisSong && (
              <input
                type="range" min={0} max={duration || 100} value={progress}
                onChange={e => seek(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            )}
          </div>
          <div className="flex items-center justify-between text-[10px] text-white/40 font-mono">
            <span>{isThisSong ? formatTime(progress) : "0:00"}</span>
            <span>{isThisSong ? formatTime(duration) : formatTime(Number(song.duracao) || 208)}</span>
          </div>
        </div>

        {/* Classical Click Wheel */}
        <div className="flex justify-center mb-4">
          <div
            className="relative w-28 h-28 rounded-full bg-[#202020] border border-white/10 flex items-center justify-center shadow-inner"
            style={{
              boxShadow: "inset 0 2px 8px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.4)"
            }}
          >
            {/* Top MENU */}
            <span className="absolute top-2.5 text-[8px] font-bold text-white/40 tracking-wider">MENU</span>
            
            {/* Left Prev */}
            <span className="absolute left-3 text-[9px] font-bold text-white/40">◄◄</span>
            
            {/* Right Next */}
            <span className="absolute right-3 text-[9px] font-bold text-white/40">►►</span>
            
            {/* Bottom Play/Pause Icon */}
            <span className="absolute bottom-2.5 text-[9px] font-bold text-white/40 flex gap-0.5">►║</span>

            {/* Inner Button */}
            <button
              onClick={handlePlay}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-md"
              style={{
                background: isThisPlaying ? accent : "#161616",
                border: `1.5px solid ${isThisPlaying ? "transparent" : "rgba(255,255,255,0.1)"}`
              }}
            >
              {isThisPlaying
                ? <Pause className="w-4 h-4 text-black fill-black" />
                : <Play className="w-4 h-4 ml-0.5" style={{ color: isThisPlaying ? "#000" : accent, fill: isThisPlaying ? "#000" : accent }} />}
            </button>
          </div>
        </div>

        {/* Action Button & Interest Button */}
        <div className="grid grid-cols-2 gap-2 mt-auto pt-2 border-t border-white/5">
          <button
            onClick={handlePlay}
            className="py-2.5 rounded-lg text-xs font-bold text-center border transition-all hover:bg-white/5 active:scale-[0.98]"
            style={{ borderColor: accent, color: accent }}
          >
            {isThisPlaying ? "Pausar" : "Tocar Música"}
          </button>
          <button
            onClick={handleInterest}
            className="py-2.5 rounded-lg text-xs font-bold text-center transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: accent, color: "#161616" }}
          >
            Tenho Interesse
          </button>
        </div>
      </div>
    </motion.div>
  );
}

