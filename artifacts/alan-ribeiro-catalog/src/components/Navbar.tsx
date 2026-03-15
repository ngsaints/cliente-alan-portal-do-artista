import { Link } from "wouter";
import { Music, ShieldAlert, Star } from "lucide-react";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
            <Music className="w-5 h-5 text-primary" />
          </div>
          <span className="font-display font-bold text-lg text-foreground tracking-tight">
            Alan <span className="text-primary">Ribeiro</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/vip"
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-black bg-primary hover:bg-primary/90 transition-colors"
          >
            <Star className="w-4 h-4" />
            Área VIP
          </Link>
          <Link
            href="/admin"
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <ShieldAlert className="w-4 h-4" />
            Admin
          </Link>
        </div>
      </div>
    </nav>
  );
}
