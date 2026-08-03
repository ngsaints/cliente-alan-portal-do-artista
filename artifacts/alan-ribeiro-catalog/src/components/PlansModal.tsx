import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Check, ExternalLink, Loader2 } from "lucide-react";
import { buildPlanFeatures } from "@/lib/utils";

interface Plan {
  id: string;
  nome: string;
  label: string;
  preco: string;
  limiteMusicas: number;
  personalizacaoPercent: number;
  descricao?: string;
  fraseEfeito?: string;
  features: string[];
  aiCreditsLimit?: number;
}

interface PlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan?: (planId: string, couponCode?: string) => void;
}

export function PlansModal({ isOpen, onClose, onSelectPlan }: PlansModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<{ discountType: string; discountValue: string; discountAmount: string; finalPrice: string; originalPrice: string } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSelectedPlan(null);
    setCouponCode("");
    setCouponResult(null);
    setCouponError("");
    setConfirming(false);
    fetch("/api/plans")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const mapped: Plan[] = data.map((p: any) => ({
            id: p.nome,
            nome: p.nome,
            label: p.label,
            preco: p.preco,
            limiteMusicas: parseInt(p.limiteMusicas) || 0,
            personalizacaoPercent: parseInt(p.personalizacaoPercent) || 0,
            descricao: p.descricao || undefined,
            fraseEfeito: p.fraseEfeito || undefined,
            features: buildPlanFeatures(p),
          }));
          setPlans(mapped);
        }
      })
      .catch((err) => console.error("Erro ao carregar planos:", err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleSelectPlan = (planId: string) => {
    onSelectPlan?.(planId);
  };

  const handleValidateCoupon = async () => {
    if (!couponCode || !selectedPlan) return;
    setValidatingCoupon(true);
    setCouponError("");
    setCouponResult(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, planId: selectedPlan }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setCouponError(data.error || "Cupom inválido para este plano");
      } else {
        setCouponResult(data.coupon);
      }
    } catch {
      setCouponError("Erro ao validar cupom");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedPlan) return;
    setConfirming(true);
    onSelectPlan?.(selectedPlan, couponResult ? couponCode : undefined);
  };

  const isFree = selectedPlan === "free";
  const canConfirm = selectedPlan && (!isFree || isFree);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-card border border-border/40 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-card/95 backdrop-blur-sm pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-primary fill-primary" />
                <h3 className="text-lg font-bold text-foreground">Planos Disponíveis</h3>
              </div>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {loading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
              {!loading && plans.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum plano disponível no momento.
                </div>
              )}
              {!loading && plans.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                const planIsFree = plan.id === "free";
                const showDiscount = couponResult && isSelected && !planIsFree;

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`rounded-xl border transition-all overflow-hidden cursor-pointer ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20"
                        : plan.id === "premium"
                        ? "border-primary/30 bg-gradient-to-r from-primary/10 to-transparent hover:border-primary/50"
                        : "border-border/40 bg-card/50 hover:border-border"
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-foreground">{plan.label}</h4>
                              {plan.id === "premium" && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                                  ⭐ TOP
                                </span>
                              )}
                              {planIsFree && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                                  GRÁTIS
                                </span>
                              )}
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                                <Check className="w-3.5 h-3.5 text-white" />
                              </div>
                            )}
                          </div>

                          <div className="flex items-baseline gap-1 mb-2">
                            {showDiscount ? (
                              <>
                                <span className="text-2xl font-extrabold text-green-400">
                                  R$ {parseFloat(couponResult.finalPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </span>
                                <span className="text-sm text-muted-foreground line-through">
                                  R$ {parseFloat(plan.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </span>
                              </>
                            ) : (
                              <span className="text-2xl font-extrabold text-primary">
                                R$ {parseFloat(plan.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </span>
                            )}
                            {!planIsFree && <span className="text-xs text-muted-foreground">/mês</span>}
                          </div>

                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="bg-background/50 rounded-lg px-2.5 py-1.5 text-center">
                              <p className="text-[10px] text-muted-foreground">Músicas</p>
                              <p className="text-sm font-bold text-foreground">{plan.limiteMusicas}</p>
                            </div>
                            <div className="bg-background/50 rounded-lg px-2.5 py-1.5 text-center">
                              <p className="text-[10px] text-muted-foreground">Personalização</p>
                              <p className="text-sm font-bold text-foreground">{plan.personalizacaoPercent}%</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {plan.features.slice(0, 4).map((f, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 text-primary"
                              >
                                {f}
                              </span>
                            ))}
                            {plan.features.length > 4 && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground">
                                +{plan.features.length - 4}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground italic">{plan.fraseEfeito}</p>
                          {isSelected && (
                            <div className="mt-3 p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-extrabold text-emerald-400 flex items-center justify-center gap-1.5 animate-pulse">
                              <Check className="w-3.5 h-3.5" />
                              Você está escolhendo esse plano
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {selectedPlan && !isFree && (
              <div className="mt-4 pt-4 border-t border-border/40">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Cupom de Desconto
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null); setCouponError(""); }}
                    placeholder="Insira seu cupom"
                    className="flex-1 px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm font-mono focus:border-primary focus:ring-1 focus:ring-primary uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleValidateCoupon}
                    disabled={!couponCode || validatingCoupon}
                    className="px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 text-sm"
                  >
                    {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
                  </button>
                </div>
                {couponError && (
                  <p className="text-xs text-red-400 mt-1">{couponError}</p>
                )}
                {couponResult && (
                  <p className="text-xs text-green-400 mt-1">
                    Cupom aplicado! Desconto de {couponResult.discountType === "percentage" ? `${couponResult.discountValue}%` : `R$ ${parseFloat(couponResult.discountValue).toFixed(2)}`}
                  </p>
                )}
              </div>
            )}

            {selectedPlan && (
              <div className="mt-6 pt-4 border-t border-border/40 space-y-3">
                <p className="text-xs text-muted-foreground text-center">
                  {isFree
                    ? "Plano gratuito — sem cobrança."
                    : couponResult
                    ? `Total: R$ ${parseFloat(couponResult.finalPrice).toFixed(2)} (economia de R$ ${parseFloat(couponResult.discountAmount).toFixed(2)})`
                    : "Clique em Confirmar para prosseguir."}
                </p>
                <button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    isFree
                      ? "bg-muted text-foreground hover:bg-muted/80"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                  } disabled:opacity-50`}
                >
                  {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {(() => {
                    const plan = plans.find(p => p.id === selectedPlan);
                    if (!plan) return "Confirmar";
                    const planLabel = plan.id === "free" ? "Gratuito" : plan.label;
                    const finalPrice = couponResult ? couponResult.finalPrice : plan.preco;
                    const planPrice = plan.id === "free" ? "R$ 0,00" : `R$ ${parseFloat(finalPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês`;
                    return isFree ? `Começar Grátis (${planPrice})` : `Confirmar Plano ${planLabel} (${planPrice})`;
                  })()}
                </button>
              </div>
            )}

            {!selectedPlan && (
              <div className="mt-6 pt-4 border-t border-border/40 text-center">
                <p className="text-xs text-muted-foreground mb-2">
                  Selecione um plano acima para continuar.
                </p>
                <button
                  onClick={onClose}
                  className="text-sm text-primary hover:underline flex items-center gap-1 mx-auto"
                >
                  Fechar
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
