import { Play, Pause, Music, Youtube, Heart, PlayCircle, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { type Song } from "@workspace/api-client-react";
import { usePlayer } from "@/contexts/PlayerContext";
import { useState, useRef, useEffect } from "react";

interface MusicCardProps {
  song: Song;
  index: number;
}

function formatPreco(val: string | null | undefined) {
  if (!val) return null;
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
  );
  return match ? match[1] : null;
}

export function MusicCard({ song, index }: MusicCardProps) {
  const { currentSong, isPlaying, playSong } = usePlayer();
  const isThisPlaying = currentSong?.id === song.id && isPlaying;
  const disponivel = !song.status || song.status === "Disponível";
  const precoX = formatPreco(song.precoX);
  const precoY = formatPreco(song.precoY);

  const isVideo  = song.tipoMidia === "video";
  const youtubeId = extractYouTubeId(song.youtubeUrl || "");
  const youtubeUrl = song.youtubeUrl || (youtubeId ? `https://youtube.com/watch?v=${youtubeId}` : "");

  const [videoPlaying, setVideoPlaying] = useState(false);
  const [embedError,   setEmbedError]   = useState(false);
  const videoRef = useRef<HTMLIFrameElement>(null);

  // Resetar estado ao trocar de música
  useEffect(() => {
    setVideoPlaying(false);
    setEmbedError(false);
  }, [song.id]);

  // Escutar postMessages do YouTube para detectar erro de incorporação
  useEffect(() => {
    if (!videoPlaying) {
      setEmbedError(false);
      return;
    }

    const handler = (e: MessageEvent) => {
      if (e.origin !== "https://www.youtube.com") return;
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        // Códigos 101 e 150 = incorporação não permitida pelo dono do vídeo
        if (data?.event === "onError" && (data?.info === 101 || data?.info === 150)) {
          setEmbedError(true);
        }
      } catch {
        // ignora mensagens não-JSON
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [videoPlaying]);

  const handlePlayVideo  = () => setVideoPlaying(true);
  const handleStopVideo  = () => { setVideoPlaying(false); setEmbedError(false); };
  const handleOpenYoutube = () => {
    if (youtubeUrl) window.open(youtubeUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="group relative flex flex-col bg-card border border-border/40 rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.8)] hover:-translate-y-1"
    >
      {/* ── Área de mídia ─────────────────────────────────────── */}
      <div className="relative aspect-square overflow-hidden bg-black/50">
        {isVideo && youtubeId ? (
          videoPlaying ? (
            <div className="w-full h-full absolute inset-0">
              {embedError ? (
                /* ── Fallback: incorporação bloqueada ── */
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black gap-4 p-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-red-600/20 flex items-center justify-center">
                    <Youtube className="w-7 h-7 text-red-500" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Incorporação não permitida</p>
                    <p className="text-white/50 text-xs mt-1">O dono desativou a reprodução em sites externos.</p>
                  </div>
                  <button
                    onClick={handleOpenYoutube}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 active:scale-95 transition-all text-sm"
                  >
                    <Youtube className="w-4 h-4" />
                    Abrir no YouTube
                  </button>
                  <button
                    onClick={handleStopVideo}
                    className="text-white/30 text-xs hover:text-white/60 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                /* ── Player inline ── */
                <>
                  <iframe
                    ref={videoRef}
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={song.titulo}
                  />
                  <button
                    onClick={handleStopVideo}
                    className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors"
                    title="Fechar"
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ) : (
            /* ── Thumbnail com overlay de play ── */
            <>
              <img
                src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                alt={song.titulo}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                <button
                  onClick={handlePlayVideo}
                  className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
                >
                  <Play className="w-8 h-8 fill-current ml-1" />
                </button>
              </div>
            </>
          )
        ) : (
          /* ── Áudio: capa + botão play ── */
          <>
            <img
              src={song.capaUrl || `${import.meta.env.BASE_URL}images/default-cover.png`}
              alt={song.titulo}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
              <button
                onClick={() => playSong(song)}
                className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
              >
                {isThisPlaying
                  ? <Pause className="w-8 h-8 fill-current" />
                  : <Play  className="w-8 h-8 fill-current ml-1" />}
              </button>
            </div>
          </>
        )}

        {/* Badges topo-esquerda */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
            {isVideo
              ? <Youtube className="w-3 h-3 text-red-500" />
              : <Music   className="w-3 h-3 text-primary"  />}
            <span className="text-xs font-medium text-white/90">
              {song.genero}{song.subgenero ? ` · ${song.subgenero}` : ""}
            </span>
          </div>
          <div className={`self-start px-3 py-1 rounded-full text-xs font-bold ${
            disponivel ? "bg-green-600/80 text-white" : "bg-red-600/80 text-white"
          }`}>
            {disponivel ? "Disponível" : "Reservado"}
          </div>
        </div>
      </div>

      {/* ── Corpo do card ─────────────────────────────────────── */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-xl font-bold text-primary mb-1 line-clamp-1">{song.titulo}</h3>
        {song.compositor && (
          <p className="text-xs text-muted-foreground mb-2">Compositor: {song.compositor}</p>
        )}
        <p className="text-sm text-muted-foreground line-clamp-2 flex-1 mb-4">{song.descricao}</p>

        {(precoX || precoY) ? (
          <div className="flex gap-3 mb-4 text-xs">
            {precoX && (
              <div className="flex-1 bg-secondary/20 border border-border/50 rounded-xl px-3 py-2 text-center">
                <div className="text-muted-foreground mb-0.5">Valor X · Livre</div>
                <div className="text-primary font-bold">{precoX}</div>
              </div>
            )}
            {precoY && (
              <div className="flex-1 bg-secondary/20 border border-border/50 rounded-xl px-3 py-2 text-center">
                <div className="text-muted-foreground mb-0.5">Valor Y · Exclusivo</div>
                <div className="text-primary font-bold">{precoY}</div>
              </div>
            )}
          </div>
        ) : song.compositor ? (
          <div className="mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-bold">
              A combinar
            </span>
          </div>
        ) : null}

        {/* ── Botão de ação ── */}
        {isVideo ? (
          <div className="flex gap-2">
            <button
              onClick={handlePlayVideo}
              disabled={videoPlaying && !embedError}
              className="flex-1 py-2.5 rounded-xl font-semibold bg-red-600/20 text-red-400 border border-red-600/20 hover:bg-red-600 hover:text-white transition-all duration-300 active:scale-[0.98] text-sm disabled:opacity-60"
            >
              {videoPlaying && !embedError ? "Reproduzindo..." : "▶ Assistir"}
            </button>
            <button
              onClick={handleOpenYoutube}
              className="px-3 py-2.5 rounded-xl bg-background border border-border text-muted-foreground hover:text-white hover:border-white/20 transition-all duration-300 active:scale-[0.98]"
              title="Abrir no YouTube"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <PlayCircle className="w-3.5 h-3.5" />
                {Number(song.plays || 0).toLocaleString("pt-BR")}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fetch(`/api/songs/${song.id}/like`, { method: "POST" }).catch(() => {});
                }}
                className="flex items-center gap-1 hover:text-red-500 transition-colors"
              >
                <Heart className="w-3.5 h-3.5" />
                {Number(song.likes || 0).toLocaleString("pt-BR")}
              </button>
            </div>
            <button
              onClick={() => playSong(song)}
              className="w-full py-2.5 rounded-xl font-semibold bg-secondary/30 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all duration-300 active:scale-[0.98]"
            >
              {isThisPlaying ? "Pausar" : "Tocar Música"}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
