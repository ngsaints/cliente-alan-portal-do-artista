import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Music, ShieldAlert, Star, Users, Zap, UserPlus, LogIn, LayoutDashboard, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [artistLoggedIn, setArtistLoggedIn] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    fetch("/api/artists/status", { credentials: "include" })
      .then(r => r.json())
      .then(data => setArtistLoggedIn(data.loggedIn === true))
      .catch(() => {});
  }, [open]);

  const artistLink = artistLoggedIn
    ? { href: "/artista/dashboard", icon: LayoutDashboard, label: "Meu Painel" }
    : { href: "/artista/login",    icon: LogIn,           label: "Login Artista" };

  const otherLinks = [
    ...(!artistLoggedIn ? [{ href: "/cadastro", icon: UserPlus, label: "Sou Artista" }] : []),
    { href: "/artistas", icon: Users,       label: "Artistas" },
    { href: "/demo",     icon: Zap,         label: "Demo" },
    { href: "/admin",    icon: ShieldAlert, label: "Admin" },
  ];

  const allLinks = [artistLink, ...otherLinks];

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

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
            {allLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <l.icon className="w-4 h-4" />
                {l.label}
              </Link>
            ))}
            <Link
              href="/vip"
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-black bg-primary hover:bg-primary/90 transition-colors"
            >
              <Star className="w-4 h-4" />
              Área VIP
            </Link>
          </div>

          {/* Mobile: VIP + hamburger */}
          <div className="flex sm:hidden items-center gap-2">
            <Link
              href="/vip"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-black bg-primary hover:bg-primary/90 transition-colors"
            >
              <Star className="w-3.5 h-3.5" />
              VIP
            </Link>
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
                {allLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <l.icon className="w-5 h-5" />
                    {l.label}
                  </Link>
                ))}
              </div>

              <div className="p-4 border-t border-border/50">
                <Link
                  href="/vip"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-bold text-black bg-primary hover:bg-primary/90 transition-colors"
                >
                  <Star className="w-4 h-4" />
                  Área VIP
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}