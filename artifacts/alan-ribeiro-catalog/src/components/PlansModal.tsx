import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Check, ExternalLink } from "lucide-react";

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
}

const PLANS: Plan[] = [
  {
    id: "free",
    nome: "free",
    label: "Free Experimental",
    preco: "0",
    limiteMusicas: 2,
    personalizacaoPercent: 10,
    fraseEfeito: "Experimente e veja seu trabalho ganhar destaque!",
    features: ["2 músicas", "10% personalização", "Capa básica", "Bio do artista"],
  },
  {
    id: "basico",
    nome: "basico",
    label: "Básico",
    preco: "19.90",
    limiteMusicas: 10,
    personalizacaoPercent: 20,
    fraseEfeito: "Comece a profissionalizar seu trabalho agora!",
    features: ["10 músicas", "20% personalização", "Capa + Bio", "Playlist pública", "Links sociais"],
  },
  {
    id: "intermediario",
    nome: "intermediario",
    label: "Intermediário",
    preco: "39.90",
    limiteMusicas: 25,
    personalizacaoPercent: 50,
    fraseEfeito: "Impulsione sua carreira com visibilidade profissional!",
    features: ["25 músicas", "50% personalização", "Capa + Bio + Playlist", "Tema customizável", "Links sociais", "Banner"],
  },
  {
    id: "pro",
    nome: "pro",
    label: "Profissional",
    preco: "79.90",
    limiteMusicas: 50,
    personalizacaoPercent: 80,
    fraseEfeito: "Seu perfil profissional com máxima qualidade!",
    features: ["50 músicas", "80% personalização", "Tudo do Intermediário", "Player customizável", "Fonte personalizada", "Layout avançado", "Destaque na busca"],
  },
  {
    id: "premium",
    nome: "premium",
    label: "Premium",
    preco: "149.90",
    limiteMusicas: 100,
    personalizacaoPercent: 100,
    fraseEfeito: "Transforme seu perfil em portfólio profissional completo!",
    features: ["100 músicas", "100% personalização", "Tudo do Pro", "Máxima visibilidade", "Suporte prioritário", "Estatísticas avançadas", "Selos exclusivos"],
  },
];

interface PlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan?: (planId: string) => void;
}

export function PlansModal({ isOpen, onClose, onSelectPlan }: PlansModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleContratar = (planId: string) => {
    setSelectedPlan(planId);
    onSelectPlan?.(planId);
  };

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
            {/* Header */}
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

            {/* Plans list */}
            <div className="space-y-3">
              {PLANS.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                const isFree = plan.id === "free";

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl border transition-all overflow-hidden ${
                      isSelected
                        ? "border-primary/50 bg-primary/5"
                        : plan.id === "premium"
                        ? "border-primary/30 bg-gradient-to-r from-primary/10 to-transparent"
                        : "border-border/40 bg-card/50 hover:border-border"
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-foreground">{plan.label}</h4>
                            {plan.id === "premium" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                                ⭐ TOP
                              </span>
                            )}
                            {isFree && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                                GRÁTIS
                              </span>
                            )}
                          </div>

                          <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-2xl font-extrabold text-primary">
                              R$ {parseFloat(plan.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                            {!isFree && <span className="text-xs text-muted-foreground">/mês</span>}
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

                          {/* Feature samples */}
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
                        </div>
                      </div>

                      <button
                        onClick={() => handleContratar(plan.id)}
                        className={`w-full mt-3 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                          isFree
                            ? "bg-muted text-foreground hover:bg-muted/80"
                            : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        {isFree ? "Começar Grátis" : `Contratar ${plan.label}`}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-border/40 text-center">
              <p className="text-xs text-muted-foreground mb-2">
                Cada plano é pensado para o momento da sua carreira.
              </p>
              <button
                onClick={onClose}
                className="text-sm text-primary hover:underline flex items-center gap-1 mx-auto"
              >
                Fechar
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
