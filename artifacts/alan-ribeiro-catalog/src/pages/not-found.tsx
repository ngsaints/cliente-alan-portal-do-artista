import { Link } from "wouter";
import { Music, Home, ArrowLeft, Disc3 } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

export default function NotFound() {
  useSEO({
    title: "Página não encontrada - Portal do Artista",
    description: "A página que você procura não existe no Portal do Artista.",
  });

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-background via-background to-background/80 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 text-center px-4">
        {/* 404 Icon */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-primary/10 border border-primary/20">
            <Music className="w-16 h-16 text-primary" />
          </div>
        </div>

        {/* Error Code */}
        <h1 className="text-8xl md:text-9xl font-extrabold text-foreground mb-4 tracking-tighter">
          404
        </h1>

        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
          Página não encontrada
        </h2>

        {/* Description */}
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          A página que você procura não existe ou foi removida. 
          Que tal voltar para a página inicial?
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-105"
          >
            <Home className="w-5 h-5" />
            Voltar para Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-card border border-border text-foreground font-semibold hover:bg-muted/50 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar atrás
          </button>
        </div>

        {/* Decorative element */}
        <div className="mt-12 flex items-center justify-center gap-2 text-muted-foreground">
          <Disc3 className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
          <span className="text-sm">Portal do Artista</span>
        </div>
      </div>
    </div>
  );
}
