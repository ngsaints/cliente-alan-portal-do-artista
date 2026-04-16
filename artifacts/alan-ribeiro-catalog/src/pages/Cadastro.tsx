import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, User, MapPin, Link2, Image, Star, Eye, EyeOff, Check, Loader2, X, Phone } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useGenres } from "@/hooks/useGenres";

interface Plan {
  id: string;
  nome: string;
  label: string;
  preco: string;
  limiteMusicas: number;
  personalizacaoPercent: number;
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


type Step = 1 | 2 | 3 | 4 | 5;

export default function Cadastro() {
  const [location, setLocation] = useLocation();
  const [step, setStep] = useState<Step>(1);
  const { genres } = useGenres();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  const handleNext = () => {
    if (step === 1) {
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
    setStep((s) => (Math.min(s + 1, 5) as Step));
  };

  const handleBack = () => {
    setError("");
    setStep((s) => (Math.max(s - 1, 1) as Step));
  };

  const handleSubmit = async () => {
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

      if (!res.ok) {
        throw new Error(result.error || "Erro ao cadastrar");
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
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Foto de Perfil</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFormData({ ...formData, capaFile: e.target.files?.[0] || null })}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground file:mr-2 file:py-1 file:px-3 file:rounded-lg file:bg-primary/10 file:text-primary file:border-0 file:cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Banner do Perfil</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFormData({ ...formData, bannerFile: e.target.files?.[0] || null })}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground file:mr-2 file:py-1 file:px-3 file:rounded-lg file:bg-primary/10 file:text-primary file:border-0 file:cursor-pointer"
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              Escolha seu Plano
            </h3>
            <div className="space-y-3">
              {PLANS.map((plan) => {
                const isSelected = formData.plano === plan.id;
                const isFree = plan.id === "free";

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
              Cadastre-se
            </h1>
            <p className="text-muted-foreground mt-2">
              Passo {step} de 5
            </p>
          </motion.div>

          {/* Progress bar */}
          <div className="flex gap-2 mb-8">
            {[1, 2, 3, 4, 5].map((s) => (
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
              {step < 5 ? (
                <button
                  onClick={handleNext}
                  className="flex-1 py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  Continuar
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
