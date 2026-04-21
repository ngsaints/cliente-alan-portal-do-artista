import { useState, useEffect, useCallback } from "react";
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
  const [progress, setProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

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
    if (banners.length === 0 || isHovered) return;

    const interval = banners[currentIndex]?.intervaloSegundos || 4;
    const stepInterval = 50;
    const steps = (interval * 1000) / stepInterval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setProgress((currentStep / steps) * 100);

      if (currentStep >= steps) {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
        setProgress(0);
        currentStep = 0;
      }
    }, stepInterval);

    return () => clearInterval(timer);
  }, [banners, currentIndex, isHovered]);

  const goTo = useCallback((index: number) => {
    setCurrentIndex(index);
    setProgress(0);
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
    setProgress(0);
  }, [banners.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    setProgress(0);
  }, [banners.length]);

  if (loading || banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ minHeight: "420px" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentBanner.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: currentBanner.imagemFundoUrl
              ? `url(${currentBanner.imagemFundoUrl}) center/cover`
              : currentBanner.corFundo || "#1a1a2e",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-3xl mx-auto px-6 sm:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Destaque
              </div>

              <motion.h2
                key={`text-${currentBanner.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight drop-shadow-lg"
                style={{ textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}
              >
                {currentBanner.texto}
              </motion.h2>

              {currentBanner.botaoTexto && currentBanner.botaoLink && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  <Link
                    href={currentBanner.botaoLink}
                    className="inline-flex items-center gap-3 px-8 sm:px-10 py-4 rounded-full bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-all shadow-2xl hover:shadow-primary/30 hover:scale-105"
                  >
                    <span>{currentBanner.botaoTexto}</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </motion.div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-yellow-300"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.05, ease: "linear" }}
        />
      </div>

      {banners.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 hover:border-white/30 transition-all opacity-0 hover:opacity-100 group"
            aria-label="Banner anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 hover:border-white/30 transition-all opacity-0 hover:opacity-100 group"
            aria-label="Próximo banner"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {banners.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {banners.map((banner, index) => (
            <button
              key={banner.id}
              onClick={() => goTo(index)}
              className={`h-1.5 rounded-full transition-all ${
                index === currentIndex
                  ? "w-8 bg-primary"
                  : "w-2 bg-white/30 hover:bg-white/50"
              }`}
              aria-label={`Ir para banner ${index + 1}`}
            />
          ))}
        </div>
      )}

      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5">
        {banners.map((_, index) => (
          <span
            key={index}
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              index === currentIndex ? "bg-primary" : "bg-white/30"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
