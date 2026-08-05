import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, X, Send, CheckCircle2, MessageSquare, Smartphone, Laptop, Sparkles } from "lucide-react";

interface ExitSettings {
  enabled: boolean;
  title: string;
  subtitle: string;
  options: string[];
}

export function ExitIntentModal() {
  const [location] = useLocation();
  const [artistLoggedIn, setArtistLoggedIn] = useState(false);
  const [settings, setSettings] = useState<ExitSettings>({
    enabled: true,
    title: "Antes de ir embora... O que você achou do Portal do Artista?",
    subtitle: "Sua opinião rápida é fundamental para melhorarmos a plataforma!",
    options: [
      "Apenas navegando / curioso",
      "Gostei, mas estou sem tempo no momento",
      "Não entendi bem como o Portal funciona",
      "Achei os planos ou valores altos",
      "Faltou alguma funcionalidade importante",
      "Outros (digite abaixo)",
    ],
  });

  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [customComment, setCustomComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Check if artist is logged in
  useEffect(() => {
    fetch("/api/artists/status", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.loggedIn === true) {
          setArtistLoggedIn(true);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch exit intent settings from server
  useEffect(() => {
    fetch("/api/exit-feedback/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.enabled === "boolean") {
          setSettings(data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // 1. Manual custom trigger (always available, e.g. for testing in Admin)
    const handleCustomTrigger = () => {
      setIsOpen(true);
    };
    window.addEventListener("triggerExitFeedbackModal", handleCustomTrigger);

    if (!settings.enabled) {
      return () => window.removeEventListener("triggerExitFeedbackModal", handleCustomTrigger);
    }

    // 2. Do NOT trigger if artist is logged in
    if (artistLoggedIn) {
      return () => window.removeEventListener("triggerExitFeedbackModal", handleCustomTrigger);
    }

    // 3. Do NOT trigger on routes other than "/" and "/explorar"
    const normalizedPath = location.split("?")[0];
    const isAllowedRoute = normalizedPath === "/" || normalizedPath === "" || normalizedPath === "/explorar";
    if (!isAllowedRoute) {
      return () => window.removeEventListener("triggerExitFeedbackModal", handleCustomTrigger);
    }

    // Check test mode flag in URL
    const isTestMode = window.location.search.includes("test_exit_modal=true");

    // Don't trigger if already submitted or shown in this session (unless in test mode)
    if (!isTestMode) {
      const hasSubmitted = localStorage.getItem("portal_exit_feedback_submitted");
      const hasShownSession = sessionStorage.getItem("portal_exit_modal_shown");
      if (hasSubmitted || hasShownSession) return;
    }

    const triggerModal = () => {
      if (!isTestMode && sessionStorage.getItem("portal_exit_modal_shown")) return;
      sessionStorage.setItem("portal_exit_modal_shown", "true");
      setIsOpen(true);
    };

    // 1. Mouse movement upwards towards browser chrome (Desktop - smooth 60px threshold)
    let lastY = 9999;
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY <= 60 && e.clientY < lastY) {
        triggerModal();
      }
      lastY = e.clientY;
    };

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 60 || e.relatedTarget === null) {
        triggerModal();
      }
    };

    // 2. Window Blur (Desktop - when user clicks outside browser or switches tabs)
    const handleWindowBlur = () => {
      triggerModal();
    };

    // 3. Mobile/Tablet Visibility Change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        sessionStorage.setItem("portal_exit_pending_feedback", "true");
      } else if (document.visibilityState === "visible") {
        if (sessionStorage.getItem("portal_exit_pending_feedback") === "true") {
          sessionStorage.removeItem("portal_exit_pending_feedback");
          triggerModal();
        }
      }
    };

    // 4. Idle Timer (45 seconds of inactivity)
    let idleTimer: any = setTimeout(() => {
      triggerModal();
    }, 45_000);

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        triggerModal();
      }, 45_000);
    };

    // Listeners
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseout", handleMouseLeave);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("scroll", resetIdleTimer, { passive: true });
    window.addEventListener("click", resetIdleTimer);



    return () => {
      clearTimeout(idleTimer);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseout", handleMouseLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("scroll", resetIdleTimer);
      window.removeEventListener("click", resetIdleTimer);
      window.removeEventListener("triggerExitFeedbackModal", handleCustomTrigger);
    };
  }, [settings, location, artistLoggedIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption) return;

    setIsSubmitting(true);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    try {
      await fetch("/api/exit-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedOption,
          customComment,
          pageUrl: window.location.pathname,
          userDevice: isMobile ? "mobile" : "desktop",
        }),
      });

      localStorage.setItem("portal_exit_feedback_submitted", "true");
      setIsSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
      }, 2500);
    } catch (err) {
      console.error("Error sending feedback:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOther = selectedOption.toLowerCase().includes("outro");

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-card via-card/95 to-black border border-primary/40 p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-white hover:bg-input/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {isSubmitted ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-extrabold text-white">Obrigado pelo seu feedback!</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Sua resposta foi gravada com sucesso e ajudará nosso time a evoluir o Portal do Artista.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-extrabold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    Sua opinião importa
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                    {settings.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {settings.subtitle}
                  </p>
                </div>

                {/* Opções de Resposta */}
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                  {settings.options.map((opt, idx) => {
                    const isSelected = selectedOption === opt;
                    return (
                      <label
                        key={idx}
                        onClick={() => setSelectedOption(opt)}
                        className={`flex items-center gap-3 p-3 rounded-2xl border text-xs sm:text-sm cursor-pointer transition-all ${
                          isSelected
                            ? "bg-primary/15 border-primary text-white font-bold shadow-md shadow-primary/10"
                            : "bg-input/40 border-border/60 text-muted-foreground hover:border-primary/40 hover:text-white"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                        </div>
                        <span className="flex-1">{opt}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Caixa de Texto Aberta (Exibida se marcar Outros ou como complemento) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-primary" />
                    {isOther ? "Digite sua resposta detalhada:" : "Quer deixar um comentário adicional? (Opcional)"}
                  </label>
                  <textarea
                    rows={3}
                    value={customComment}
                    onChange={(e) => setCustomComment(e.target.value)}
                    placeholder={
                      isOther
                        ? "Explique o motivo da sua saída ou sugestão para a plataforma..."
                        : "Conte-nos o que achou ou o que podemos melhorar..."
                    }
                    className="w-full bg-input/60 border border-border/60 focus:border-primary rounded-xl p-3 text-xs sm:text-sm text-white placeholder:text-muted-foreground outline-none transition-colors resize-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-input/40 hover:bg-input text-muted-foreground hover:text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Continuar Navegando
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedOption || isSubmitting}
                    className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                  >
                    {isSubmitting ? (
                      "Enviando..."
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" /> Enviar Resposta
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
