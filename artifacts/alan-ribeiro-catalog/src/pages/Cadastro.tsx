import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, User, Star, Eye, EyeOff, Check, Loader2, Phone, CreditCard, Lock } from "lucide-react";
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

export default function Cadastro() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const rawPlanParam = new URLSearchParams(search).get("plano");
  const selectedPlanId = rawPlanParam && rawPlanParam !== "free" ? rawPlanParam : "premium";

  const { genres } = useGenres();
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

      // Redireciona imediatamente para o checkout do Asaas na mesma página
      if (result.invoiceUrl) {
        window.location.href = result.invoiceUrl;
        return;
      }

      // Se for gratuito ou sem invoiceUrl, vai pro dashboard
      setLocation("/artista/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar");
      setLoading(false);
    }
  };

  const activePlanObj = dbPlans.find(p => p.id === formData.plano) || {
    id: "premium",
    label: "Premium",
    preco: "25.00",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/80 pb-32">
      <Navbar />

      <section className="pt-24 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-3">
              <Sparkles className="w-4 h-4" />
              Portal do Artista
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground">
              Finalize sua Assinatura
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Preencha seus dados para prosseguir diretamente ao pagamento seguro.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/40 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl"
          >
            {/* Box do Plano Selecionado */}
            <div className="p-4 rounded-xl border border-primary/40 bg-primary/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-primary px-2 py-0.5 rounded bg-primary/20">
                  Plano Selecionado
                </span>
                <h3 className="text-xl font-black text-white mt-1">{activePlanObj.label}</h3>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-primary">
                  R$ {couponResult ? parseFloat(couponResult.finalPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : parseFloat(activePlanObj.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-muted-foreground block">/mês</span>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Nome do Artista / Nome Completo *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Seu nome artístico ou completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">E-mail *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">CPF ou CNPJ (Obrigatório para emissão de cobrança) *</label>
                <input
                  type="text"
                  value={formData.documento}
                  onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                  required
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
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
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 pl-10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Senha de Acesso *</label>
                <div className="relative" style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 pr-12 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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

              {/* Cupom de Desconto */}
              <div className="pt-3 border-t border-border/40 space-y-2">
                <label className="block text-xs font-medium text-muted-foreground">
                  Possui Cupom de Desconto?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null); }}
                    placeholder="Insira seu cupom"
                    className="flex-1 px-4 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm font-mono focus:border-primary uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleValidateCoupon}
                    disabled={!couponCode || validatingCoupon}
                    className="px-4 py-2.5 bg-primary/20 text-primary hover:bg-primary/30 font-bold rounded-xl transition-all disabled:opacity-50 text-sm border border-primary/30"
                  >
                    {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
                  </button>
                </div>
                {couponError && <p className="text-xs text-red-400 mt-1">{couponError}</p>}
                {couponResult && (
                  <p className="text-xs text-green-400 mt-1 font-semibold">
                    Cupom aplicado! Desconto de {couponResult.discountType === "percentage" ? `${couponResult.discountValue}%` : `R$ ${parseFloat(couponResult.discountValue).toFixed(2)}`}
                  </p>
                )}
              </div>

              {/* Escolha da Forma de Pagamento */}
              <div className="pt-3 border-t border-border/40 space-y-2">
                <label className="block text-xs font-medium text-muted-foreground">
                  Forma de Pagamento Preferida
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, billingType: "CREDIT_CARD" })}
                    className={`flex-1 py-3 px-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
                    className={`flex-1 py-3 px-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      formData.billingType === "PIX"
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border/40 bg-input text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="font-bold">PIX</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 mt-6 rounded-xl font-extrabold text-base bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-[0_8px_30px_rgba(245,197,24,0.3)] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer uppercase tracking-wider"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processando e abrindo checkout...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    IR PARA O PAGAMENTO SEGURO
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
