import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Music, Users, Zap, LayoutDashboard, Menu, X, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PlansModal } from "@/components/PlansModal";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [artistLoggedIn, setArtistLoggedIn] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (open || plansModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open, plansModalOpen]);

  useEffect(() => {
    fetch("/api/artists/status", { credentials: "include" })
      .then(r => r.json())
      .then(data => setArtistLoggedIn(data.loggedIn === true))
      .catch(() => {});
  }, [open]);

  const handleSelectPlanModal = (planId: string) => {
    setPlansModalOpen(false);
    setOpen(false);
    setLocation(`/cadastro?plano=${planId}`);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group" onClick={() => setOpen(false)}>
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <Music className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display font-bold text-lg text-foreground tracking-tight">
              Portal <span className="text-primary">do Artista</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden sm:flex items-center gap-2">
            {!artistLoggedIn && (
              <button
                onClick={() => setPlansModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
              >
                <Star className="w-4 h-4 text-primary" />
                Planos
              </button>
            )}
            {artistLoggedIn && (
              <Link
                href="/artista/dashboard"
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Meu Painel
              </Link>
            )}
            <Link
              href="/explorar"
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <Music className="w-4 h-4" />
              Músicas
            </Link>
            <Link
              href="/artistas"
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <Users className="w-4 h-4" />
              Artistas
            </Link>
            <Link
              href="/demo"
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <Zap className="w-4 h-4" />
              Vitrine
            </Link>
            {!artistLoggedIn && (
              <button
                onClick={() => setPlansModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold text-black bg-primary hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                Assine Agora
              </button>
            )}
          </div>

          {/* Mobile: Assine Agora + hamburger */}
          <div className="flex sm:hidden items-center gap-2">
            {!artistLoggedIn && (
              <button
                onClick={() => setPlansModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-black bg-primary hover:bg-primary/90 transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                Assine
              </button>
            )}
            <button
              onClick={() => setOpen(!open)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
              aria-label="Menu"
            >
              {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm sm:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-card border-l border-border shadow-2xl sm:hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-4 h-16 border-b border-border/50">
                <span className="font-display font-bold text-foreground">Menu</span>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {!artistLoggedIn && (
                  <button
                    onClick={() => { setOpen(false); setPlansModalOpen(true); }}
                    className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                  >
                    <Star className="w-5 h-5 text-primary" />
                    Planos
                  </button>
                )}
                {artistLoggedIn && (
                  <Link
                    href="/artista/dashboard"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    Meu Painel
                  </Link>
                )}
                <Link
                  href="/explorar"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <Music className="w-5 h-5" />
                  Músicas
                </Link>
                <Link
                  href="/artistas"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <Users className="w-5 h-5" />
                  Artistas
                </Link>
                <Link
                  href="/demo"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <Zap className="w-5 h-5" />
                  Vitrine
                </Link>
              </div>

              <div className="p-4 border-t border-border/50">
                {!artistLoggedIn && (
                  <button
                    onClick={() => { setOpen(false); setPlansModalOpen(true); }}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-bold text-black bg-primary hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    Assine Agora
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <PlansModal
        isOpen={plansModalOpen}
        onClose={() => setPlansModalOpen(false)}
        onSelectPlan={handleSelectPlanModal}
      />
    </>
  );
}
