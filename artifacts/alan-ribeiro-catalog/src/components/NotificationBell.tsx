import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Trash2, Mail, Phone, MessageSquare, Calendar, Music, X } from "lucide-react";

export interface Interest {
  id: number;
  songId?: number;
  songTitle?: string;
  nome: string;
  email: string;
  telefone?: string;
  mensagem?: string;
  contratarShow: boolean;
  reservarMusica: boolean;
  agendarReuniao: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  interests: Interest[];
  onMarkRead?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export function NotificationBell({ interests, onMarkRead, onDelete }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedInterest, setSelectedInterest] = useState<Interest | null>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = interests.length;

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        bellRef.current && !bellRef.current.contains(e.target as Node) &&
        containerRef.current && !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenDetail = (interest: Interest) => {
    setSelectedInterest(interest);
    onMarkRead?.(interest.id);
  };

  return (
    <>
      {/* Bell button */}
      <div ref={bellRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed top-20 right-4 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={containerRef}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="fixed top-20 right-4 z-50 w-80 max-h-[400px] overflow-y-auto bg-card border border-border/40 rounded-2xl shadow-2xl"
            >
              <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border/40 px-4 py-3 flex items-center justify-between">
                <h3 className="font-bold text-foreground">Interesses / Leads</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {interests.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum interesse recebido</p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {interests.map((interest) => (
                    <div
                      key={interest.id}
                      className="px-4 py-3 hover:bg-primary/5 transition-colors"
                    >
                      <div
                        className="flex items-start justify-between gap-2 cursor-pointer"
                        onClick={() => handleOpenDetail(interest)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">{interest.nome}</p>
                          <p className="text-xs text-muted-foreground truncate">{interest.email}</p>
                          {interest.songTitle && (
                            <p className="text-xs text-primary mt-0.5 flex items-center gap-1">
                              <Music className="w-3 h-3" />
                              {interest.songTitle}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {interest.contratarShow && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-400">Show</span>
                            )}
                            {interest.reservarMusica && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/20 text-green-400">Reserva</span>
                            )}
                            {interest.agendarReuniao && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-400">Reunião</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.(interest.id);
                          }}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedInterest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
            onClick={() => setSelectedInterest(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card border border-border/40 rounded-2xl w-full max-w-md p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">Detalhes do Interesse</h3>
                <button
                  onClick={() => setSelectedInterest(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Nome</p>
                    <p className="text-sm font-semibold text-foreground">{selectedInterest.nome}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm text-foreground">{selectedInterest.email}</p>
                  </div>
                </div>
                {selectedInterest.telefone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Telefone</p>
                      <p className="text-sm text-foreground">{selectedInterest.telefone}</p>
                    </div>
                  </div>
                )}
                {selectedInterest.mensagem && (
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Mensagem</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{selectedInterest.mensagem}</p>
                    </div>
                  </div>
                )}
                {selectedInterest.songTitle && (
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Música</p>
                      <p className="text-sm text-foreground">{selectedInterest.songTitle}</p>
                    </div>
                  </div>
                )}

                <div className="border-t border-border/40 pt-3">
                  <p className="text-xs text-muted-foreground mb-2">Interesses:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedInterest.contratarShow && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/20">
                        🎤 Contratar Show
                      </span>
                    )}
                    {selectedInterest.reservarMusica && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/20">
                        🎵 Reservar Música
                      </span>
                    )}
                    {selectedInterest.agendarReuniao && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/20">
                        📅 Agendar Reunião
                      </span>
                    )}
                  </div>
                </div>

                {selectedInterest.createdAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      {new Date(selectedInterest.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-2">
                {selectedInterest.telefone && (
                  <a
                    href={`https://wa.me/${selectedInterest.telefone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 rounded-xl bg-green-600/20 text-green-400 text-sm font-semibold text-center hover:bg-green-600/30 transition-colors border border-green-500/20"
                  >
                    WhatsApp
                  </a>
                )}
                <button
                  onClick={() => {
                    onDelete?.(selectedInterest.id);
                    setSelectedInterest(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold hover:bg-destructive/20 transition-colors flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
