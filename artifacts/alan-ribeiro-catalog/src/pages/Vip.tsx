import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Lock, ArrowLeft, Music } from "lucide-react";
import { useListSongs } from "@workspace/api-client-react";

export default function Vip() {
  const [senha, setSenha] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const { data: songs, isLoading } = useListSongs(
    { vip: true },
    { query: { enabled: unlocked } }
  );

  const verificar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senha.trim()) return;
    setVerifying(true);
    setError(false);
    try {
      const res = await fetch("/api/vip-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      if (res.ok) {
        setUnlocked(true);
        setError(false);
      } else {
        setError(true);
        setSenha("");
      }
    } catch {
      setError(true);
      setSenha("");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <nav className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Catálogo
          </Link>
          <div className="flex items-center gap-2 text-primary font-bold">
            <Star className="w-4 h-4 fill-primary" />
            Área VIP
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <AnimatePresence mode="wait">
          {!unlocked ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md"
            >
              {/* Lock icon */}
              <div className="flex justify-center mb-8">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Lock className="w-10 h-10 text-primary" />
                </div>
              </div>

              <h1 className="text-3xl font-bold text-foreground text-center mb-2">
                Área VIP
              </h1>
              <p className="text-muted-foreground text-center mb-8">
                Digite a senha para ouvir composições inéditas
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
                    placeholder="Senha VIP"
                    className={`w-full px-5 py-4 bg-card border rounded-xl text-foreground text-center text-lg tracking-widest focus:outline-none focus:ring-2 transition-colors ${
                      error
                        ? "border-destructive focus:ring-destructive/30"
                        : "border-border focus:ring-primary/30 focus:border-primary"
                    }`}
                    autoFocus
                  />
                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-destructive text-sm text-center mt-2"
                      >
                        Senha incorreta. Tente novamente.
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
                <button
                  type="submit"
                  className="w-full py-4 bg-primary text-black font-bold text-lg rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(245,197,24,0.25)]"
                >
                  Entrar
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-2xl"
            >
              {/* Header */}
              <div className="text-center mb-10">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                    <Star className="w-8 h-8 text-primary fill-primary" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-2">
                  Composições Inéditas
                </h2>
                <p className="text-muted-foreground">
                  Conteúdo exclusivo para membros VIP
                </p>
              </div>

              {/* Songs */}
              {isLoading ? (
                <div className="text-center text-primary animate-pulse py-10">
                  Carregando composições...
                </div>
              ) : songs?.length === 0 ? (
                <div className="text-center py-16 bg-card border border-dashed border-border rounded-2xl">
                  <Music className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-muted-foreground">
                    Nenhuma composição VIP disponível no momento.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {songs?.map((song, index) => (
                    <motion.div
                      key={song.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08 }}
                      className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg"
                    >
                      <div className="flex items-center gap-4 p-4">
                        {song.capaUrl ? (
                          <img
                            src={song.capaUrl}
                            alt={song.titulo}
                            className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-border"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                            <Music className="w-7 h-7 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-foreground text-lg truncate">
                              {song.titulo}
                            </h3>
                            <span className="flex-shrink-0 bg-primary/20 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
                              VIP
                            </span>
                          </div>
                          <p className="text-muted-foreground text-sm line-clamp-1">
                            {song.descricao}
                          </p>
                        </div>
                      </div>
                      {song.mp3Url && (
                        <div className="px-4 pb-4">
                          <audio
                            controls
                            className="w-full h-10"
                            style={{ accentColor: "#f5c518" }}
                          >
                            <source src={song.mp3Url} type="audio/mpeg" />
                            Seu navegador não suporta áudio.
                          </audio>
                        </div>
                      )}
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
