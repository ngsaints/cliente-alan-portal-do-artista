import { Navbar } from "@/components/Navbar";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, TrendingUpDown } from "lucide-react";
import { CrmHub } from "@/components/CrmTabs";

export default function CrmPage() {
  const [, navigate] = useLocation();
  const [artist, setArtist] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/artists/status", { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (!d.error) setArtist(d); })
      .catch(() => {});
    fetch("/api/artist-songs", { credentials: "include" })
      .then(r => r.json())
      .then(d => setSongs(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  if (!artist) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16 md:pt-20 pb-4 px-3 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate("/artista/dashboard")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors text-xs font-medium border border-border"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <div className="flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground flex items-center gap-2">
                <TrendingUpDown className="w-5 h-5 text-primary" />
                CRM — Gestão de Carreira
              </h1>
              <p className="text-xs text-muted-foreground">Contatos, financeiro, liberações, calendário e suporte</p>
            </div>
          </div>

          {/* CRM Content */}
          <CrmHub artistId={artist.id} songs={songs} />
        </div>
      </div>
    </div>
  );
}
