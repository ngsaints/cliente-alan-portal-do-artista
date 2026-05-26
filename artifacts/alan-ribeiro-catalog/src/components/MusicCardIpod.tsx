import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Youtube, ExternalLink, Music } from "lucide-react";
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

  // ── IntersectionObserver: card in view ──
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
        className="relative rounded-[24px] p-4 flex flex-col transition-all duration-300 hover:-translate-y-1 bg-[#1a1a1a]/95 border-2"
        style={{
          borderColor: isThisPlaying ? accent : "rgba(255, 255, 255, 0.08)",
          boxShadow: isThisPlaying
            ? `0 20px 40px ${accent}25, 0 4px 20px rgba(0,0,0,0.6)`
            : "0 10px 30px rgba(0,0,0,0.5)",
        }}
      >
        {/* Cover Container */}
        <div className="relative aspect-square w-full rounded-2xl overflow-hidden mb-4 bg-black/40 border border-white/5 shadow-md">
          <img
            src={song.capaUrl || `${import.meta.env.BASE_URL}images/default-cover.png`}
            alt={song.titulo}
            className="w-full h-full object-cover"
          />

          {/* Badges Overlayed on Top of the Cover */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-1 bg-[#121212]/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
              {isVideo ? (
                <Youtube className="w-3.5 h-3.5 text-red-500" />
              ) : (
                <Music className="w-3.5 h-3.5" style={{ color: accent }} />
              )}
              <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider">
                {song.genero}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#121212]/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
              <span className={`w-2 h-2 rounded-full ${disponivel ? "bg-emerald-500" : "bg-rose-500"}`} />
              <span className="text-[10px] font-bold text-white/90">
                {disponivel ? "Disponível" : "Reservado"}
              </span>
            </div>
          </div>

          {/* Play/External Overlay */}
          {!isThisPlaying && !isVideo && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <button
                onClick={handlePlay}
                className="w-16 h-16 rounded-full flex items-center justify-center bg-black/75 hover:scale-105 active:scale-95 transition-all shadow-2xl"
                style={{ border: `2px solid ${accent}` }}
              >
                <Play className="w-7 h-7 ml-1" style={{ color: accent, fill: accent }} />
              </button>
            </div>
          )}

          {isVideo && youtubeId && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <button
                onClick={() => window.open(song.youtubeUrl || "", "_blank", "noopener,noreferrer")}
                className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl"
              >
                <ExternalLink className="w-6 h-6 text-white" />
              </button>
            </div>
          )}
        </div>

        {/* Title & Info Block */}
        <div className="flex items-center justify-between mb-3 min-w-0">
          <div className="min-w-0 flex-1 pr-2">
            <h3 className="font-bold text-lg text-white truncate leading-tight tracking-tight">
              {song.titulo}
            </h3>
            <p className="text-sm text-white/50 truncate font-medium mt-0.5">
              {song.compositor || song.subgenero || "-"}
            </p>
          </div>
          <button
            onClick={handleInterest}
            className="shrink-0 text-xs font-bold px-3.5 py-1.5 rounded-full transition-all hover:scale-102 active:scale-98 shadow-sm"
            style={{ background: accent, color: "#121212" }}
          >
            Tenho Interesse
          </button>
        </div>

        {/* Linear Progress Bar */}
        <div className="space-y-1.5 mb-5">
          <div className="relative w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
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
          <div className="flex items-center justify-between text-[11px] text-white/40 font-mono tracking-tight">
            <span>{isThisSong ? formatTime(progress) : "0:00"}</span>
            <span>{isThisSong ? formatTime(duration) : formatTime(Number(song.duracao) || 208)}</span>
          </div>
        </div>

        {/* Click Wheel Section */}
        <div className="flex justify-center mb-2">
          <div
            className="relative w-36 h-36 rounded-full bg-[#202020] border border-white/10 flex items-center justify-center shadow-2xl"
            style={{
              boxShadow: "inset 0 4px 12px rgba(0,0,0,0.8), 0 4px 10px rgba(0,0,0,0.5)"
            }}
          >
            {/* Click Wheel Labels */}
            <span className="absolute top-3 text-[10px] font-black text-white/40 tracking-widest cursor-pointer select-none hover:text-white/60">
              MENU
            </span>
            <span className="absolute left-3.5 text-[10px] font-bold text-white/40 cursor-pointer select-none hover:text-white/60">
              ◄◄
            </span>
            <span className="absolute right-3.5 text-[10px] font-bold text-white/40 cursor-pointer select-none hover:text-white/60">
              ►►
            </span>
            <span className="absolute bottom-3 text-[10px] font-bold text-white/40 cursor-pointer select-none hover:text-white/60 flex items-center gap-0.5">
              ►║
            </span>

            {/* Click Wheel Center Action Button */}
            <button
              onClick={handlePlay}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl"
              style={{
                background: isThisPlaying ? accent : "#161616",
                border: isThisPlaying ? "none" : "1.5px solid rgba(255,255,255,0.08)",
                boxShadow: isThisPlaying ? `0 0 15px ${accent}60` : "none"
              }}
            >
              {isThisPlaying ? (
                <Pause className="w-5 h-5 text-[#121212] fill-[#121212]" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" style={{ color: accent, fill: accent }} />
              )}
            </button>
          </div>
        </div>

        {/* Minimal Footer Play Indicator / Control */}
        <button
          onClick={handlePlay}
          className="w-full mt-3 py-2 rounded-xl text-xs font-bold text-center border transition-all hover:bg-white/5 active:scale-[0.98] sm:hidden"
          style={{ borderColor: accent, color: accent }}
        >
          {isThisPlaying ? "Pausar" : "Tocar Música"}
        </button>
      </div>
    </motion.div>
  );
}
