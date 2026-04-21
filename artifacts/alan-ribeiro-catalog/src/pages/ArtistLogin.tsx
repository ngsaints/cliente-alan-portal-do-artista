import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Eye, EyeOff, Loader2, User, MapPin, Link2, Image, Star, Check, X, Phone, Zap, ArrowLeft, Info } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useGenres } from "@/hooks/useGenres";
import { ImageCrop } from "@/components/ImageCrop";

const PLANS = [
  {
    id: "free",
    nome: "free",
    label: "Free Experimental",
    preco: "0",
    limiteMusicas: 2,
    personalizacaoPercent: 10,
    features: ["2 músicas", "10% personalização", "Capa básica"],
  },
  {
    id: "basico",
    nome: "basico",
    label: "Básico",
    preco: "19.90",
    limiteMusicas: 10,
    personalizacaoPercent: 20,
    features: ["10 músicas", "20% personalização", "Links sociais"],
  },
  {
    id: "intermediario",
    nome: "intermediario",
    label: "Intermediário",
    preco: "39.90",
    limiteMusicas: 25,
    personalizacaoPercent: 50,
    features: ["25 músicas", "50% personalização", "Banner"],
  },
  {
    id: "pro",
    nome: "pro",
    label: "Profissional",
    preco: "79.90",
    limiteMusicas: 50,
    personalizacaoPercent: 80,
    features: ["50 músicas", "80% personalização", "Player customizável"],
  },
  {
    id: "premium",
    nome: "premium",
    label: "Premium",
    preco: "149.90",
    limiteMusicas: 100,
    personalizacaoPercent: 100,
    features: ["100 músicas", "100% personalização", "Máxima visibilidade"],
  },
];

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

  const [cadastroStep, setCadastroStep] = useState<CadastroStep>("planos");
  const [selectedPlan, setSelectedPlan] = useState<string>("free");
  const [cropingCapa, setCroppingCapa] = useState<File | null>(null);
  const [capaPreview, setCapaPreview] = useState<string>("");
  const [bannerPreview, setBannerPreview] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contato: "",
    password: "",
    profissao: "Cantor",
    genero: "Sertanejo",
    cidade: "",
    instagram: "",
    tiktok: "",
    spotify: "",
    capaFile: null as File | null,
    bannerFile: null as File | null,
    plano: "free",
  });
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
      if (!formData.name || !formData.email || !formData.password) {
        setError("Preencha todos os campos obrigatórios");
        return;
      }
      if (formData.password.length < 6) {
        setError("Senha deve ter pelo menos 6 caracteres");
        return;
      }
    }
    setError("");
    setCadastroStep((s) => (typeof s === "number" ? Math.min(s + 1, 5) : s) as CadastroStep);
  };

  const handleBackCadastro = () => {
    setError("");
    if (typeof cadastroStep === "number" && cadastroStep === 1) {
      setCadastroStep("planos");
    } else if (typeof cadastroStep === "number") {
      setCadastroStep((cadastroStep - 1) as CadastroStep);
    }
  };

  const handleSubmitCadastro = async () => {
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
      const res = await fetch("/api/artists/register", {
        method: "POST",
        body: data,
        credentials: "include",
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao cadastrar");
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
          <div className="space-y-3">
            {PLANS.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              const isFree = plan.id === "free";
              return (
                <motion.div
                  key={plan.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedPlan(plan.id)}
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
                        <span className="text-xl font-bold text-primary">
                          R$ {parseFloat(plan.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
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
        </div>
      );
    }

    const step = cadastroStep as number;

    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Dados Básicos
            </h3>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Nome do Artista *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Seu nome artístico"
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
              <label className="block text-sm font-medium text-muted-foreground mb-1">Senha *</label>
              <div className="relative">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
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
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Localização
            </h3>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Cidade/Estado</label>
              <input
                type="text"
                value={formData.cidade}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Ex: Maricá, RJ"
              />
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
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              Redes Sociais
            </h3>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Instagram</label>
              <input
                type="text"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="@seuinstagram"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">TikTok</label>
              <input
                type="text"
                value={formData.tiktok}
                onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="@seutiktok"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Spotify</label>
              <input
                type="url"
                value={formData.spotify}
                onChange={(e) => setFormData({ ...formData, spotify: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="https://open.spotify.com/artist/..."
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Image className="w-5 h-5 text-primary" />
              Fotos do Perfil
            </h3>

            {cropingCapa ? (
              <ImageCrop
                imageFile={cropingCapa}
                onCropComplete={(file) => {
                  setFormData({ ...formData, capaFile: file });
                  setCroppingCapa(null);
                  const url = URL.createObjectURL(file);
                  setCapaPreview(url);
                }}
                onCancel={() => setCroppingCapa(null)}
                outputWidth={400}
                outputHeight={400}
              />
            ) : (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-muted-foreground">Foto de Perfil</label>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Info className="w-3 h-3" />
                      Ideal: 400x400px
                    </span>
                  </div>
                  {capaPreview ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border">
                      <img src={capaPreview} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-primary/30" />
                      <div className="flex-1">
                        <p className="text-sm text-foreground font-medium">Foto selecionada</p>
                        <button
                          onClick={() => { setFormData({ ...formData, capaFile: null }); setCapaPreview(""); }}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Remover
                        </button>
                      </div>
                      <button
                        onClick={() => setCroppingCapa(formData.capaFile!)}
                        className="text-xs text-primary hover:underline"
                      >
                        Ajustar
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                      <Image className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Clique para selecionar</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setCroppingCapa(file);
                        }}
                      />
                    </label>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-muted-foreground">Banner do Perfil</label>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Info className="w-3 h-3" />
                      Ideal: 1200x400px
                    </span>
                  </div>
                  {bannerPreview ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border">
                      <img src={bannerPreview} alt="Preview" className="w-24 h-10 rounded-lg object-cover border border-primary/30" />
                      <div className="flex-1">
                        <p className="text-sm text-foreground font-medium">Banner selecionado</p>
                        <button
                          onClick={() => { setFormData({ ...formData, bannerFile: null }); setBannerPreview(""); }}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                      <Image className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Clique para selecionar</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setFormData({ ...formData, bannerFile: file });
                          if (file) setBannerPreview(URL.createObjectURL(file));
                        }}
                      />
                    </label>
                  )}
                </div>
              </>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              Confirmar Plano
            </h3>
            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-bold text-foreground">
                  {PLANS.find(p => p.id === formData.plano)?.label || "Free Experimental"}
                </h4>
                {formData.plano === "free" && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400">GRÁTIS</span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-primary">
                  R$ {parseFloat(PLANS.find(p => p.id === formData.plano)?.preco || "0").toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
                {formData.plano !== "free" && <span className="text-xs text-muted-foreground">/mês</span>}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {PLANS.find(p => p.id === formData.plano)?.features.map((f, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 text-primary">{f}</span>
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Revise seus dados e confirme o cadastro.
            </p>
          </div>
        );
    }
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
        <div className="max-w-md mx-auto">
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
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
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
                    <div className="relative">
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                      Cadastre-se grátis
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
                    {cadastroStep === "planos" ? "Comece Grátis" : "Cadastro"}
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
                    : `Passo ${cadastroStep} de 5`}
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
                      className="w-full py-3 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                    >
                      <Zap className="w-4 h-4" />
                      Continuar com {PLANS.find(p => p.id === selectedPlan)?.label}
                    </button>
                  ) : (cadastroStep as number) < 5 ? (
                    <button
                      onClick={handleNextCadastro}
                      className="flex-1 py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    >
                      Continuar
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmitCadastro}
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
              </div>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
