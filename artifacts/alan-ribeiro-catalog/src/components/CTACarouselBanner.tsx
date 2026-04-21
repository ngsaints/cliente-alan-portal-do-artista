import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CtaBanner {
  id: number;
  texto: string;
  corFundo: string;
  corTexto: string;
  botaoTexto: string | null;
  botaoLink: string | null;
  imagemFundoUrl: string | null;
  ordem: number;
  ativo: boolean;
  intervaloSegundos: number;
}

export function CTACarouselBanner() {
  const [banners, setBanners] = useState<CtaBanner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/banners")
      .then((r) => r.json())
      .then((data) => {
        setBanners(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (banners.length === 0) return;

    const interval = banners[currentIndex]?.intervaloSegundos || 4;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, interval * 1000);

    return () => clearInterval(timer);
  }, [banners, currentIndex]);

  const goTo = (index: number) => setCurrentIndex(index);
  const goNext = () => setCurrentIndex((prev) => (prev + 1) % banners.length);
  const goPrev = () => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);

  if (loading || banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  return (
    <section className="relative w-full overflow-hidden" style={{ minHeight: "280px" }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentBanner.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: currentBanner.imagemFundoUrl
              ? `url(${currentBanner.imagemFundoUrl}) center/cover`
              : currentBanner.corFundo || "#1a1a2e",
          }}
        >
          {/* Overlay for readability */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Content */}
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h2
              key={`text-${currentBanner.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-6 leading-tight"
              style={{ color: currentBanner.corTexto || "#ffffff" }}
            >
              {currentBanner.texto}
            </motion.h2>

            {currentBanner.botaoTexto && currentBanner.botaoLink && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <Link
                  href={currentBanner.botaoLink}
                  className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-full bg-primary text-primary-foreground font-bold text-base sm:text-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {currentBanner.botaoTexto}
                </Link>
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-all"
            aria-label="Banner anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-all"
            aria-label="Próximo banner"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {banners.map((banner, index) => (
            <button
              key={banner.id}
              onClick={() => goTo(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-primary w-6"
                  : "bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`Ir para banner ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
