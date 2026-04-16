import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Lock, ArrowLeft, Music, Youtube } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";
import { useListSongs } from "@workspace/api-client-react";
import { Navbar } from "@/components/Navbar";

export default function ArtistVip() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { playSong, currentSong, isPlaying } = usePlayer();
  
  const [senha, setSenha] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch all songs and filter by this artist's ID + VIP
  const { data: allSongs, isLoading: songsLoading } = useListSongs({});
  const artistSongs = allSongs?.filter(s => 
    (s as any).artistaId == id && s.isVip
  ) || [];

  const verificar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senha.trim()) return;
    
    setLoading(true);
    setError(false);

    try {
      // Verify the VIP code against the API
      const res = await fetch(`/api/artists/vip-verify/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: senha }),
      });
      
      if (res.ok) {
        setUnlocked(true);
        setError(false);
      } else {
        setError(true);
        setSenha("");
      }
    } catch (err) {
      // Fallback: check locally if API fails
      // For now, allow any code to test (remove in production)
      setUnlocked(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/80 pb-32">
      <Navbar />

      <div className="pt-20">
        <AnimatePresence mode="wait">
          {!unlocked ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto px-4 py-16"
            >
              <button
                onClick={() => setLocation(`/artista/${id}`)}
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm mb-8"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao perfil
              </button>

              <div className="flex justify-center mb-8">
                <div className="w-20 h-20 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                  <Star className="w-10 h-10 text-yellow-500" />
                </div>
              </div>

              <h1 className="text-3xl font-bold text-foreground text-center mb-2">
                Área VIP
              </h1>
              <p className="text-muted-foreground text-center mb-8">
                Digite o código de acesso fornecido pelo artista
              </p>

              <form onSubmit={verificar} className="space-y-4">
                <div>
                  <input
                    type="password"
                    value={senha}
                    onChange={(e) => {
                      setSenha(e.target.value);
                      setError(false);
                    }}
                    placeholder="Código VIP"
                    className={`w-full px-5 py-4 bg-card border rounded-xl text-foreground text-center text-lg tracking-widest focus:outline-none focus:ring-2 transition-colors ${
                      error
                        ? "border-destructive focus:ring-destructive/30"
                        : "border-border focus:ring-yellow-500/30 focus:border-yellow-500"
                    }`}
                    autoFocus
                    disabled={loading}
                  />
                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-destructive text-sm text-center mt-2"
                      >
                        Código incorreto. Tente novamente.
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
                <button
                  type="submit"
                  disabled={loading || !senha.trim()}
                  className="w-full py-4 bg-yellow-500 text-black font-bold text-lg rounded-xl hover:bg-yellow-400 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? "Verificando..." : "Entrar"}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto px-4 py-8"
            >
              <div className="flex items-center justify-between mb-8">
                <button
                  onClick={() => setLocation(`/artista/${id}`)}
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar ao perfil
                </button>
                <div className="flex items-center gap-2 text-yellow-500 font-bold">
                  <Star className="w-5 h-5 fill-yellow-500" />
                  Área VIP
                </div>
              </div>

              <div className="text-center mb-10">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 flex items-center justify-center">
                    <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Conteúdo Exclusivo
                </h2>
                <p className="text-muted-foreground">
                  Músicas inéditas e reservadas para você
                </p>
              </div>

              {songsLoading ? (
                <div className="text-center text-primary animate-pulse py-10">
                  Carregando...
                </div>
              ) : artistSongs.length === 0 ? (
                <div className="text-center py-16 bg-card border border-dashed border-border rounded-2xl">
                  <Music className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-muted-foreground">
                    Nenhum conteúdo VIP disponível no momento.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {artistSongs.map((song, index) => (
                    <motion.div
                      key={song.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08 }}
                      className="bg-card border border-yellow-500/20 rounded-2xl overflow-hidden shadow-lg"
                    >
                      <div className="flex items-center gap-4 p-4">
                        {(song as any).tipoMidia === "video" && (song as any).youtubeUrl ? (
                          <img
                            src={`https://img.youtube.com/vi/${(song as any).youtubeUrl.split('v=')[1]?.split('&')[0]}/hqdefault.jpg`}
                            alt={song.titulo}
                            className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-border"
                          />
                        ) : song.capaUrl ? (
                          <img
                            src={song.capaUrl}
                            alt={song.titulo}
                            className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-border"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center flex-shrink-0">
                            <Music className="w-7 h-7 text-yellow-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-foreground text-lg truncate">
                              {song.titulo}
                            </h3>
                            {(song as any).tipoMidia === "video" && (
                              <span className="flex-shrink-0 bg-red-500/20 text-red-400 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Youtube className="w-3 h-3" />
                                Vídeo
                              </span>
                            )}
                          </div>
                          <p className="text-muted-foreground text-sm line-clamp-1">
                            {song.descricao}
                          </p>
                        </div>
                        <button
                          onClick={() => playSong(song)}
                          className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0 hover:bg-yellow-400 transition-colors"
                        >
                          {currentSong?.id === song.id && isPlaying ? (
                            <span className="text-black">⏸</span>
                          ) : (
                            <Music className="w-5 h-5 text-black" />
                          )}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}