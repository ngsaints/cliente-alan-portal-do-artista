import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tv,
  X,
  Play,
  FileText,
  Video,
  ChevronRight,
  ChevronLeft,
  Volume2,
  VolumeX,
  ExternalLink,
  Sparkles,
  RotateCw,
  Radio,
  Minimize2,
  ListVideo,
} from "lucide-react";

export interface TvEpisode {
  id: number;
  title: string;
  description?: string | null;
  type: "video" | "text";
  videoUrl?: string | null;
  contentText?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  thumbnailUrl?: string | null;
  badge?: string | null;
  active: boolean;
  order: number;
  createdAt: string;
}

interface TvDataResponse {
  enabled: boolean;
  title: string;
  badge: string;
  episodes: TvEpisode[];
}

// Converte links do YouTube para formato embed
function formatVideoEmbedUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // YouTube Shorts
  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/i);
  if (shortsMatch && shortsMatch[1]) {
    return `https://www.youtube.com/embed/${shortsMatch[1]}?autoplay=1&rel=0&modestbranding=1`;
  }

  // YouTube Watch / youtu.be
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0&modestbranding=1`;
  }

  // Vimeo
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/i);
  if (vimeoMatch && vimeoMatch[3]) {
    return `https://player.vimeo.com/video/${vimeoMatch[3]}?autoplay=1`;
  }

  return trimmed;
}

export function PortalRetroTV() {
  const [data, setData] = useState<TvDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [channelKnobAngle, setChannelKnobAngle] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Carrega os episódios da TV
  useEffect(() => {
    let mounted = true;
    fetch("/api/tv/episodes")
      .then((res) => res.json())
      .then((resData: TvDataResponse) => {
        if (!mounted) return;
        setData(resData);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("[PortalRetroTV] Falha ao carregar programação:", err);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const episodes = useMemo(() => {
    return (data?.episodes || []).filter((e) => e.active);
  }, [data?.episodes]);

  const currentEpisode: TvEpisode | null = episodes[currentIndex] ?? null;

  // Verifica se há novos episódios não vistos
  const hasUnseen = useMemo(() => {
    if (episodes.length === 0) return false;
    try {
      const lastSeenId = localStorage.getItem("portal_tv_last_seen_id");
      if (!lastSeenId) return true;
      const latestId = Math.max(...episodes.map((e) => e.id));
      return Number(lastSeenId) < latestId;
    } catch {
      return false;
    }
  }, [episodes]);

  // Marca como visto quando abre
  const handleOpen = () => {
    setIsOpen(true);
    if (episodes.length > 0) {
      try {
        const latestId = Math.max(...episodes.map((e) => e.id));
        localStorage.setItem("portal_tv_last_seen_id", String(latestId));
      } catch {}
    }
  };

  // Troca de canal / episódio
  const handleNextChannel = () => {
    if (episodes.length <= 1) return;
    setChannelKnobAngle((prev) => prev + 45);
    setCurrentIndex((prev) => (prev + 1) % episodes.length);
  };

  const handlePrevChannel = () => {
    if (episodes.length <= 1) return;
    setChannelKnobAngle((prev) => prev - 45);
    setCurrentIndex((prev) => (prev - 1 + episodes.length) % episodes.length);
  };

  // Fecha no ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Se a TV estiver desativada pelo admin ou sem episódios cadastrados, não renderiza nada!
  if (loading || !data?.enabled || episodes.length === 0 || isDismissed) {
    return null;
  }

  const embedUrl = currentEpisode?.type === "video" ? formatVideoEmbedUrl(currentEpisode.videoUrl) : null;
  const isDirectVideo = embedUrl && (embedUrl.endsWith(".mp4") || embedUrl.endsWith(".webm") || embedUrl.includes("uploads/"));

  return (
    <>
      {/* ─── Botão Flutuante (Discreto no Canto da Tela) ────────────────────────── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed bottom-24 sm:bottom-6 right-4 sm:right-6 z-40 flex items-center gap-2"
          >
            {/* Botão de Fechar Miniatura (se o usuário não quiser ver na sessão) */}
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="w-5 h-5 rounded-full bg-black/60 hover:bg-black text-muted-foreground hover:text-white flex items-center justify-center transition-colors shadow-md text-[10px] cursor-pointer"
              title="Ocultar TV nesta sessão"
            >
              <X className="w-3 h-3" />
            </button>

            {/* Widget Principal da TVzinha */}
            <button
              type="button"
              onClick={handleOpen}
              className="group relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-900/90 via-amber-800/95 to-amber-950/90 text-amber-100 border border-amber-600/40 shadow-xl shadow-amber-950/50 hover:shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer backdrop-blur-md"
            >
              {/* Antena Decorativa no topo do botão */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
                <div className="w-6 h-3 border-t-2 border-amber-400/80 -rotate-12 rounded-t-full" />
                <div className="w-6 h-3 border-t-2 border-amber-400/80 rotate-12 rounded-t-full -ml-3" />
              </div>

              {/* Ícone da TV com luzinha */}
              <div className="relative w-8 h-8 rounded-lg bg-teal-800/80 border border-teal-500/40 flex items-center justify-center shadow-inner text-amber-200">
                <Tv className="w-4 h-4 text-teal-200 animate-pulse" />
                {hasUnseen && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-black animate-ping" />
                )}
                {hasUnseen && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border border-white" />
                )}
              </div>

              {/* Texto com Selo */}
              <div className="text-left flex flex-col pr-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  {data.badge || "Novidades"}
                </span>
                <span className="text-xs font-black text-white leading-tight">
                  {data.title || "TV do Portal"}
                </span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Modal Aberto (A TV Retrô Completa) ─────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
            {/* Backdrop Click para fechar */}
            <div className="fixed inset-0 -z-10" onClick={() => setIsOpen(false)} />

            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 30 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative w-full max-w-3xl my-auto"
            >
              {/* Botão de Fechar Superior */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute -top-12 right-0 sm:-right-2 z-50 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-white shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer flex items-center gap-1.5 text-xs font-bold px-3"
              >
                <X className="w-4 h-4" /> Fechar TV
              </button>

              {/* ─── Gabinete de Madeira da TV Retrô ──────────────────────────────── */}
              <div className="relative rounded-[32px] sm:rounded-[40px] bg-gradient-to-b from-[#8B5A2B] via-[#653E1B] to-[#4A2C11] p-3 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,255,255,0.3),inset_0_-4px_8px_rgba(0,0,0,0.6)] border-4 border-[#543013]">
                {/* Antena V Vintage no topo */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-6 border-t-2 border-zinc-400 -rotate-25 rounded-t-full shadow-md" />
                  <div className="w-12 h-6 border-t-2 border-zinc-400 rotate-25 rounded-t-full -ml-6 shadow-md" />
                  <div className="w-4 h-2.5 bg-zinc-700 rounded-t-md -mt-1 -ml-3" />
                </div>

                {/* Moldura Interna em Madeira Escura com Bezel */}
                <div className="relative rounded-[24px] sm:rounded-[32px] bg-[#221308] p-2 sm:p-3 shadow-inner flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch">
                  
                  {/* ─── TELA CRT DA TV (Área de Vídeo / Notícia) ───────────────────── */}
                  <div className="relative flex-1 rounded-[20px] sm:rounded-[26px] bg-black border-4 sm:border-[6px] border-[#18110b] shadow-[inset_0_0_25px_rgba(0,0,0,0.9)] overflow-hidden min-h-[260px] sm:min-h-[380px] flex items-center justify-center">
                    
                    {/* Canal Atual & Selo (OSD - On Screen Display Verde Retro) */}
                    <div className="absolute top-3 left-3 z-20 flex items-center gap-2 pointer-events-none">
                      <span className="px-2 py-0.5 rounded bg-black/70 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] sm:text-xs font-bold tracking-widest flex items-center gap-1.5 shadow">
                        <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                        CH {String(currentIndex + 1).padStart(2, "0")}
                      </span>
                      {currentEpisode?.badge && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/80 text-black text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow">
                          {currentEpisode.badge}
                        </span>
                      )}
                    </div>

                    {/* Scanlines Retrô e Brilho de Vidro Curvo */}
                    <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08)_0%,transparent_70%)]" />
                    <div className="absolute inset-0 pointer-events-none z-10 opacity-15 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.8)_3px,rgba(0,0,0,0.8)_4px)]" />

                    {/* Conteúdo: VÍDEO ou TEXTO */}
                    {currentEpisode?.type === "video" ? (
                      embedUrl ? (
                        isDirectVideo ? (
                          <video
                            src={embedUrl}
                            controls
                            autoPlay
                            muted={isMuted}
                            className="w-full h-full object-contain rounded-[14px]"
                          />
                        ) : (
                          <iframe
                            src={embedUrl}
                            title={currentEpisode.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full min-h-[260px] sm:min-h-[380px] border-0 rounded-[14px]"
                          />
                        )
                      ) : (
                        <div className="text-center p-6 text-zinc-500 text-xs">
                          <Video className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          Vídeo não disponível neste canal.
                        </div>
                      )
                    ) : (
                      /* Conteúdo: TEXTO RETRÔ / COMUNICADO */
                      <div className="relative w-full h-full p-5 sm:p-8 flex flex-col justify-between text-left overflow-y-auto max-h-[380px] scrollbar-thin scrollbar-thumb-emerald-800">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase tracking-widest border-b border-emerald-950 pb-2">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>Boletim de Notícias do Portal</span>
                          </div>

                          <h3 className="text-lg sm:text-2xl font-black text-amber-200 tracking-tight leading-snug">
                            {currentEpisode?.title}
                          </h3>

                          {currentEpisode?.description && (
                            <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed">
                              {currentEpisode.description}
                            </p>
                          )}

                          {currentEpisode?.contentText && (
                            <div className="text-xs sm:text-sm text-zinc-200 whitespace-pre-line leading-relaxed bg-black/40 p-4 rounded-xl border border-zinc-800 font-sans">
                              {currentEpisode.contentText}
                            </div>
                          )}
                        </div>

                        {/* Botão de Ação / Link opcional */}
                        {currentEpisode?.ctaText && currentEpisode?.ctaUrl && (
                          <div className="pt-4 mt-2">
                            <a
                              href={currentEpisode.ctaUrl}
                              target={currentEpisode.ctaUrl.startsWith("http") ? "_blank" : "_self"}
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-extrabold text-xs sm:text-sm shadow-lg transition-all hover:scale-105 active:scale-95"
                            >
                              {currentEpisode.ctaText}
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ─── PAINEL LATERAL RETRÔ (Verde-água com Botões de Girar) ────────── */}
                  <div className="w-full md:w-44 rounded-[18px] sm:rounded-[22px] bg-gradient-to-b from-[#2E8B83] via-[#24746D] to-[#1A5752] p-3 sm:p-4 border-2 border-[#174B46] shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),inset_0_-2px_4px_rgba(0,0,0,0.5)] flex flex-col justify-between gap-4">
                    
                    {/* Botões Giratórios (Knobs) */}
                    <div className="space-y-4">
                      {/* Knob 1: SELETOR DE CANAIS / TUTORIAIS */}
                      <div className="text-center space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-teal-100/90 block">
                          Canal / Vídeo
                        </span>
                        
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={handlePrevChannel}
                            className="w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center text-xs transition-transform active:scale-90 cursor-pointer"
                            title="Canal anterior"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>

                          {/* O Botão Giratório Visual */}
                          <button
                            type="button"
                            onClick={handleNextChannel}
                            className="relative w-12 h-12 rounded-full bg-gradient-to-b from-zinc-200 via-zinc-400 to-zinc-500 border-2 border-zinc-600 shadow-[0_4px_8px_rgba(0,0,0,0.6),inset_0_2px_3px_rgba(255,255,255,0.8)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                            title="Girar para o próximo canal"
                          >
                            {/* Ponteiro do Botão que gira */}
                            <motion.div
                              animate={{ rotate: channelKnobAngle }}
                              transition={{ type: "spring", stiffness: 300, damping: 20 }}
                              className="w-full h-full flex items-center justify-center"
                            >
                              <div className="w-1.5 h-4 bg-zinc-900 rounded-full -translate-y-2 shadow-inner" />
                            </motion.div>
                          </button>

                          <button
                            type="button"
                            onClick={handleNextChannel}
                            className="w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center text-xs transition-transform active:scale-90 cursor-pointer"
                            title="Próximo canal"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="text-[10px] text-teal-200 font-mono font-bold block">
                          {currentIndex + 1} de {episodes.length}
                        </span>
                      </div>

                      {/* Knob 2: MUDO / VOLUME */}
                      <div className="text-center space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-teal-100/90 block">
                          Áudio
                        </span>

                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setIsMuted(!isMuted)}
                            className="relative w-10 h-10 rounded-full bg-gradient-to-b from-zinc-300 via-zinc-400 to-zinc-600 border-2 border-zinc-600 shadow-[0_3px_6px_rgba(0,0,0,0.6)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer text-zinc-900"
                            title={isMuted ? "Ativar som" : "Desativar som"}
                          >
                            {isMuted ? (
                              <VolumeX className="w-4 h-4 text-red-700" />
                            ) : (
                              <Volume2 className="w-4 h-4 text-zinc-900" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Grade de Som Vintage (Speaker Grille) */}
                    <div className="space-y-1 py-1">
                      <div className="h-1 bg-black/30 rounded-full" />
                      <div className="h-1 bg-black/30 rounded-full" />
                      <div className="h-1 bg-black/30 rounded-full" />
                      <div className="h-1 bg-black/30 rounded-full" />
                      <div className="h-1 bg-black/30 rounded-full" />
                    </div>

                    {/* Botão Guia de Canais (Abrir lista de tutoriais) */}
                    <button
                      type="button"
                      onClick={() => setShowGuide(!showGuide)}
                      className="w-full py-1.5 px-2 rounded-xl bg-black/30 hover:bg-black/50 border border-teal-400/30 text-teal-100 text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ListVideo className="w-3.5 h-3.5 text-amber-300" />
                      {showGuide ? "Ocultar Guia" : "Ver Canais"}
                    </button>
                  </div>
                </div>

                {/* ─── Pés de Madeira da TV ────────────────────────────────────── */}
                <div className="flex justify-between px-10 sm:px-16 -mb-6 sm:-mb-8 mt-2 pointer-events-none">
                  <div className="w-5 sm:w-6 h-8 sm:h-10 bg-gradient-to-r from-[#4A2C11] to-[#653E1B] -rotate-12 rounded-b-md shadow-lg" />
                  <div className="w-5 sm:w-6 h-8 sm:h-10 bg-gradient-to-l from-[#4A2C11] to-[#653E1B] rotate-12 rounded-b-md shadow-lg" />
                </div>
              </div>

              {/* ─── Guia de Programação (Gaveta de Episódios) ────────────────── */}
              <AnimatePresence>
                {showGuide && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 rounded-2xl bg-zinc-950/95 border border-zinc-800 p-4 shadow-2xl text-left max-h-60 overflow-y-auto space-y-2"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
                      <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <ListVideo className="w-4 h-4 text-amber-400" /> Guia de Programação da TV
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        Clique para sintonizar
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {episodes.map((ep, idx) => {
                        const isCurrent = idx === currentIndex;
                        return (
                          <button
                            key={ep.id}
                            type="button"
                            onClick={() => {
                              setCurrentIndex(idx);
                              setChannelKnobAngle((prev) => prev + 45);
                              setShowGuide(false);
                            }}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              isCurrent
                                ? "bg-amber-500/15 border-amber-500/50 text-amber-200"
                                : "bg-zinc-900/60 border-zinc-800 hover:bg-zinc-850 text-zinc-300"
                            }`}
                          >
                            <span className="w-6 h-6 rounded bg-black/60 flex items-center justify-center font-mono text-[10px] font-bold text-emerald-400 shrink-0">
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold truncate">
                                  {ep.title}
                                </span>
                                {ep.badge && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-bold uppercase">
                                    {ep.badge}
                                  </span>
                                )}
                              </div>
                              {ep.description && (
                                <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                                  {ep.description}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default PortalRetroTV;
