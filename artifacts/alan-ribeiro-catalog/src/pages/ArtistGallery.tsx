import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Image, X, ArrowLeft, Loader2 } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { Footer } from "@/components/Footer";

interface Photo {
  id: number;
  fotoUrl: string;
  legenda: string | null;
  ordem: number;
}

interface GalleryData {
  id: number;
  titulo: string;
  photos: Photo[];
}

export default function ArtistGallery() {
  const { slug } = useParams();
  const [gallery, setGallery] = useState<GalleryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const galleryTitle = gallery?.title || "Galeria de Fotos";
  const artistUrl = `https://portaldoartista.com/${slug}`;

  useSEO({
    title: `${galleryTitle} | Portal do Artista`,
    description: gallery?.description || `Confira a galeria oficial de fotos de ${slug} no Portal do Artista.`,
    canonical: `${artistUrl}/galeria`,
    breadcrumbs: [
      { name: "Início", item: "https://portaldoartista.com/" },
      { name: "Artistas", item: "https://portaldoartista.com/artistas" },
      { name: slug || "Artista", item: artistUrl },
      { name: "Galeria", item: `${artistUrl}/galeria` }
    ]
  });

  useEffect(() => {
    fetch(`/api/galleries/${slug}/all`)
      .then(r => r.json())
      .then(data => {
        setGallery(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!gallery || gallery.photos.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-16 px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            <Link href={`/${slug}`} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Voltar ao perfil
            </Link>
            
            <div className="text-center py-10 bg-card/60 border border-border/40 rounded-3xl p-8 space-y-4">
              <Image className="w-14 h-14 text-muted-foreground mx-auto opacity-60" />
              <h1 className="text-2xl font-bold text-foreground">Galeria de Fotos do Artista</h1>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Este artista ainda não adicionou fotos na sua galeria oficial.
              </p>
            </div>

            {/* Dicas Inteligentes Inspiracionais */}
            <div className="p-6 rounded-3xl bg-card/40 border border-border/30 space-y-4">
              <h3 className="font-extrabold text-foreground text-sm flex items-center gap-2">
                ✨ Ideias de fotos que aumentam o interesse de contratantes:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-background border border-border/40 space-y-1">
                  <span className="text-lg">🎙️</span>
                  <p className="font-bold text-foreground">Estúdio & Gravações</p>
                  <p className="text-muted-foreground text-[11px]">Bastidores de produção e gravação de voz.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-background border border-border/40 space-y-1">
                  <span className="text-lg">🎸</span>
                  <p className="font-bold text-foreground">Palco & Concertos</p>
                  <p className="text-muted-foreground text-[11px]">Momentos ao vivo e interação com o público.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-background border border-border/40 space-y-1">
                  <span className="text-lg">🤝</span>
                  <p className="font-bold text-foreground">Feats & Parcerias</p>
                  <p className="text-muted-foreground text-[11px]">Encontros com outros artistas e produtores.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-8 px-4">
        <div className="max-w-6xl mx-auto">
          <Link href={`/${slug}`} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao perfil
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold text-foreground mb-2">{gallery.titulo}</h1>
            <p className="text-muted-foreground mb-8">{gallery.photos.length} fotos</p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {gallery.photos.map((photo, index) => (
                <motion.button
                  key={photo.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedPhoto(photo)}
                  className="aspect-square rounded-xl overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all"
                >
                  <img
                    src={photo.fotoUrl}
                    alt={photo.legenda || ""}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white"
            onClick={() => setSelectedPhoto(null)}
          >
            <X className="w-8 h-8" />
          </button>

          <motion.img
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            src={selectedPhoto.fotoUrl}
            alt={selectedPhoto.legenda || ""}
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {selectedPhoto.legenda && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-center max-w-md px-4">
              {selectedPhoto.legenda}
            </p>
          )}
        </div>
      )}
    
      <Footer />
</div>
  );
}
