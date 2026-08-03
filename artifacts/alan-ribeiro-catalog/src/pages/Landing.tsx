import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  Sparkles, CheckCircle2, XCircle, Zap, Play, ChevronDown, 
  Users, Star, Check, Globe, FileText, 
  PieChart, Smartphone, Laptop, LayoutDashboard, Headphones
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { buildPlanFeatures } from "@/lib/utils";

interface Plan {
  id: string;
  nome: string;
  label: string;
  preco: string;
  tagline: string;
  color: string;
  cardStyle: string;
  features: string[];
}

export default function Landing() {
  const [, setLocation] = useLocation();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [heroFeaturedPlan, setHeroFeaturedPlan] = useState<string>("premium");
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({});
  const [settings, setSettings] = useState({
    landingVideoUrl: "",
    landingHeroVideoUrl: "",
  });

  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11)
      ? `https://www.youtube.com/embed/${match[2]}`
      : null;
  };

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.heroFeaturedPlan) setHeroFeaturedPlan(data.heroFeaturedPlan);
        setSettings({
          landingVideoUrl: data.landingVideoUrl || "",
          landingHeroVideoUrl: data.landingHeroVideoUrl || "",
        });
      })
      .catch(console.error);

    fetch("/api/plans")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const mapped = data
            .filter((p: any) => p.nome !== "free")
            .map((p: any) => {
              let tagline = "";
              let color = "bg-primary/20 text-primary border-primary/30";
              let cardStyle = "border-border/40 bg-card/40 hover:border-primary/40";
              
              if (p.nome === "basico") {
                tagline = "Sua jornada profissional começa aqui.";
                color = "bg-green-500/20 text-green-400 border-green-500/30";
              } else if (p.nome === "pro") {
                tagline = "Grandes músicas merecem grandes apresentações.";
                color = "bg-blue-500/20 text-blue-400 border-blue-500/30";
              } else if (p.nome === "premium") {
                tagline = "Para quem quer viver da música.";
                color = "bg-amber-500/20 text-amber-400 border-amber-500/30";
                cardStyle = "border-primary bg-gradient-to-b from-primary/10 via-card/80 to-card/90 ring-2 ring-primary/30 shadow-[0_0_35px_rgba(245,197,24,0.2)]";
              }

              return {
                id: p.nome,
                nome: p.nome,
                label: p.label,
                preco: p.preco,
                tagline,
                color,
                cardStyle,
                features: buildPlanFeatures(p),
              };
            });
          setPlans(mapped);
        }
      })
      .catch(console.error);
  }, []);

  const toggleFaq = (index: number) => {
    setFaqOpen((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const faqs = [
    {
      q: "Quem pode utilizar a plataforma?",
      a: "Qualquer artista independente da música: cantores, compositores, instrumentistas, bandas, duplas, produtores musicais que queiram organizar e apresentar suas obras profissionalmente."
    },
    {
      q: "Posso cancelar minha assinatura quando quiser?",
      a: "Sim, o cancelamento é livre de burocracias. Você cancela direto no painel do artista com apenas um clique, sem taxas adicionais."
    },
    {
      q: "Consigo editar meu perfil após o cadastro?",
      a: "Com certeza! Você tem total controle sobre suas fotos, banners, catalogação de músicas, dados de contato e cores do player, direto no seu Painel Administrativo."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-hidden">
      <Navbar />

      {/* 1. PRIMEIRA DOBRA (HERO) */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Lado Esquerdo: Mensagem Forte do Briefing */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-6 space-y-6 text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-extrabold uppercase tracking-wider animate-pulse">
              <Sparkles className="w-4 h-4" />
              Sua Carreira Musical no Próximo Nível
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Você e sua música merecem uma <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-yellow-200 to-amber-400">apresentação profissional</span>.
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Tenha seu site de artista, catálogo musical e ferramentas para transformar suas composições em uma carreira mais organizada.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button 
                onClick={() => setLocation(`/cadastro?plano=${heroFeaturedPlan}`)}
                className="w-full sm:w-auto px-9 py-4 rounded-full bg-primary text-primary-foreground font-black text-base hover:bg-primary/95 transition-all shadow-[0_10px_35px_rgba(245,197,24,0.35)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                <Zap className="w-5 h-5 fill-current" />
                Criar Meu Perfil Profissional
              </button>
            </div>

            <div className="pt-4 flex items-center justify-center lg:justify-start gap-3 text-muted-foreground text-sm">
              <div className="flex text-primary">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <span>Usado por dezenas de compositores e cantores em todo o Brasil.</span>
            </div>
          </motion.div>

          {/* Lado Direito: Card do Plano em Destaque (Selecionado pelo Admin) + Mockup Simulador */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-6 relative flex flex-col items-center gap-6 max-w-xl mx-auto w-full"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-yellow-500/10 to-transparent rounded-full blur-3xl -z-10" />

            {/* 🌟 CARD DO PLANO EM DESTAQUE (Selecionado pelo Admin) */}
            {(() => {
              const featured = plans.find((p) => p.nome === heroFeaturedPlan) ||
                plans.find((p) => p.nome === "premium") ||
                plans[0] || {
                  id: "premium",
                  nome: "premium",
                  label: "Premium",
                  preco: "25.00",
                  tagline: "Para quem quer viver da música.",
                  features: [
                    "50 Músicas no catálogo",
                    "100% de personalização visual",
                    "Foto de perfil",
                    "Banner",
                    "Fundo customizável"
                  ]
                };

              return (
                <div className="relative border border-primary/50 rounded-3xl overflow-hidden bg-gradient-to-b from-primary/15 via-card/90 to-card/95 backdrop-blur-xl w-full shadow-[0_0_35px_rgba(245,197,24,0.2)] p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-primary text-black font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md">
                      ⭐ PLANO EM DESTAQUE
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">Recomendado</span>
                  </div>

                  <div>
                    <h3 className="text-2xl font-extrabold text-white">{featured.label}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{featured.tagline || "O plano perfeito para alavancar sua carreira."}</p>
                  </div>

                  <div className="flex items-baseline gap-1 py-2 border-y border-border/30">
                    <span className="text-3xl font-black text-primary">
                      R$ {parseFloat(featured.preco || "25").toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">/mês</span>
                  </div>

                  <ul className="space-y-2 pt-1">
                    {featured.features.slice(0, 5).map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => setLocation(`/cadastro?plano=${featured.nome || featured.id}`)}
                    className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/95 text-black font-black text-sm transition-all shadow-lg shadow-primary/25 cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    Assinar Plano {featured.label} Agora
                  </button>
                </div>
              );
            })()}

            {/* Mockup Container */}
            <div className="relative w-full space-y-4">
              
              {/* Card Simulador Desktop / Tablet */}
              <div className="border border-border/60 rounded-2xl overflow-hidden bg-card/90 backdrop-blur-xl shadow-2xl space-y-0">
                <div className="bg-black/70 px-4 py-2.5 border-b border-border/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="px-3 py-0.5 rounded-full bg-input text-[11px] text-muted-foreground font-mono border border-border/40">
                    portaldoartista.com/alan-ribeiro
                  </div>
                  <Laptop className="w-4 h-4 text-muted-foreground" />
                </div>

                <div className="p-5 space-y-4">
                  {/* Visual do Perfil */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-primary/15 via-yellow-500/5 to-transparent border border-primary/30 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-yellow-500 p-0.5 shrink-0 shadow-lg shadow-primary/20">
                      <div className="w-full h-full rounded-full bg-background flex items-center justify-center font-extrabold text-primary">
                        AR
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-white text-base truncate">Alan Ribeiro</h4>
                        <span className="px-2 py-0.5 rounded text-[9px] font-black bg-primary text-black uppercase">OFICIAL</span>
                      </div>
                      <p className="text-xs text-primary font-bold">Compositor & Produtor Musical</p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">Sertanejo, Pop e MPB • 50M+ visualizações</p>
                    </div>
                  </div>

                  {/* Visual do Player e Catálogo */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                      <span>Catálogo em Destaque</span>
                      <span className="text-primary text-[11px]">Player Integrado ▶</span>
                    </div>
                    
                    <div className="p-3 rounded-xl bg-background/80 border border-border/40 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30">
                          <Play className="w-4 h-4 text-primary fill-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-white truncate">Seu Próximo Sucesso.mp3</p>
                          <p className="text-[10px] text-muted-foreground truncate">Tom: G • BPM: 120 • Sertanejo</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                        LIBERADA
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Float Mobile Badge */}
              <div className="absolute -bottom-5 -right-3 sm:right-4 p-3 rounded-2xl bg-card border border-primary/40 shadow-2xl flex items-center gap-3 backdrop-blur-md animate-bounce">
                <Smartphone className="w-6 h-6 text-primary" />
                <div className="text-left">
                  <p className="text-xs font-bold text-white leading-tight">Site Responsivo</p>
                  <p className="text-[10px] text-muted-foreground">Perfeito no celular e computador</p>
                </div>
              </div>

            </div>
          </motion.div>

        </div>
      </section>

      {/* 2. MOSTRAR O PROBLEMA (COMPARAÇÃO VISUAL) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-y border-border/40 bg-card/10">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="px-3.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider">
              Profissionalização da Carreira
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Sua carreira merece sair do improviso
            </h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              Veja a diferença de postura profissional entre usar ferramentas comuns e utilizar o Portal do Artista.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Antes do Portal */}
            <div className="p-7 rounded-3xl bg-red-500/5 border border-red-500/25 space-y-6">
              <div className="flex items-center gap-3 border-b border-red-500/20 pb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-extrabold">
                  ❌
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-red-400">Antes do Portal</h3>
                  <p className="text-xs text-muted-foreground">Formato amador e desorganizado</p>
                </div>
              </div>

              <ul className="space-y-4">
                {[
                  "Músicas espalhadas em conversas do WhatsApp.",
                  "Arquivos perdidos ou em pastas confusas do celular.",
                  "Dificuldade para apresentar seu trabalho para produtores.",
                  "Falta de organização e controle da sua carreira.",
                  "Links lentos do Drive que exigem permissão de acesso."
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Com o Portal do Artista */}
            <div className="p-7 rounded-3xl bg-emerald-500/5 border border-emerald-500/30 space-y-6 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <div className="flex items-center gap-3 border-b border-emerald-500/20 pb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-extrabold">
                  ✅
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-emerald-400">Com o Portal do Artista</h3>
                  <p className="text-xs text-muted-foreground">Postura profissional de alto nível</p>
                </div>
              </div>

              <ul className="space-y-4">
                {[
                  "Seu espaço profissional como artista com link próprio.",
                  "Seu catálogo musical organizado por tom, gênero e estúdio.",
                  "Suas músicas apresentadas com capas e player de alto padrão.",
                  "Suas ferramentas de carreira em um único painel.",
                  "Press Kit pronto em PDF e Online para enviar a contratantes."
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-white font-medium">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* DEMONSTRAÇÃO EM VÍDEO (Configurável no Admin) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/40 bg-gradient-to-b from-background via-card/20 to-background">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-3">
            <span className="px-3.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-extrabold uppercase tracking-wider">
              Demonstração em Vídeo
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Veja o Portal do Artista em Ação
            </h2>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              Assista à demonstração e entenda como criar seu perfil, subir suas composições e apresentar seu trabalho com máxima autoridade.
            </p>
          </div>

          {getYoutubeEmbedUrl(settings.landingVideoUrl) ? (
            <div className="relative max-w-3xl mx-auto aspect-video rounded-3xl overflow-hidden bg-black/60 border border-border/40 shadow-2xl">
              <iframe
                src={getYoutubeEmbedUrl(settings.landingVideoUrl) || undefined}
                title="Vídeo de Demonstração"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="relative max-w-3xl mx-auto aspect-video rounded-3xl overflow-hidden bg-black/60 border border-border/40 shadow-2xl flex flex-col items-center justify-center p-8 text-center group">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
              <div className="z-10 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary text-primary flex items-center justify-center group-hover:scale-110 transition-transform cursor-pointer shadow-lg shadow-primary/20">
                  <Play className="w-6 h-6 fill-current ml-1" />
                </div>
                <div>
                  <p className="font-bold text-white text-base">Vídeo de Demonstração Rápida</p>
                  <p className="text-xs text-muted-foreground/80 mt-1 max-w-md">
                    Veja como criar o perfil, adicionar suas primeiras músicas no catálogo e gerenciar seus contatos em segundos.
                  </p>
                  <p className="text-[10px] text-primary/70 mt-2 font-mono">
                    Cadastre o link do vídeo no Painel Admin (Configurações {">"} Portal)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. APRESENTAR OS BENEFÍCIOS DO ASSINANTE (COM IMAGENS/MOCKUPS) */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-20">
        <div className="text-center space-y-3">
          <span className="px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
            Tudo o Que Você Ganha
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Uma plataforma completa para sua carreira
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            Conheça em detalhes os 5 pilares do seu Portal do Artista.
          </p>
        </div>

        <div className="space-y-16">
          
          {/* Benefício 1: Seu site profissional de artista */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-extrabold text-white">Seu site profissional de artista</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tenha uma página exclusiva e elegante para apresentar sua história, suas músicas, suas redes sociais e seus contatos de shows e produções.
              </p>
              <ul className="space-y-2 text-xs text-foreground">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Perfil totalmente personalizável</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Integração com redes sociais e contatos diretos</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Biografia oficial padronizada em toda a plataforma</li>
              </ul>
            </div>
            <div className="lg:col-span-6 p-6 rounded-3xl bg-card border border-border/40 shadow-2xl space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/30 pb-3">
                <span className="font-bold text-white">Preview do Perfil Público</span>
                <span className="text-primary font-mono text-[11px]">portaldoartista.com/seu-slug</span>
              </div>
              <div className="h-44 rounded-2xl bg-gradient-to-r from-zinc-900 to-black p-5 flex flex-col justify-between border border-border/30">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary flex items-center justify-center font-bold text-primary">
                    ART
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-sm">Seu Perfil de Artista</h4>
                    <p className="text-[11px] text-muted-foreground">Biografia, Fotos, Redes & Contato</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-card/60 border border-border/30 text-xs text-muted-foreground italic">
                  "Minha biografia e apresentação oficial disponíveis 24 horas para contratantes."
                </div>
              </div>
            </div>
          </div>

          {/* Benefício 2: Seu catálogo musical profissional */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 lg:order-2 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Headphones className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-extrabold text-white">Seu catálogo musical profissional</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Organize todas as suas composições de forma clara e atrativa: capas, áudio em alta qualidade, letra, tom, gênero e detalhes da obra.
              </p>
              <ul className="space-y-2 text-xs text-foreground">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400" /> Player contínuo com busca rápida</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400" /> Visualização de letras e cifras integradas</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400" /> Tags de tom, BPM e status de liberação</li>
              </ul>
            </div>
            <div className="lg:col-span-6 lg:order-1 p-6 rounded-3xl bg-card border border-border/40 shadow-2xl space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/30 pb-3">
                <span className="font-bold text-white">Gestor de Catálogo</span>
                <span className="text-amber-400 font-mono text-[11px]">Player Ativo</span>
              </div>
              <div className="space-y-2">
                {[1, 2].map((n) => (
                  <div key={n} className="p-3 rounded-xl bg-background border border-border/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                        ▶
                      </div>
                      <div>
                        <p className="font-bold text-xs text-white">Composição #{n} — Inédita</p>
                        <p className="text-[10px] text-muted-foreground">Sertanejo • Letra e Áudio inclusos</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded bg-primary/10">Disponível</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Benefício 3: Gestão de carreira */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-extrabold text-white">Gestão de carreira completa</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Mostre que o Portal é muito mais que um site. Ferramentas integradas para organizar seus contatos, produtores, parceiros e oportunidades.
              </p>
              <ul className="space-y-2 text-xs text-foreground">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-400" /> Registro de interessados e propostas recebidas</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-400" /> Painel de controle de métricas e acessos</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-400" /> Centralização dos contatos da sua equipe</li>
              </ul>
            </div>
            <div className="lg:col-span-6 p-6 rounded-3xl bg-card border border-border/40 shadow-2xl space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/30 pb-3">
                <span className="font-bold text-white">Painel do Artista (CRM)</span>
                <span className="text-blue-400 font-mono text-[11px]">Dashboard</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3.5 rounded-xl bg-background border border-border/30">
                  <p className="text-[10px] text-muted-foreground">Propostas Recebidas</p>
                  <p className="text-xl font-extrabold text-blue-400 mt-1">12</p>
                </div>
                <div className="p-3.5 rounded-xl bg-background border border-border/30">
                  <p className="text-[10px] text-muted-foreground">Produtores Conectados</p>
                  <p className="text-xl font-extrabold text-primary mt-1">28</p>
                </div>
              </div>
            </div>
          </div>

          {/* Benefício 4: Gestão das suas músicas & Porcentagens */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 lg:order-2 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <PieChart className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-extrabold text-white">Gestão e controle das suas músicas</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Controle informações estratégicas sobre as suas obras: porcentagens de divisão, parceiros de composição e histórico das obras.
              </p>
              <ul className="space-y-2 text-xs text-foreground">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400" /> Divisão clara de direitos com coautores</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400" /> Histórico de gravações e liberações</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400" /> Segurança e organização das suas criações</li>
              </ul>
            </div>
            <div className="lg:col-span-6 lg:order-1 p-6 rounded-3xl bg-card border border-border/40 shadow-2xl space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/30 pb-3">
                <span className="font-bold text-white">Divisão de Coautoria</span>
                <span className="text-purple-400 font-mono text-[11px]">100% Organizado</span>
              </div>
              <div className="p-4 rounded-xl bg-background border border-border/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Compositor A (Você)</span>
                  <span className="font-extrabold text-purple-400">50%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Compositor B</span>
                  <span className="font-extrabold text-purple-400">50%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Benefício 5: Press Kit profissional */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-extrabold text-white">Press Kit profissional instantâneo</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tenha um material de apresentação impecável e pronto para enviar a cantores, produtores, empresários e escritórios musicais.
              </p>
              <ul className="space-y-2 text-xs text-foreground">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Exportação e visualização em PDF pronta para impressão</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Layout elegante com biografia e fotos</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Destaque das melhores faixas do seu portfólio</li>
              </ul>
            </div>
            <div className="lg:col-span-6 p-6 rounded-3xl bg-card border border-border/40 shadow-2xl space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/30 pb-3">
                <span className="font-bold text-white">Press Kit Oficial PDF / Online</span>
                <span className="text-emerald-400 font-mono text-[11px]">Gerado com 1 Clique</span>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-white text-xs">PRESS KIT — PORTAL DO ARTISTA</span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500 text-black">EXPORTAR PDF</span>
                </div>
                <p className="text-[11px] text-muted-foreground">Biografia Oficial + Melhores Faixas + Dados de Contato Comercial</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 4. SEÇÃO "VEJA COMO FUNCIONA" (4 PASSOS) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-y border-border/40 bg-card/10">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-3">
            <span className="px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
              Passo a Passo Simples
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Veja como funciona em 4 passos
            </h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Sua carreira profissional no ar em poucos minutos.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: "01", t: "Crie seu perfil", d: "Preencha seus dados, biografia e personalize seu visual." },
              { step: "02", t: "Cadastre suas músicas", d: "Suba seus áudios, capas, letras e informações de tom/gênero." },
              { step: "03", t: "Organize sua carreira", d: "Gerencie contatos, porcentagens e histórico de propostas." },
              { step: "04", t: "Compartilhe", d: "Envie seu link exclusivo para produtores, cantores e contratantes." }
            ].map((p, idx) => (
              <div key={idx} className="p-6 rounded-3xl bg-card/50 border border-border/40 space-y-3 relative hover:border-primary/40 transition-all">
                <span className="text-3xl font-black text-primary/30">{p.step}</span>
                <h4 className="font-extrabold text-white text-base">{p.t}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. PROVA E CONFIANÇA (VITRINE DE ARTISTAS REAL) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-12">
        <div className="space-y-3">
          <span className="px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            Prova Social
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Veja na prática como fica seu espaço
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Músicos e compositores de diversos gêneros já estão profissionalizando suas apresentações.
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-gradient-to-r from-card via-card/80 to-card border border-border/40 space-y-6 shadow-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-background/80 border border-border/30 space-y-1">
              <p className="text-2xl font-black text-primary">100%</p>
              <p className="text-xs font-bold text-white">Online & Seguro</p>
              <p className="text-[10px] text-muted-foreground">Disponível 24h por dia</p>
            </div>
            <div className="p-4 rounded-2xl bg-background/80 border border-border/30 space-y-1">
              <p className="text-2xl font-black text-amber-400">1 Clique</p>
              <p className="text-xs font-bold text-white">Press Kit em PDF</p>
              <p className="text-[10px] text-muted-foreground">Pronto para envio</p>
            </div>
            <div className="p-4 rounded-2xl bg-background/80 border border-border/30 space-y-1">
              <p className="text-2xl font-black text-emerald-400">0% Risco</p>
              <p className="text-xs font-bold text-white">Sem Fidelidade</p>
              <p className="text-[10px] text-muted-foreground">Cancele quando quiser</p>
            </div>
          </div>

          <div className="pt-2">
            <Link href="/explorar">
              <button className="px-8 py-3.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold text-xs transition-all border border-zinc-700 shadow-lg flex items-center gap-2 mx-auto cursor-pointer">
                <Users className="w-4 h-4 text-primary" />
                Explorar Artistas Cadastrados na Vitrine
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* 6. OFERTA E PLANOS */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-border/40 bg-gradient-to-b from-background via-card/20 to-background">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-3">
            <span className="px-3.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-extrabold uppercase tracking-wider">
              Comece Agora
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Comece agora a apresentar sua carreira de forma profissional
            </h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              Escolha o plano ideal para seu momento artístico. Ativação imediata e sem complicação.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => {
              const isFeatured = plan.nome === heroFeaturedPlan;
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className={`p-7 rounded-3xl border flex flex-col justify-between space-y-6 transition-all ${
                    isFeatured
                      ? "border-primary bg-gradient-to-b from-primary/10 via-card/80 to-card/90 ring-2 ring-primary/30 shadow-[0_0_35px_rgba(245,197,24,0.2)]"
                      : "border-border/40 bg-card/40 hover:border-primary/40"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${plan.color}`}>
                        {plan.label}
                      </span>
                      {isFeatured && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-primary text-black">
                          ⭐ MAIS POPULAR
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-white">
                          R$ {parseFloat(plan.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs text-muted-foreground">/mês</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{plan.tagline}</p>
                    </div>

                    <ul className="space-y-2.5 pt-2 border-t border-border/30">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => setLocation(`/cadastro?plano=${plan.nome}`)}
                    className={`w-full py-3.5 rounded-full font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      isFeatured
                        ? "bg-primary text-primary-foreground hover:bg-primary/95 shadow-lg shadow-primary/20"
                        : "bg-card border border-border/60 text-white hover:border-primary/50 hover:bg-card/80"
                    }`}
                  >
                    Escolher Plano {plan.label}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. PROVA SOCIAL */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Resultados de quem faz acontecer
          </h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            A comunidade cresce a cada dia e a plataforma evolui em ritmo acelerado para valorizar o artista nacional.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { v: "35+", label: "Artistas Cadastrados", icon: <Users className="w-6 h-6 text-primary mx-auto mb-2" /> },
            { v: "49", label: "Músicas Publicadas", icon: <Music2 className="w-6 h-6 text-primary mx-auto mb-2" /> },
            { v: "7", label: "Clientes Pagantes", icon: <Star className="w-6 h-6 text-primary mx-auto mb-2" /> },
            { v: "100%", label: "Em Evolução Contínua", icon: <Zap className="w-6 h-6 text-primary mx-auto mb-2" /> }
          ].map((stat, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-card/30 border border-border/20 shadow-lg">
              {stat.icon}
              <div className="text-3xl sm:text-4xl font-extrabold text-white">{stat.v}</div>
              <div className="text-xs text-muted-foreground mt-1 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 8. COMPARAÇÃO */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-y border-border/40 bg-card/10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Como você apresenta seu trabalho hoje?
          </h2>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-4">
            <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-md">
              {["WhatsApp", "Instagram", "Google Drive", "PDF", "Arquivos MP3"].map((item) => (
                <span key={item} className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                  {item}
                </span>
              ))}
            </div>
            
            <div className="text-2xl text-muted-foreground font-bold">➔</div>
            
            <div className="px-6 py-3 rounded-2xl bg-primary/20 border border-primary/50 text-white font-extrabold text-base shadow-[0_0_20px_rgba(245,197,24,0.15)]">
              PORTALDOARTISTA.COM
            </div>
          </div>
          
          <p className="text-lg text-primary font-bold pt-4">
            Tudo o que você precisa unificado em um único lugar profissional.
          </p>
        </div>
      </section>

      {/* 11. PERGUNTAS FREQUENTES */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/40 bg-card/10">
        <div className="max-w-3xl mx-auto space-y-10">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-extrabold text-white flex items-center justify-center gap-2">
              <HelpCircle className="w-7 h-7 text-primary" />
              Perguntas Frequentes
            </h2>
            <p className="text-muted-foreground text-sm">
              Tudo o que você precisa saber sobre o Portal do Artista.
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
        </div>
      </section>

      {/* 12. CHAMADA FINAL */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-gradient-to-t from-primary/10 to-transparent">
        <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full -z-10" />
        
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Você dedicou anos para escrever suas músicas.<br />
              <span className="text-primary">Não deixe que elas sejam apresentadas de qualquer jeito.</span>
            </h2>
            
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Leve sua carreira, portfólio e relacionamento com contratantes para um nível profissional agora mesmo com o PORTALDOARTISTA.COM.
            </p>
          </div>

          <div className="pt-4">
            <button 
              onClick={() => setLocation(`/cadastro?plano=${heroFeaturedPlan}`)}
              className="px-12 py-5 rounded-full bg-primary hover:bg-primary/95 text-primary-foreground font-black text-lg transition-all shadow-[0_8px_30px_rgba(245,197,24,0.35)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer uppercase tracking-wider"
            >
              ASSINE AGORA
            </button>
          </div>
          
          <p className="text-xs text-muted-foreground/80 flex items-center justify-center gap-1">
            <Heart className="w-3.5 h-3.5 text-red-500 fill-current" />
            Valorizando a música independente nacional.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
