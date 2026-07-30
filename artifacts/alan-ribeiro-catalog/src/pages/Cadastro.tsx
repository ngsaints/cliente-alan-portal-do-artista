import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, User, MapPin, Star, Eye, EyeOff, Check, Loader2, X, Phone, CreditCard } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useGenres } from "@/hooks/useGenres";
import { buildPlanFeatures } from "@/lib/utils";
import { CitySearch } from "@/components/CitySearch";

interface Plan {
  id: string;
  nome: string;
  label: string;
  preco: string;
  limiteMusicas: number;
  personalizacaoPercent: number;
  features: string[];
  aiCreditsLimit?: number;
}

const PROFISSOES = ["Cantor", "Compositor", "Banda", "Grupo", "Dupla", "Outro"];

type Step = 1 | 2;

export default function Cadastro() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const preselectedPlan = new URLSearchParams(search).get("plano") || "free";
  const [step, setStep] = useState<Step>(1);
  const { genres } = useGenres();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [dbPlans, setDbPlans] = useState<Plan[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<{ discountType: string; discountValue: string; discountAmount: string; finalPrice: string; originalPrice: string } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const handleValidateCoupon = async () => {
    if (!couponCode || !formData.plano) return;
    setValidatingCoupon(true);
    setCouponError("");
    setCouponResult(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, planId: formData.plano }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error || "Cupom inválido");
      } else if (!data.valid) {
        setCouponError("Cupom inválido para este plano");
      } else {
        setCouponResult(data.coupon);
      }
    } catch {
      setCouponError("Erro ao validar cupom");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    documento: "",
    contato: "",
    password: "",
    profissao: "Cantor",
    genero: "Sertanejo",
    cidade: "",
    capaFile: null as File | null,
    bannerFile: null as File | null,
    plano: preselectedPlan,
    billingType: "CREDIT_CARD" as "CREDIT_CARD" | "PIX",
  });

  useEffect(() => {
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
            features: buildPlanFeatures(p),
          }));
          setDbPlans(mapped);
        }
      })
      .catch((err) => console.error("Erro ao carregar planos no cadastro:", err));
  }, []);

  const handleNext = () => {
    setError("");
    setStep(2);
  };

  const handleBack = () => {
    setError("");
    setStep(1);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.password || !formData.documento) {
      setError("Preencha todos os campos obrigatórios (Nome, Email, Senha e CPF/CNPJ)");
      return;
    }
    if (formData.password.length < 6) {
      setError("Senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value instanceof File) {
          if (value) data.append(key, value);
        } else if (value) {
          data.append(key, value);
        }
      });
      if (couponCode && couponResult) {
        data.append("couponCode", couponCode);
      }

      const res = await fetch("/api/artists/register", {
        method: "POST",
        body: data,
        credentials: "include",
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Erro ao cadastrar");
      }

      if (result.pixDetails) {
        sessionStorage.setItem("pending_pix_details", JSON.stringify({
          encodedImage: result.pixDetails.encodedImage,
          payload: result.pixDetails.payload,
          expirationDate: result.pixDetails.expirationDate,
          invoiceUrl: result.invoiceUrl || undefined,
        }));
      } else if (result.invoiceUrl) {
        window.open(result.invoiceUrl, "_blank");
      }

      setLocation("/artista/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              Escolha seu Plano
            </h3>
            <div className="space-y-3">
              {(dbPlans.length > 0 ? dbPlans : []).map((plan) => {
                const isSelected = formData.plano === plan.id;
                const isFree = plan.id === "free";
                const selectedPlanPrice = parseFloat(plan.preco);
                const showDiscount = couponResult && plan.id === formData.plano && !isFree;

                return (
                  <motion.div
                    key={plan.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setFormData({ ...formData, plano: plan.id })}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/40 bg-card/50 hover:border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-foreground">{plan.label}</h4>
                          {isFree && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400">
                              GRÁTIS
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-1 mt-1">
                          {showDiscount ? (
                            <>
                              <span className="text-xl font-bold text-green-400">
                                R$ {parseFloat(couponResult.finalPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-sm text-muted-foreground line-through">
                                R$ {selectedPlanPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-xs font-bold text-green-400">
                                (-{couponResult.discountType === "percentage" ? `${couponResult.discountValue}%` : `R$ ${parseFloat(couponResult.discountValue).toFixed(2)}`})
                              </span>
                            </>
                          ) : (
                            <span className="text-xl font-bold text-primary">
                              R$ {selectedPlanPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                          )}
                          {!isFree && <span className="text-xs text-muted-foreground">/mês</span>}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {plan.features.map((f, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 text-primary">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Coupon Code & Payment Choice */}
            {formData.plano !== "free" && (
              <div className="space-y-4">
                <div className="pt-2 border-t border-border/40">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Cupom de Desconto
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null); }}
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

                <div className="pt-4 border-t border-border/40 space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Forma de Pagamento
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, billingType: "CREDIT_CARD" })}
                      className={`flex-1 py-2.5 px-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                        formData.billingType === "CREDIT_CARD"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/40 bg-input text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      Cartão de Crédito
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, billingType: "PIX" })}
                      className={`flex-1 py-2.5 px-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                        formData.billingType === "PIX"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/40 bg-input text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="font-bold">PIX</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Seus Dados de Cadastro
            </h3>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Nome do Artista / Nome *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Seu nome artístico ou completo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Telefone / WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="tel"
                  value={formData.contato}
                  onChange={(e) => setFormData({ ...formData, contato: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 pl-10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">CPF ou CNPJ (Obrigatório para faturamento) *</label>
              <input
                type="text"
                value={formData.documento}
                onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                required
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Ex: 000.000.000-00 ou 00.000.000/0000-00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Senha *</label>
              <div className="relative" style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 pr-12 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground hover:text-foreground"
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Profissão</label>
                <select
                  value={formData.profissao}
                  onChange={(e) => setFormData({ ...formData, profissao: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {PROFISSOES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Gênero Musical Principal</label>
                <select
                  value={formData.genero}
                  onChange={(e) => setFormData({ ...formData, genero: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {genres.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Cidade/Estado</label>
              <CitySearch value={formData.cidade} onChange={(v) => setFormData({ ...formData, cidade: v })} />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/80 pb-32">
      <Navbar />

      <section className="pt-24 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Portal do Artista
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground">
              Assinatura do Portal
            </h1>
            <p className="text-muted-foreground mt-2">
              Passo {step} de 2
            </p>
          </motion.div>

          {/* Progress bar (2 steps) */}
          <div className="flex gap-2 mb-8">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full transition-all ${
                  s <= step ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>

          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card border border-border/40 rounded-2xl p-6"
          >
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {renderStep()}

            <div className="flex gap-3 mt-6">
              {step > 1 && (
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 rounded-xl font-semibold bg-muted text-foreground hover:bg-muted/80 transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Voltar
                </button>
              )}
              {step < 2 ? (
                <button
                  onClick={handleNext}
                  className="flex-1 py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  Continuar para Seus Dados
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Finalizar Cadastro
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
