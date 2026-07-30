import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Eye, EyeOff, Loader2, User, MapPin, Image, Star, Check, X, Phone, Zap, ArrowLeft, Info, Crown, AlertTriangle } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useGenres } from "@/hooks/useGenres";
import { ImageCrop } from "@/components/ImageCrop";
import { buildPlanFeatures } from "@/lib/utils";
import { CitySearch } from "@/components/CitySearch";

const PROFISSOES = ["Cantor", "Compositor", "Banda", "Grupo", "Dupla", "Outro"];

type Tab = "login" | "cadastro";
type CadastroStep = "planos" | 1 | 2 | 3 | 4 | 5;

export default function ArtistLogin() {
  const [, setLocation] = useLocation();
  const search = useSearch();

  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });

  useEffect(() => {
    const params = new URLSearchParams(search);
    const tab: Tab = params.get("tab") === "cadastro" ? "cadastro" : "login";
    setActiveTab(tab);
  }, [search]);

  const [dbPlans, setDbPlans] = useState<any[]>([]);
  const [cadastroStep, setCadastroStep] = useState<CadastroStep>("planos");
  const [selectedPlan, setSelectedPlan] = useState<string>("premium");
  const [cropingCapa, setCroppingCapa] = useState<File | null>(null);
  const [capaPreview, setCapaPreview] = useState<string>("");
  const [bannerPreview, setBannerPreview] = useState<string>("");
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
    plano: "premium",
  });
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<{ discountType: string; discountValue: string; discountAmount: string; finalPrice: string; originalPrice: string } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const { genres } = useGenres();

  useEffect(() => {
    fetch("/api/artists/status", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data.loggedIn) {
          setLocation("/artista/dashboard");
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, []);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const mapped = data.map((p: any) => ({
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
      .catch(console.error);
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/artists/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(loginData),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao fazer login");
      setLocation("/artista/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  const handleNextCadastro = () => {    
    if (cadastroStep === "planos") {
      setFormData({ ...formData, plano: selectedPlan });
      setCadastroStep(1);
      setError("");
      return;
    }
    if (cadastroStep === 1) {
      if (!formData.name || !formData.email || !formData.password || !formData.documento) {
        setError("Preencha todos os campos obrigatórios");
        return;
      }
      if (formData.password.length < 6) {
        setError("Senha deve ter pelo menos 6 caracteres");
        return;
      }
      handleSubmitCadastro();
    }
  };

  const handleBackCadastro = () => {
    setError("");
    setCadastroStep("planos");
  };

  const handleSubmitCadastro = async () => {
    if (!formData.name || !formData.email || !formData.password || !formData.documento) {
      setError("Preencha todos os campos obrigatórios");
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
      if (!res.ok) throw new Error(result.error || "Erro ao cadastrar");
      if (result.invoiceUrl) {
        window.open(result.invoiceUrl, "_blank");
      }
      setLocation("/artista/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar");
    } finally {
      setLoading(false);
    }
  };

  const renderCadastroStep = () => {
    if (cadastroStep === "planos") {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold text-foreground">Escolha seu Plano</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dbPlans.length === 0 ? <div className="col-span-2 text-center py-8 text-muted-foreground">Carregando planos...</div> : dbPlans.filter(p => p.id !== "free").map((plan) => {
              const isSelected = selectedPlan === plan.id;
              const isPremium = plan.id === "premium";
              return (
                <motion.div
                  key={plan.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                      : "border-border/40 bg-card/60 hover:border-border"
                  }`}
                >
                  {isPremium && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground font-black text-[9px] px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider">
                      Recomendado
                    </div>
                  )}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-foreground text-base">{plan.label}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{plan.tagline}</p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-border/30 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-primary">
                      R$ {parseFloat(plan.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-muted-foreground">/mês</span>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {plan.features.slice(0, 4).map((f: string, i: number) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{f}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      );
    }

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
          <label className="block text-sm font-medium text-muted-foreground mb-1">CPF / CNPJ *</label>
          <input
            type="text"
            value={formData.documento}
            onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
            className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="000.000.000-00"
            required
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

        {selectedPlan !== "free" && (
          <div className="pt-2 border-t border-border/40 space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Cupom de Desconto
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null); }}
                  placeholder="Insira seu cupom"
                  className="flex-1 px-4 py-2 bg-input border border-border rounded-xl text-foreground text-sm font-mono focus:border-primary focus:ring-1 focus:ring-primary uppercase"
                />
                <button
                  type="button"
                  onClick={handleValidateCoupon}
                  disabled={!couponCode || validatingCoupon}
                  className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 text-sm"
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

            <div className="pt-2 border-t border-border/40 space-y-2">
              <label className="block text-xs font-medium text-muted-foreground">
                Forma de Pagamento
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, billingType: "CREDIT_CARD" })}
                  className={`flex-1 py-2 px-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
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
                  className={`flex-1 py-2 px-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
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
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/80 pb-32">
      <Navbar />

      <section className="pt-24 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Portal do Artista
            </div>
          </motion.div>

          {/* Tab switcher */}
          {activeTab === "login" ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="bg-card border border-border/40 rounded-2xl p-6">
                <h1 className="text-2xl font-extrabold text-foreground text-center mb-1">Login do Artista</h1>
                <p className="text-sm text-muted-foreground text-center mb-6">Acesse sua conta para gerenciar suas músicas</p>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3"
                  >
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Email ou senha incorretos</p>
                      <p className="text-xs text-red-400/70 mt-1">Verifique suas credenciais e tente novamente. Se esqueceu a senha, clique em "Esqueci minha senha" abaixo.</p>
                    </div>
                  </motion.div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
                    <input
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                      className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="seu@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Senha</label>
                    <div className="relative" style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
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

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </button>
                </form>

                <div className="mt-6 pt-4 border-t border-border/40 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    <button
                      onClick={() => setLocation("/artista/forgot")}
                      className="text-primary hover:underline font-medium"
                    >
                      Esqueci minha senha
                    </button>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Não tem uma conta?{" "}
                    <button
                      onClick={() => { setActiveTab("cadastro"); setCadastroStep("planos"); setError(""); }}
                      className="text-primary hover:underline font-bold"
                    >
                      Cadastre-se
                    </button>
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="bg-card border border-border/40 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-2xl font-extrabold text-foreground">
                    {cadastroStep === "planos" ? "Escolha seu Plano" : "Assinatura do Portal"}
                  </h1>
                  <button
                    onClick={() => { setActiveTab("login"); setError(""); }}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Login
                  </button>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  {cadastroStep === "planos"
                    ? "Escolha o plano ideal para sua carreira"
                    : "Preencha seus dados para finalizar"}
                </p>

                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <AnimatePresence mode="wait">
                  <motion.div
                    key={String(cadastroStep)}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    {renderCadastroStep()}
                  </motion.div>
                </AnimatePresence>

                <div className="flex gap-3 mt-6">
                  {cadastroStep !== "planos" && (
                    <button
                      onClick={handleBackCadastro}
                      className="flex-1 py-3 rounded-xl font-semibold bg-muted text-foreground hover:bg-muted/80 transition-colors flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Voltar
                    </button>
                  )}
                   {cadastroStep === "planos" ? (
                    <button
                      onClick={handleNextCadastro}
                      className="w-full py-3 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20 text-sm"
                    >
                      <Zap className="w-4 h-4" />
                      {(() => {
                        const plan = dbPlans.find(p => p.id === selectedPlan);
                        if (!plan) return "Continuar";
                        const planLabel = plan.id === "free" ? "Gratuito" : plan.label;
                        const planPrice = plan.id === "free" ? "R$ 0,00" : `R$ ${parseFloat(plan.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês`;
                        return `Continuar com o plano ${planLabel} (${planPrice})`;
                      })()}
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmitCadastro}
                      disabled={loading}
                      className="flex-1 py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
              </div>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
