import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

export type TourStep = {
  target: string;
  title: string;
  text: string;
};

type Box = { top: number; left: number; width: number; height: number };

const BUBBLE_WIDTH = 320;

export function OnboardingTour({
  steps,
  open,
  onDone,
}: {
  steps: TourStep[];
  open: boolean;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const step = steps[index];

  const measure = useCallback(() => {
    const el = step ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
    if (!el) {
      setBox(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setBox({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useLayoutEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  // Ao trocar de passo: traz o alvo para a tela, mede e reage a scroll/resize.
  useEffect(() => {
    if (!open || !step) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.top < 96 || r.bottom > window.innerHeight - 48) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
    measure();
    const t1 = window.setTimeout(measure, 420);
    const onMove = () => measure();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.clearTimeout(t1);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, step, measure]);

  // Trava a rolagem do fundo enquanto o tutorial está aberto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Posiciona o balão: abaixo do alvo quando há espaço, senão acima.
  useLayoutEffect(() => {
    const el = bubbleRef.current;
    if (!el || !box) return;
    const h = el.offsetHeight;
    const spaceBelow = window.innerHeight - (box.top + box.height);
    const above = spaceBelow < h + 32 && box.top > h + 32;
    const top = above ? box.top - 20 : box.top + box.height + 20;
    const left = Math.min(
      Math.max(16, box.left + box.width / 2 - BUBBLE_WIDTH / 2),
      window.innerWidth - BUBBLE_WIDTH - 16
    );
    el.style.top = `${Math.max(12, Math.min(top, window.innerHeight - h - 12))}px`;
    el.style.left = `${left}px`;
    el.style.transform = above ? "translateY(-100%)" : "none";
  }, [box, index, step]);

  if (!open || !step) return null;

  const isLast = index === steps.length - 1;
  const next = () => (isLast ? onDone() : setIndex((i) => i + 1));
  const prev = () => setIndex((i) => Math.max(0, i - 1));

  return (
    <>
      {/* Clicador invisível: impede cliques no conteúdo atrás do tutorial */}
      <div className="fixed inset-0 z-[995]" aria-hidden />

      {/* Spotlight com furo na área destacada */}
      {box ? (
        <div className="fixed inset-0 z-[996] pointer-events-none">
          <div
            className="fixed rounded-2xl border-2 border-amber-400 shadow-[0_0_0_200vmax_rgba(0,0,0,0.72)]"
            style={{
              top: box.top - 6,
              left: box.left - 6,
              width: box.width + 12,
              height: box.height + 12,
            }}
          />
        </div>
      ) : (
        <div className="fixed inset-0 z-[996] bg-black/70 pointer-events-none" />
      )}

      {/* Balão do passo atual */}
      <div
        ref={bubbleRef}
        className="fixed z-[997] w-80 rounded-2xl border border-amber-400/40 bg-card p-4 shadow-2xl shadow-black/60"
        style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
        role="dialog"
        aria-live="polite"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-amber-400 text-black flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </span>
            <p className="font-bold text-sm text-foreground leading-tight">{step.title}</p>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap pt-1">
            {index + 1}/{steps.length}
          </span>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">{step.text}</p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onDone}
            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Pular tutorial
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={prev}
              disabled={index === 0}
              aria-label="Passo anterior"
              className="w-8 h-8 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-amber-400/60 disabled:opacity-30 disabled:hover:border-border flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={next}
              className="h-8 px-3.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-xs font-extrabold flex items-center gap-1.5 transition-colors"
            >
              {index === 0 ? "Começar" : isLast ? "Concluir" : "Próximo"}
              {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
