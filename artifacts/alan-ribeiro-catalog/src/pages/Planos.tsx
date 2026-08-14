import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, Check, Zap, Star, ShieldCheck, HelpCircle, ChevronDown, MessageCircle } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { buildPlanFeatures } from "@/lib/utils";
import { useSEO } from "@/hooks/useSEO";

interface Plan {
  id: string;
  nome: string;
  label: string;
  preco: string;
  limiteMusicas: number;
  personalizacaoPercent: number;
  tagline: string;
  color: string;
  cardStyle: string;
  features: string[];
}

export default function Planos() {
  const [, setLocation] = useLocation();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [heroFeaturedPlan, setHeroFeaturedPlan] = useState<string>("premium");
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);

  useSEO({
    title: "Planos e Preços | Portal do Artista",
    description: "Conheça os planos do Portal do Artista e escolha a melhor opção para divulgar suas músicas e gerenciar sua carreira artística.",
    canonical: "https://portaldoartista.com/planos",
    breadcrumbs: [
      { name: "Início", item: "https://portaldoartista.com/" },
      { name: "Planos", item: "https://portaldoartista.com/planos" }
    ]
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.heroFeaturedPlan) setHeroFeaturedPlan(data.heroFeaturedPlan);
      })
      .catch(console.error);

    fetch("/api/plans")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const mapped = data.map((p: any) => {
            let tagline = "Solução completa para sua música.";
            let color = "bg-primary/20 text-primary border-primary/30";
            let cardStyle = "border-border/40 bg-card/40 hover:border-primary/40";
            
            if (p.nome === "free") {
              tagline = "Plano experimental e limitado para conhecer a experiência.";
              color = "bg-muted text-muted-foreground border-border";
            } else if (p.nome === "basico") {
              tagline = "Sua jornada profissional começa aqui.";
              color = "bg-green-500/20 text-green-400 border-green-500/30";
            } else if (p.nome === "pro") {
              tagline = "Grandes músicas merecem grandes apresentações.";
              color = "bg-blue-500/20 text-blue-400 border-blue-500/30";
            } else if (p.nome === "premium") {
              tagline = "Para quem quer viver da música.";
              color = "bg-amber-500/20 text-amber-400 border-amber-500/30";
              cardStyle = "border-primary bg-gradient-to-b from-primary/15 via-card/90 to-card/95 ring-2 ring-primary/40 shadow-[0_0_35px_rgba(245,197,24,0.25)]";
            }

            return {
              id: p.nome,
              nome: p.nome,
              label: p.label,
              preco: p.preco,
              limiteMusicas: parseInt(p.limiteMusicas) || 0,
              personalizacaoPercent: parseInt(p.personalizacaoPercent) || 0,
              tagline,
              color,
              cardStyle,
              features: buildPlanFeatures(p),
            };
          });
          setPlans(mapped);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleFaq = (index: number) => {
    setFaqOpen((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const faqs = [
    {
      q: "Como funciona a assinatura?",
      a: "Após escolher o plano, sua conta é ativada instantaneamente. Você pode catalogar suas músicas, definir suas fotos e links oficiais e já utilizar seu link único."
    },
    {
      q: "Posso cancelar ou alterar meu plano depois?",
      a: "Sim! Sem fidelidade ou burocracia. Você pode fazer upgrade ou cancelar diretamente no seu Painel do Artista com 1 clique."
    },
    {
      q: "O plano Gratuito cobra alguma taxa?",
      a: "Não. O plano Gratuito é 100% grátis e permite até 4 músicas no catálogo para você experimentar e ter seu perfil oficial sem custo."
    },
    {
      q: "Quais formas de pagamento são aceitas?",
      a: "Aceitamos Cartão de Crédito e PIX com confirmação imediata."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <Navbar />

      {/* Header / Hero de Planos */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-primary/10 via-background to-background text-center">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-extrabold uppercase tracking-wider animate-pulse">
            <Sparkles className="w-4 h-4" />
            Investimento no Seu Sucesso
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Escolha o plano ideal para a sua <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-yellow-200 to-amber-400">carreira musical</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Tenha seu site profissional de artista, catálogo de músicas organizado e apresente seu trabalho com máxima autoridade para produtores e contratantes.
          </p>
        </div>
      </section>

      {/* Grid dos Planos */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {loading ? (
          <div className="text-center py-20 text-muted-foreground text-sm font-medium">
            Carregando planos da plataforma...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {plans.map((plan) => {
              const isFeatured = plan.nome === heroFeaturedPlan;
              const isFree = plan.nome === "free";

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setLocation(`/cadastro?plano=${plan.nome}`)}
                  className={`group p-6 sm:p-7 rounded-3xl border flex flex-col justify-between space-y-6 transition-all duration-300 relative cursor-pointer hover:-translate-y-1.5 hover:shadow-2xl ${
                    isFeatured
                      ? "border-primary bg-gradient-to-b from-primary/20 via-card/90 to-card/95 ring-2 ring-primary/40 shadow-[0_0_35px_rgba(245,197,24,0.25)] lg:-translate-y-2 hover:border-yellow-300"
                      : "border-border/40 bg-card/40 hover:border-primary/50 hover:bg-card/70"
                  }`}
                >
                  {isFeatured && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-primary text-black font-black text-[10px] uppercase tracking-wider shadow-lg flex items-center gap-1">
                      ⭐ MAIS POPULAR
                    </span>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${plan.color}`}>
                        {isFree ? "EXPERIMENTE GRÁTIS" : plan.label}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white">
                          {isFree ? "R$ 0,00" : `R$ ${parseFloat(plan.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                        </span>
                        <span className="text-xs text-muted-foreground">/mês</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 min-h-[32px]">{plan.tagline}</p>
                    </div>

                    <ul className="space-y-2.5 pt-3 border-t border-border/30">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground leading-snug">
                          <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/cadastro?plano=${plan.nome}`);
                    }}
                    className={`w-full py-3.5 rounded-full font-black text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 group-hover:scale-102 ${
                      isFeatured
                        ? "bg-primary text-black hover:bg-primary/95 shadow-lg shadow-primary/20"
                        : "bg-card border border-border/60 text-white hover:border-primary/50 hover:bg-card/80"
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    {isFree ? "EXPERIMENTE GRÁTIS" : `ASSINAR ${plan.label.replace(/ASSINAR/gi, "").trim().toUpperCase()}`}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Selos de Garantia e Ativação */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border/30 bg-card/20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="p-6 rounded-2xl bg-card/40 border border-border/30 space-y-2">
            <Zap className="w-6 h-6 text-primary mx-auto" />
            <h4 className="font-bold text-white text-sm">Ativação Instantânea</h4>
            <p className="text-xs text-muted-foreground">Seu perfil e player ficam prontos no momento da assinatura.</p>
          </div>
          <div className="p-6 rounded-2xl bg-card/40 border border-border/30 space-y-2">
            <ShieldCheck className="w-6 h-6 text-primary mx-auto" />
            <h4 className="font-bold text-white text-sm">Sem Fidelidade</h4>
            <p className="text-xs text-muted-foreground">Cancele ou altere seu plano quando quiser diretamente no painel.</p>
          </div>
          <div className="p-6 rounded-2xl bg-card/40 border border-border/30 space-y-2">
            <Star className="w-6 h-6 text-primary mx-auto" />
            <h4 className="font-bold text-white text-sm">Suporte Prioritário</h4>
            <p className="text-xs text-muted-foreground">Atendimento direto pelo WhatsApp para auxiliar no seu catálogo.</p>
          </div>
        </div>
      </section>

      {/* FAQ de Planos */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-white flex items-center justify-center gap-2">
            <HelpCircle className="w-7 h-7 text-primary" />
            Dúvidas Frequentes sobre os Planos
          </h2>
          <p className="text-muted-foreground text-sm">
            Respostas para as principais perguntas sobre a contratação do Portal.
          </p>
        </div>

        <div className="space-y-3.5">
          {faqs.map((faq, idx) => {
            const isOpen = faqOpen[idx];
            return (
              <div key={idx} className="border border-border/30 rounded-2xl bg-card/35 overflow-hidden transition-all duration-300">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-6 py-4.5 text-left flex justify-between items-center hover:bg-card/50 transition-colors"
                >
                  <span className="font-bold text-white text-sm leading-snug">{faq.q}</span>
                  <ChevronDown className={`w-4.5 h-4.5 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-xs text-muted-foreground leading-relaxed border-t border-border/10">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-6 text-center">
          <a
            href="https://wa.me/5521995897040"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-500/20 border border-green-500/40 text-green-400 text-sm font-bold hover:bg-green-500/30 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Precisa de ajuda? Fale conosco no WhatsApp
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
