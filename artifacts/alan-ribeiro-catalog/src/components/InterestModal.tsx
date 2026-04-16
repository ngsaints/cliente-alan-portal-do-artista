import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Music, Phone, MessageSquare, CheckCircle2, Loader2 } from "lucide-react";

interface InterestModalProps {
  isOpen: boolean;
  onClose: () => void;
  songId: number | string;
  artistaId?: number | string | null;
  songTitle?: string;
}

export function InterestModal({ isOpen, onClose, songId, artistaId, songTitle }: InterestModalProps) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [contratarShow, setContratarShow] = useState(false);
  const [reservarMusica, setReservarMusica] = useState(false);
  const [agendarReuniao, setAgendarReuniao] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setNome(""); setEmail(""); setTelefone(""); setMensagem("");
    setContratarShow(false); setReservarMusica(false); setAgendarReuniao(false);
    setDone(false); setError("");
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songId:         String(songId),
          artistaId:      artistaId ?? null,
          nome:           nome.trim(),
          email:          email.trim(),
          telefone:       telefone.trim() || null,
          mensagem:       mensagem.trim() || null,
          contratarShow,
          reservarMusica,
          agendarReuniao,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as any).error || "Erro ao enviar");
      }

      setDone(true);
      setTimeout(handleClose, 2500);
    } catch (err: any) {
      setError(err.message || "Erro ao enviar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="bg-card border border-border/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
              <div>
                <h3 className="text-base font-bold text-foreground">Tenho Interesse</h3>
                {songTitle && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Music className="w-3 h-3 text-primary" />
                    {songTitle}
                  </p>
                )}
              </div>
              <button onClick={handleClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="px-5 py-5">
              {done ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-8 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                  </div>
                  <p className="text-lg font-bold text-foreground">Enviado!</p>
                  <p className="text-sm text-muted-foreground mt-1">O artista receberá seu contato em breve.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Nome */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Nome *</label>
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Seu nome completo"
                      required
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Email *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    />
                  </div>

                  {/* Telefone */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      <Phone className="w-3 h-3 inline mr-1" />
                      Telefone
                    </label>
                    <input
                      type="text"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    />
                  </div>

                  {/* Mensagem */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      <MessageSquare className="w-3 h-3 inline mr-1" />
                      Mensagem
                    </label>
                    <textarea
                      value={mensagem}
                      onChange={(e) => setMensagem(e.target.value)}
                      placeholder="Escreva sua mensagem..."
                      rows={3}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none transition-all"
                    />
                  </div>

                  {/* Checkboxes */}
                  <div className="border-t border-border/40 pt-3 space-y-2">
                    {[
                      { label: "🎤 Contratar Show",  value: contratarShow,  set: setContratarShow  },
                      { label: "🎵 Reservar Música", value: reservarMusica, set: setReservarMusica },
                      { label: "📅 Agendar Reunião", value: agendarReuniao, set: setAgendarReuniao },
                    ].map((item) => (
                      <label key={item.label} className="flex items-center gap-2 cursor-pointer group">
                        <div
                          onClick={() => item.set(!item.value)}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${item.value ? "bg-primary border-primary" : "border-border group-hover:border-primary/50"}`}
                        >
                          {item.value && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <span className="text-sm text-foreground">{item.label}</span>
                      </label>
                    ))}
                  </div>

                  {error && (
                    <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
                  )}

                  {/* Botões */}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background border border-border transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {loading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                        : <><Send className="w-4 h-4" /> Enviar</>}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
