import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  Sparkles, CheckCircle2, Zap, Play, ChevronDown, 
  Users, Star, Check, Globe, FileText, 
  PieChart, Smartphone, Laptop, LayoutDashboard, Headphones,
  Mic, Music2, DollarSign, Lock, Calendar, QrCode, TrendingUp,
Building2, Download, Share2, ShieldCheck, HelpCircle, Heart, Instagram,
  Phone, Mail, ArrowRight, Eye, Music
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({});

  const toggleFaq = (index: number) => {
    setFaqOpen((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const faqs = [
    {
      q: "Preciso de cartão de crédito para testar?",
      a: "Não! Você pode se cadastrar e testar a plataforma por 7 dias totalmente grátis sem precisar cadastrar cartão."
    },
    {
      q: "Posso cancelar quando quiser?",
      a: "Sim! Sem contratos de fidelidade ou burocracia. O cancelamento pode ser feito com 1 clique direto no seu painel."
    },
    {
      q: "Meu perfil aparece nas buscas do Google?",
      a: "Sim! Todos os perfis criados no Portal do Artista são otimizados para motores de busca (SEO) automaticamente."
    },
    {
      q: "Quantas músicas posso adicionar?",
      a: "No plano Premium você pode catalogar até 50 músicas completas com áudios, letras, cifras, ficha técnica e links de compartilhamento."
    },
    {
      q: "Como funciona a Área VIP de Músicas?",
      a: "Na Área VIP você pode proteger faixas com senha exclusiva e disponibilizar conteúdos antecipados para contratantes ou fãs."
    },
    {
      q: "Posso utilizar meu WhatsApp direto na página?",
      a: "Com certeza! Os botões de contato direcionam o fã ou contratante diretamente para o seu WhatsApp com mensagem personalizada."
    }
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-foreground selection:bg-primary selection:text-primary-foreground overflow-hidden font-sans">
      <Navbar />

      {/* 1. HERO SECTION */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-primary/10 via-[#09090b] to-[#09090b]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Lado Esquerdo: Mensagem Hero */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-6 space-y-6 text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-extrabold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              Sua Carreira Musical no Próximo Nível
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              Sua carreira merece uma <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-yellow-200 to-amber-400">plataforma profissional.</span>
            </h1>
            
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Crie seu site, organize suas músicas, controle sua carreira e compartilhe tudo em um único link.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button 
                onClick={() => setLocation("/cadastro?plano=premium")}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-primary text-primary-foreground font-black text-sm sm:text-base hover:bg-primary/95 transition-all shadow-[0_10px_35px_rgba(245,197,24,0.35)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                <Zap className="w-5 h-5 fill-current" />
                Começar Gratuitamente
              </button>

              <Link
                href="/vitrine"
                className="w-full sm:w-auto px-7 py-4 rounded-full bg-card/80 border border-border/60 text-white font-bold text-sm hover:bg-card hover:border-primary/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current text-primary" />
                Ver Como Funciona
              </Link>
            </div>

            <div className="text-xs text-muted-foreground font-medium pt-1">
              ✨ 7 dias grátis para testar • Sem cartão de crédito
            </div>

            {/* Avatares Prova Social */}
            <div className="pt-4 flex items-center justify-center lg:justify-start gap-3 border-t border-border/20">
              <div className="flex -space-x-2">
                <img className="w-8 h-8 rounded-full border-2 border-[#09090b] object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" alt="Artista" />
                <img className="w-8 h-8 rounded-full border-2 border-[#09090b] object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" alt="Artista" />
                <img className="w-8 h-8 rounded-full border-2 border-[#09090b] object-cover" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80" alt="Artista" />
              </div>
              <div className="text-left text-xs">
                <div className="flex text-primary">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
                <span className="text-muted-foreground font-medium">Mais de 3.500 artistas no Portal do Artista</span>
              </div>
            </div>
          </motion.div>

          {/* Lado Direito: Mockup 3D Laptop + Mobile */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-6 relative flex flex-col items-center justify-center"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-yellow-500/10 to-transparent rounded-full blur-3xl -z-10" />

            {/* Laptop Container Mockup */}
            <div className="relative w-full max-w-xl border border-border/60 rounded-3xl overflow-hidden bg-card/90 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-primary/30">
              {/* Laptop Header Bar */}
              <div className="bg-black/80 px-4 py-3 border-b border-border/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="px-4 py-1 rounded-full bg-black/60 text-xs text-primary font-mono border border-primary/30 flex items-center gap-1.5">
                  <Globe className="w-3 h-3" />
                  portaldoartista.com/alanribeiro
                </div>
                <Laptop className="w-4 h-4 text-muted-foreground" />
              </div>

              {/* Inner Portal Preview */}
              <div className="p-6 bg-gradient-to-b from-black via-zinc-950 to-black space-y-6">
                <div className="flex items-center justify-between border-b border-border/30 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary overflow-hidden flex items-center justify-center text-primary font-bold">
                      <Music className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white text-base">ALAN RIBEIRO</h4>
                      <p className="text-xs text-primary font-medium">Compositor & Produtor Musical</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-primary text-black font-extrabold text-[10px] uppercase">
                    Área VIP
                  </span>
                </div>

                {/* Song Grid Mockup */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Músicas em Destaque</p>
                  <div className="grid grid-cols-3 gap-2">
                    {["Cê Deixou Vácuo", "Mandou a Real", "Empate Negativo"].map((song, idx) => (
                      <div key={idx} className="bg-card/70 border border-border/40 p-2.5 rounded-xl space-y-1 text-center">
                        <div className="w-full h-14 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                          <Play className="w-5 h-5 fill-current" />
                        </div>
                        <p className="text-[11px] font-bold text-white truncate">{song}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Float Badge */}
            <div className="absolute -bottom-6 -right-2 bg-gradient-to-r from-card via-zinc-900 to-card border border-primary/40 rounded-2xl p-3 shadow-2xl flex items-center gap-3">
              <Smartphone className="w-6 h-6 text-primary" />
              <div className="text-left">
                <p className="text-xs font-extrabold text-white">Versão Mobile Perfeita</p>
                <p className="text-[10px] text-muted-foreground">Otimizada para Celular</p>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* 2. STATS BAR */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 border-y border-border/40 bg-card/30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-black text-primary flex items-center justify-center gap-2">
              <Users className="w-5 h-5" /> + 3,500
            </p>
            <p className="text-xs text-muted-foreground font-medium">Artistas Cadastrados</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-black text-primary flex items-center justify-center gap-2">
              <Music2 className="w-5 h-5" /> + 80,000
            </p>
            <p className="text-xs text-muted-foreground font-medium">Músicas Organizadas</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-black text-primary flex items-center justify-center gap-2">
              <Eye className="w-5 h-5" /> + 1 Milhão
            </p>
            <p className="text-xs text-muted-foreground font-medium">Visualizações nos Perfis</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-black text-primary flex items-center justify-center gap-2">
              <Globe className="w-5 h-5" /> Em Todo
            </p>
            <p className="text-xs text-muted-foreground font-medium">o Brasil</p>
          </div>
        </div>
      </section>

      {/* 3. FEATURE ICONS GRID (8 CARDS) */}
      <section id="recursos" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white uppercase tracking-tight">
            TENHA TUDO QUE <span className="text-primary">SUA CARREIRA</span> PRECISA
          </h2>
          <p className="text-sm text-muted-foreground">
            Ferramentas pensadas exclusivamente para a rotina de compositores e cantores independentes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: Smartphone, title: "Página Profissional", desc: "Seu site completo com sua identidade, fotos, vídeos e contato." },
            { icon: Headphones, title: "Catálogo Musical", desc: "Organize até 50 músicas com links individuais e QR Code." },
            { icon: DollarSign, title: "Gestão Financeira", desc: "Acompanhe ganhos, despesas e lucro da sua carreira em tempo real." },
            { icon: Users, title: "CRM de Contatos", desc: "Gerencie seus contratantes e acompanhe interações." },
            { icon: Calendar, title: "Agenda Interativa", desc: "Organize compromissos, reuniões e eventos em um calendário profissional." },
            { icon: Lock, title: "Área VIP de Músicas", desc: "Venda acesso exclusivo a conteúdos premium para seus fãs." },
            { icon: FileText, title: "Press Kit Profissional", desc: "Envie seu press kit com materiais de alta qualidade para contratantes." },
            { icon: Sparkles, title: "Conteúdo Exclusivo", desc: "Compartilhe materiais com fãs, contratantes e parceiros." },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx}
                className="bg-card/40 border border-border/50 hover:border-primary/50 p-6 rounded-3xl space-y-3 transition-all hover:bg-card/70 hover:-translate-y-1 shadow-lg group"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-all">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-white">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. ALTERNATING FEATURE DEEP-DIVE (4 BLOCKS) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white uppercase tracking-tight">
            UM ECOSSISTEMA COMPLETO PARA <span className="text-primary">IMPULSIONAR SUA CARREIRA</span>
          </h2>
        </div>

        {/* Feature 01 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-card/30 border border-border/50 rounded-3xl p-6 sm:p-10 shadow-2xl">
          <div className="lg:col-span-6 space-y-4">
            <span className="text-4xl font-black text-primary/40 font-mono">01</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Tenha seu site profissional</h3>
            <p className="text-sm text-muted-foreground">
              Seu perfil completo para apresentar sua música, fotos, vídeos, agenda e formas de contato de forma profissional.
            </p>
            <ul className="space-y-2 pt-2 text-xs font-bold text-white">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Transmita credibilidade</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Seja encontrado no Google</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Mostre sua identidade ao mundo</li>
            </ul>
          </div>
          <div className="lg:col-span-6 bg-black/60 border border-border/40 rounded-2xl p-4 text-center space-y-3">
            <div className="w-full h-48 rounded-xl bg-gradient-to-tr from-primary/20 via-black to-zinc-900 border border-primary/20 flex items-center justify-center">
              <Smartphone className="w-16 h-16 text-primary animate-pulse" />
            </div>
          </div>
        </div>

        {/* Feature 02 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-card/30 border border-border/50 rounded-3xl p-6 sm:p-10 shadow-2xl">
          <div className="lg:col-span-6 order-2 lg:order-1 bg-black/60 border border-border/40 rounded-2xl p-4 space-y-3">
            <div className="w-full h-48 rounded-xl bg-gradient-to-tr from-amber-500/10 via-black to-zinc-900 border border-amber-500/20 flex items-center justify-center gap-4">
              <Music2 className="w-12 h-12 text-primary" />
              <Headphones className="w-12 h-12 text-yellow-300" />
            </div>
          </div>
          <div className="lg:col-span-6 order-1 lg:order-2 space-y-4">
            <span className="text-4xl font-black text-primary/40 font-mono">02</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Organize todas as suas músicas</h3>
            <p className="text-sm text-muted-foreground">
              Até 50 músicas organizadas por estilo, com links individuais e QR Code para divulgação fácil.
            </p>
            <ul className="space-y-2 pt-2 text-xs font-bold text-white">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Player profissional</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Compartilhamento rápido</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Mais streams e ouvintes</li>
            </ul>
          </div>
        </div>

        {/* Feature 03 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-card/30 border border-border/50 rounded-3xl p-6 sm:p-10 shadow-2xl">
          <div className="lg:col-span-6 space-y-4">
            <span className="text-4xl font-black text-primary/40 font-mono">03</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Controle receitas e despesas</h3>
            <p className="text-sm text-muted-foreground">
              Acompanhe ganhos, despesas e lucro da sua carreira em tempo real com relatórios claros.
            </p>
            <ul className="space-y-2 pt-2 text-xs font-bold text-white">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Relatórios automáticos</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Gráficos inteligentes</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Decisões com base em dados</li>
            </ul>
          </div>
          <div className="lg:col-span-6 bg-black/60 border border-border/40 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between text-xs border-b border-border/30 pb-3">
              <span className="text-emerald-400 font-bold">Receitas: R$ 12.450,00</span>
              <span className="text-red-400 font-bold">Despesas: R$ 4.220,00</span>
            </div>
            <div className="h-32 bg-primary/5 rounded-xl border border-primary/20 flex items-center justify-center">
              <TrendingUp className="w-12 h-12 text-primary" />
            </div>
          </div>
        </div>

        {/* Feature 04 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-card/30 border border-border/50 rounded-3xl p-6 sm:p-10 shadow-2xl">
          <div className="lg:col-span-6 order-2 lg:order-1 bg-black/60 border border-border/40 rounded-2xl p-6 space-y-4 text-center">
            <div className="px-4 py-2 rounded-xl bg-black border border-primary/40 text-primary font-mono text-xs inline-block">
              portaldoartista.com/alanribeiro
            </div>
            <div className="flex items-center justify-center gap-4 text-muted-foreground pt-2">
              <Instagram className="w-5 h-5 text-pink-500" />
              <Phone className="w-5 h-5 text-green-500" />
              <Globe className="w-5 h-5 text-primary" />
              <QrCode className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="lg:col-span-6 order-1 lg:order-2 space-y-4">
            <span className="text-4xl font-black text-primary/40 font-mono">04</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Compartilhe tudo em um único link</h3>
            <p className="text-sm text-muted-foreground">
              Seu link personalizado reúne tudo o que você precisa mostrar para fãs, contratantes e parceiros.
            </p>
            <ul className="space-y-2 pt-2 text-xs font-bold text-white">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Um link para tudo</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Perfeito para redes sociais</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Mais profissionalismo</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5. OFFER / PRICING HIGHLIGHT BANNER */}
      <section id="planos" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-primary/15 via-card to-primary/15 border-2 border-primary rounded-3xl p-8 sm:p-12 shadow-[0_0_50px_rgba(245,197,24,0.2)] flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-2 text-center lg:text-left">
            <p className="text-xs font-extrabold text-primary uppercase tracking-widest">Tudo isso por apenas</p>
            <div className="flex items-baseline justify-center lg:justify-start gap-1">
              <span className="text-4xl sm:text-5xl font-black text-white">R$ 25,00</span>
              <span className="text-sm text-muted-foreground font-medium">/mês</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-bold text-white">
            <span className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Até 50 músicas</span>
            <span className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Links ilimitados</span>
            <span className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> 100% online</span>
            <span className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Sem taxa de setup</span>
            <span className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Cancele quando quiser</span>
            <span className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Atualizações constantes</span>
          </div>

          <div className="shrink-0 text-center space-y-2 w-full sm:w-auto">
            <button
              onClick={() => setLocation("/cadastro?plano=premium")}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-primary text-black font-black text-sm hover:bg-primary/90 transition-all shadow-xl uppercase tracking-wider cursor-pointer"
            >
              Começar Gratuitamente
            </button>
            <p className="text-[11px] text-muted-foreground">7 dias grátis para testar</p>
          </div>
        </div>
      </section>

      {/* 6. TESTIMONIALS */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white uppercase tracking-tight">
            O QUE OS ARTISTAS DIZEM
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              name: "João Vitor",
              role: "Cantor Sertanejo",
              avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
              quote: "Depois que criei meu perfil no Portal do Artista, fechei 5 shows em um mês! Muito profissional e fácil de usar."
            },
            {
              name: "Mariana Costa",
              role: "Cantora Pop",
              avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
              quote: "Organizei todas as minhas músicas e hoje tenho tudo na palma da mão. Recomendo demais!"
            },
            {
              name: "Lucas Andrade",
              role: "Produtor Musical",
              avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
              quote: "A área VIP me ajudou a monetizar meu conteúdo e criar uma conexão mais forte com meus fãs."
            }
          ].map((item, idx) => (
            <div key={idx} className="bg-card/40 border border-border/50 p-6 rounded-3xl space-y-4 shadow-lg">
              <div className="flex text-primary">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 italic leading-relaxed">
                "{item.quote}"
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-border/30">
                <img src={item.avatar} alt={item.name} className="w-10 h-10 rounded-full object-cover border border-primary/40" />
                <div>
                  <h4 className="text-xs font-extrabold text-white">{item.name}</h4>
                  <p className="text-[11px] text-primary font-medium">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. FAQ ACCORDION */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white uppercase tracking-tight">
            DÚVIDAS FREQUENTES
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faqs.map((faq, idx) => {
            const isOpen = faqOpen[idx];
            return (
              <div 
                key={idx}
                className="bg-card/40 border border-border/50 rounded-2xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-white hover:text-primary transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-primary shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-muted-foreground leading-relaxed border-t border-border/20 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. FINAL CTA BANNER */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/40 bg-gradient-to-b from-transparent via-primary/5 to-primary/10 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-8 relative z-10">
          <div className="space-y-3">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Pronto para <span className="text-primary">transformar</span> sua carreira?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Comece agora gratuitamente e veja a diferença.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setLocation("/cadastro?plano=premium")}
              className="px-10 py-4.5 rounded-full bg-primary hover:bg-primary/95 text-black font-black text-base shadow-[0_10px_35px_rgba(245,197,24,0.35)] hover:scale-105 transition-all cursor-pointer uppercase tracking-wider inline-flex items-center gap-2"
            >
              <Zap className="w-5 h-5 fill-current" />
              Começar Gratuitamente
            </button>
            <p className="text-xs text-muted-foreground font-medium">7 dias grátis para testar</p>
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground font-medium pt-4">
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-primary" /> Sem compromisso</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Cancele quando quiser</span>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
