import { useState, useEffect } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, Eye, EyeOff, Check, Loader2, Phone, CreditCard, Lock, ShieldCheck, UserCheck, Info } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { buildPlanFeatures } from "@/lib/utils";

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

export default function Cadastro() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const rawPlanParam = new URLSearchParams(search).get("plano");
  // Default to premium if not specified
  const selectedPlanId = rawPlanParam || "premium";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [dbPlans, setDbPlans] = useState<Plan[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<{ discountType: string; discountValue: string; discountAmount: string; finalPrice: string; originalPrice: string } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);

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
    plano: selectedPlanId,
    billingType: "CREDIT_CARD" as "CREDIT_CARD" | "PIX",
  });

  useEffect(() => {
    if (rawPlanParam) {
      setFormData((prev) => ({ ...prev, plano: rawPlanParam }));
    }
  }, [rawPlanParam]);

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

  const isFreePlan = formData.plano === "free";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      setError("Preencha todos os campos obrigatórios (Nome, Email e Senha)");
      return;
    }
    if (!isFreePlan && !formData.documento) {
      setError("CPF ou CNPJ é obrigatório para a assinatura do perfil profissional");
      return;
    }
    if (formData.password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
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
      if (couponCode && couponResult && !isFreePlan) {
        data.append("couponCode", couponCode);
      }

      const res = await fetch("/api/artists/register", {
        method: "POST",
        body: data,
        credentials: "include",
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Erro ao efetuar cadastro");
      }

      // Se for plano pago e retornou fatura do Asaas, redireciona para o Asaas
      if (result.invoiceUrl && !isFreePlan) {
        window.location.href = result.invoiceUrl;
        return;
      }

      // Plano free ou ativado diretamente: vai direto para o dashboard
      setLocation("/artista/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao efetuar cadastro");
      setLoading(false);
    }
  };

  const activePlanObj = dbPlans.find(p => p.id === formData.plano) || {
    id: isFreePlan ? "free" : "premium",
    label: isFreePlan ? "Gratuito (Experimental)" : "Premium (Profissional)",
    preco: isFreePlan ? "0.00" : "25.00",
    limiteMusicas: isFreePlan ? 4 : 50,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/80 pb-32">
      <Navbar />

      <section className="pt-24 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              {isFreePlan ? "Plano Experimental" : "Ativação Instantânea"}
            </div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
              {isFreePlan ? "Cadastro do Plano Gratuito" : "Assinatura do Perfil Profissional"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isFreePlan ? "Crie sua conta em 1 minuto para conhecer a plataforma." : "Preencha os dados abaixo para ativar sua página e catálogo profissional."}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/40 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl backdrop-blur-md"
          >
            {/* Disclaimer para Plano Free */}
            {isFreePlan && (
              <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs space-y-1.5 leading-relaxed">
                <div className="flex items-center gap-2 font-bold text-amber-400 uppercase tracking-wider text-[11px]">
                  <Info className="w-4 h-4 shrink-0" />
                  Plano Experimental e Limitado
                </div>
                <p>
                  Este plano é voltado exclusivamente para você testar a experiência e conhecer os recursos (limite de até 4 músicas no catálogo).
                </p>
              </div>
            )}

            {/* Box do Plano Selecionado (Dedicado) */}
            <div className="p-4 rounded-2xl border border-primary/40 bg-primary/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-primary px-2 py-0.5 rounded bg-primary/20">
                  Plano Selecionado
                </span>
                <h3 className="text-xl font-extrabold text-white mt-1">{activePlanObj.label}</h3>
                {activePlanObj.limiteMusicas > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Até {activePlanObj.limiteMusicas} músicas catalogadas
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-primary">
                  {isFreePlan ? "GRÁTIS" : `R$ ${couponResult ? parseFloat(couponResult.finalPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : parseFloat(activePlanObj.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                </span>
                {!isFreePlan && <span className="text-xs text-muted-foreground block">/mês</span>}
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Seu Nome ou Nome Artístico *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full bg-background border border-border/80 rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Ex: Alan Ribeiro"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  E-mail *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full bg-background border border-border/80 rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="seu@email.com"
                />
              </div>

              {/* CPF / CNPJ exibido como obrigatório no pago e opcional no free */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  {isFreePlan ? "CPF ou CNPJ (Opcional)" : "CPF ou CNPJ *"}
                </label>
                <input
                  type="text"
                  value={formData.documento}
                  onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                  required={!isFreePlan}
                  className="w-full bg-background border border-border/80 rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Telefone / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="tel"
                    value={formData.contato}
                    onChange={(e) => setFormData({ ...formData, contato: e.target.value })}
                    className="w-full bg-background border border-border/80 rounded-xl px-4 py-3 pl-10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Crie uma Senha *
                </label>
                <div className="relative" style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="w-full bg-background border border-border/80 rounded-xl px-4 py-3 pr-12 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground"
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Cupom e Forma de Pagamento (Exibidos APENAS para planos pagos) */}
              {!isFreePlan && (
                <>
                  <div className="pt-3 border-t border-border/30 space-y-2">
                    <label className="block text-xs font-medium text-muted-foreground">
                      Tem um Cupom de Desconto?
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null); }}
                        placeholder="Insira seu cupom"
                        className="flex-1 px-4 py-2 bg-input border border-border rounded-xl text-foreground text-xs font-mono focus:border-primary uppercase"
                      />
                      <button
                        type="button"
                        onClick={handleValidateCoupon}
                        disabled={!couponCode || validatingCoupon}
                        className="px-4 py-2 bg-primary/20 text-primary hover:bg-primary/30 font-bold rounded-xl transition-all disabled:opacity-50 text-xs border border-primary/30 cursor-pointer"
                      >
                        {validatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Aplicar"}
                      </button>
                    </div>
                    {couponError && <p className="text-xs text-red-400 mt-1">{couponError}</p>}
                    {couponResult && (
                      <p className="text-xs text-green-400 mt-1 font-semibold">
                        Cupom aplicado! Desconto de {couponResult.discountType === "percentage" ? `${couponResult.discountValue}%` : `R$ ${parseFloat(couponResult.discountValue).toFixed(2)}`}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-border/30 space-y-2">
                    <label className="block text-xs font-medium text-muted-foreground">
                      Forma de Pagamento
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, billingType: "CREDIT_CARD" })}
                        className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          formData.billingType === "CREDIT_CARD"
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-border/40 bg-input text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        Cartão de Crédito
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, billingType: "PIX" })}
                        className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          formData.billingType === "PIX"
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-border/40 bg-input text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span className="font-extrabold">PIX</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 mt-4 rounded-xl font-black text-sm bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-[0_8px_30px_rgba(245,197,24,0.35)] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer uppercase tracking-wider"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isFreePlan ? "Criando sua conta..." : "Abrindo checkout seguro..."}
                  </>
                ) : isFreePlan ? (
                  <>
                    <UserCheck className="w-4 h-4" />
                    CRIAR MINHA CONTA GRATUITA
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    FINALIZAR ASSINATURA AGORA
                  </>
                )}
              </button>

              <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-muted-foreground/80">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {isFreePlan ? "Acesso instantâneo sem necessidade de cartão" : "Pagamento 100% seguro processado pelo Asaas"}
                </span>
              </div>
            </form>

            {/* Alternativa Discreta no Rodapé do Formulário */}
            <div className="pt-4 border-t border-border/30 text-center text-xs text-muted-foreground">
              {isFreePlan ? (
                <span>
                  Quer ativar a conta profissional completa por apenas R$ 25,00/mês?{" "}
                  <Link href="/cadastro?plano=premium" className="text-primary font-bold hover:underline">
                    Clique aqui para o Plano Profissional
                  </Link>
                </span>
              ) : (
                <span>
                  Quer apenas experimentar a plataforma gratuitamente primeiro?{" "}
                  <Link href="/cadastro?plano=free" className="text-primary font-bold hover:underline">
                    Clique aqui para o Plano Gratuito
                  </Link>
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
