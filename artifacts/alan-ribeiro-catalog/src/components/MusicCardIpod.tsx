import { useRef, useEffect, useState } from "react";
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

  const [videoPlaying, setVideoPlaying] = useState(false);
  const [embedError, setEmbedError] = useState(false);
  const videoRef = useRef<HTMLIFrameElement>(null);

  const accent = playerGradient || playerCor || "#f5c518";
  const pct    = isThisSong && duration ? (progress / duration) * 100 : 0;

  // Reset video state when song changes
  useEffect(() => {
    setVideoPlaying(false);
    setEmbedError(false);
  }, [song.id]);

  // Detect YouTube embed errors via postMessage
  useEffect(() => {
    if (!videoPlaying) { setEmbedError(false); return; }
    const handler = (e: MessageEvent) => {
      if (e.origin !== "https://www.youtube.com") return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.event === "onError" && (data?.info === 101 || data?.info === 150)) {
          setEmbedError(true);
        }
      } catch {}
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [videoPlaying]);

  // ── IntersectionObserver: card in view ──
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (isThisSong) setCardMode(entry.isIntersecting); },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isThisSong, setCardMode]);

  useEffect(() => { if (!isThisSong) setCardMode(false); }, [isThisSong, setCardMode]);

  const handlePlayVideo = () => setVideoPlaying(true);
  const handleStopVideo = () => { setVideoPlaying(false); setEmbedError(false); };
  const handleOpenYoutube = () => {
    if (song.youtubeUrl) window.open(song.youtubeUrl, "_blank", "noopener,noreferrer");
  };

  const handlePlay = () => {
    if (isVideo) {
      handlePlayVideo();
      return;
    }
    if (isThisSong) { togglePlay(); } else { playSong(song); }
  };

  const handleCoverClick = () => {
    if (isVideo && youtubeId) {
      handlePlayVideo();
    } else {
      handlePlay();
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
          {isVideo && youtubeId && videoPlaying ? (
            embedError ? (
              /* Fallback: embed blocked */
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black gap-3 p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-red-600/20 flex items-center justify-center">
                  <Youtube className="w-6 h-6 text-red-500" />
                </div>
                <p className="text-white font-semibold text-xs">Incorporação não permitida</p>
                <p className="text-white/40 text-[10px]">O dono desativou a reprodução externa.</p>
                <button onClick={handleOpenYoutube}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 text-xs">
                  <Youtube className="w-3.5 h-3.5" /> Abrir no YouTube
                </button>
                <button onClick={handleStopVideo} className="text-white/30 text-xs hover:text-white/60">
                  Fechar
                </button>
              </div>
            ) : (
              /* Inline YouTube embed */
              <>
                <iframe
                  ref={videoRef}
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={song.titulo}
                />
                <button onClick={handleStopVideo}
                  className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors">
                  <Pause className="w-4 h-4" />
                </button>
              </>
            )
          ) : (
            /* Cover / Thumbnail */
            <>
              <img
                src={
                  isVideo && youtubeId
                    ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
                    : (song.capaUrl || `${import.meta.env.BASE_URL}images/default-cover.png`)
                }
                alt={song.titulo}
                className="w-full h-full object-cover cursor-pointer"
                onClick={isVideo && youtubeId ? handlePlayVideo : undefined}
              />
              {/* Play overlay on hover (desktop) */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                <span className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl ${isVideo && youtubeId ? "bg-red-600" : ""}`}
                  style={isVideo && youtubeId ? {} : { border: `2px solid ${accent}` }}>
                  {isVideo && youtubeId ? (
                    <Play className="w-7 h-7 ml-1 text-white fill-white" />
                  ) : (
                    <Play className="w-7 h-7 ml-1" style={{ color: accent, fill: accent }} />
                  )}
                </span>
              </div>
            </>
          )}

          {/* Badges Overlayed on Top of the Cover */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none" style={{ zIndex: 1 }}>
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
            style={{ boxShadow: "inset 0 4px 12px rgba(0,0,0,0.8), 0 4px 10px rgba(0,0,0,0.5)" }}
          >
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
              onClick={isVideo && youtubeId ? handleCoverClick : handlePlay}
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

        {/* Mobile footer button */}
        <button
          onClick={isVideo && youtubeId ? handleCoverClick : handlePlay}
          className="w-full mt-3 py-2 rounded-xl text-xs font-bold text-center border transition-all hover:bg-white/5 active:scale-[0.98] sm:hidden"
          style={{ borderColor: accent, color: accent }}
        >
          {isVideo ? (videoPlaying && !embedError ? "Reproduzindo..." : "▶ Assistir") : (isThisPlaying ? "Pausar" : "Tocar Música")}
        </button>
      </div>
    </motion.div>
  );
}
