import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  Sparkles, CheckCircle2, XCircle, ArrowRight, Zap, Play, ChevronDown, 
  HelpCircle, ShieldCheck, Heart, Users, Music2, Star, Check
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

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
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetch("/api/plans")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const mapped = data
            .filter((p: any) => p.nome !== "free") // Exclude free plan
            .map((p: any) => {
              let tagline = "";
              let color = "bg-primary/20 text-primary border-primary/30";
              let cardStyle = "border-border/40 bg-card/40";
              
              if (p.nome === "basico") {
                tagline = "Sua jornada profissional começa aqui.";
                color = "bg-green-500/20 text-green-400 border-green-500/30";
              } else if (p.nome === "pro") {
                tagline = "Grandes músicas merecem grandes apresentações.";
                color = "bg-blue-500/20 text-blue-400 border-blue-500/30";
                cardStyle = "border-primary bg-gradient-to-b from-primary/10 via-card/50 to-card/50 ring-2 ring-primary/25 shadow-[0_0_30px_rgba(245,197,24,0.15)]";
              } else if (p.nome === "premium") {
                tagline = "Para quem quer viver da música.";
                color = "bg-orange-500/20 text-orange-400 border-orange-500/30";
              }

              return {
                id: p.nome,
                nome: p.nome,
                label: p.label,
                preco: p.preco,
                tagline,
                color,
                cardStyle,
                features: buildLocalFeatures(p),
              };
            });
          setPlans(mapped);
        }
      })
      .catch(console.error);
  }, []);

  const buildLocalFeatures = (p: any) => {
    const list = [];
    const limit = parseInt(p.limiteMusicas);
    if (limit > 0) list.push(`${limit} Músicas no catálogo`);
    
    const pct = parseInt(p.personalizacaoPercent);
    if (pct > 0) list.push(`${pct}% de personalização visual`);
    
    if (p.canCustomizePlayerColor) list.push("Player de áudio customizável");
    if (p.canUploadBanner) list.push("Banner de perfil personalizado");
    if (p.canUploadProfilePhoto) list.push("Foto de perfil customizável");
    if (p.aiCreditsLimit && p.aiCreditsLimit > 0) list.push(`${p.aiCreditsLimit} consultas com a Vivi (IA Mentora)`);
    
    return list;
  };

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
      a: "Sim, o cancelamento é livre de burocracias. Você cancela direto no painel do artista com apenas um clique, sem taxas adicionais de rescisão."
    },
    {
      q: "Consigo editar meu perfil após o cadastro?",
      a: "Com certeza! Você tem total controle sobre suas fotos, banners, catalogação de músicas, dados de contato e cores do player, direto no seu Painel Administrativo."
    },
    {
      q: "Como compartilho minhas músicas com produtores?",
      a: "A plataforma gera um link único e limpo com o seu nome (ex: portaldoartista.com/seu-nome). Você compartilha esse link na sua bio do Instagram, WhatsApp ou e-mail, e os produtores poderão ouvir no player integrado de alto nível."
    },
    {
      q: "Preciso instalar algum aplicativo?",
      a: "Não. O Portal do Artista é 100% web, otimizado para celulares e computadores. Você gerencia tudo e seus ouvintes escutam sem precisar instalar nada."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-hidden">
      <Navbar />

      {/* 1. HERO */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-primary/5 via-transparent to-transparent">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              Sua Carreira Profissional Começa Aqui
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Sua música pode ser incrível.<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-yellow-200 to-primary">
                Mas ela está sendo apresentada como merece?
              </span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Pare de enviar apenas arquivos soltos no WhatsApp ou links de pastas desorganizadas. 
              Crie sua página profissional em minutos, organize seu catálogo de faixas e impressione quem decide.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link href="/cadastro">
                <button className="w-full sm:w-auto px-10 py-4.5 rounded-full bg-primary text-primary-foreground font-extrabold text-lg hover:bg-primary/95 transition-all shadow-[0_8px_30px_rgba(245,197,24,0.3)] hover:-translate-y-0.5 active:translate-y-0">
                  COMEÇAR AGORA
                </button>
              </Link>
            </div>

            <div className="pt-6 flex items-center justify-center lg:justify-start gap-2 text-muted-foreground text-sm">
              <div className="flex text-primary">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <span>Mais de 35 artistas já utilizam o <strong>PORTALDOARTISTA.COM</strong>.</span>
            </div>
          </div>

          <div className="lg:col-span-5 relative flex justify-center">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl -z-10" />
            <div className="relative border border-border/40 rounded-3xl overflow-hidden bg-card/60 backdrop-blur-md max-w-sm sm:max-w-md w-full shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-border/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-yellow-500" />
                  <div>
                    <h3 className="font-bold text-white text-base">Seu Nome Artístico</h3>
                    <p className="text-xs text-muted-foreground">Compositor / Cantor</p>
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase">
                  VIP
                </div>
              </div>
              <div className="h-40 rounded-2xl bg-black/40 flex items-center justify-center relative overflow-hidden group">
                <Play className="w-12 h-12 text-primary fill-primary/20 group-hover:scale-110 transition-transform cursor-pointer" />
                <span className="absolute bottom-3 left-3 text-xs text-white/80 bg-black/50 px-2 py-0.5 rounded">
                  Clique para escutar
                </span>
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full bg-border/20 rounded-full" />
                <div className="h-2 w-2/3 bg-border/20 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. IDENTIFICAÇÃO (A DOR) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-y border-border/40 bg-card/10">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Você se identifica com alguma dessas situações?
            </h2>
            <p className="text-muted-foreground text-base max-w-xl mx-auto">
              A jornada de um músico independente é cheia de obstáculos. Quantas dessas barreiras você enfrenta hoje?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            {[
              "Envia suas músicas em arquivos soltos pelo WhatsApp.",
              "Tem várias versões da mesma música espalhadas no celular.",
              "Não possui uma apresentação visual profissional unificada.",
              "Não sabe como impressionar produtores e contratantes de eventos.",
              "Sua carreira e portfólio musical estão desorganizados.",
              "Perde oportunidades importantes por falta de uma estrutura online rápida."
            ].map((dor, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4.5 rounded-2xl bg-card/30 border border-border/20 hover:border-red-500/30 transition-all">
                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <span className="text-muted-foreground text-sm font-medium leading-relaxed">{dor}</span>
              </div>
            ))}
          </div>

          <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 max-w-2xl mx-auto">
            <p className="text-lg font-bold text-white">
              Se você respondeu <span className="text-primary font-black">"SIM"</span> para alguma dessas situações, o <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-yellow-200">PORTALDOARTISTA.COM</span> foi desenhado sob medida para você.
            </p>
          </div>
        </div>
      </section>

      {/* 3. A SOLUÇÃO */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            A maneira profissional de apresentar sua carreira
          </h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            Esqueça arquivos pesados e links feios. Entregue uma experiência premium para contratantes e fãs.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-4 order-2 lg:order-1">
            {[
              { t: "Página profissional personalizada", d: "Escolha suas cores, fotos e biografia para estampar seu talento." },
              { t: "Catálogo organizado", d: "Organize todas as suas composições e gravações de maneira lógica." },
              { t: "Player integrado de alto nível", d: "Seus ouvintes dão play na música diretamente no navegador sem complicações." },
              { t: "Link único para compartilhar", d: "Um único link curto que contém tudo o que as pessoas precisam saber." },
              { t: "CRM para gestão da carreira", d: "Acompanhe seus contatos, propostas e histórico de conversas com contratantes." },
              { t: "Agenda de compromissos", d: "Nunca perca um show, sessão de gravação ou reunião importante." },
              { t: "Área VIP e Exclusiva", d: "Libere acessos especiais ou materiais restritos apenas para contatos autorizados." },
              { t: "Perfil totalmente editável", d: "Altere dados, fotos e playlists instantaneamente pelo painel de forma simples." }
            ].map((sol, idx) => (
              <div key={idx} className="flex gap-3 items-start">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-sm">{sol.t}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{sol.d}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-7 order-1 lg:order-2 flex justify-center">
            <div className="relative w-full max-w-lg">
              <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl -z-10" />
              <div className="border border-border/40 rounded-2xl overflow-hidden bg-card shadow-2xl">
                <div className="bg-black/50 px-4 py-2 border-b border-border/20 flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-[10px] text-muted-foreground ml-2 font-mono">portaldoartista.com/alan-ribeiro</span>
                </div>
                <div className="p-6 space-y-4">
                  <div className="h-32 rounded-xl bg-gradient-to-r from-primary/10 to-yellow-500/5 flex items-center gap-4 p-4 border border-border/20">
                    <div className="w-16 h-16 rounded-full bg-primary/20 shrink-0 border border-primary/30" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 w-1/3 bg-white/10 rounded" />
                      <div className="h-2.5 w-2/3 bg-white/5 rounded" />
                      <div className="h-2.5 w-1/2 bg-white/5 rounded" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-16 rounded-xl bg-card border border-border/20 p-3 space-y-2">
                      <div className="h-2 w-1/2 bg-white/10 rounded" />
                      <div className="h-2 w-3/4 bg-white/5 rounded" />
                    </div>
                    <div className="h-16 rounded-xl bg-card border border-border/20 p-3 space-y-2">
                      <div className="h-2 w-2/3 bg-white/10 rounded" />
                      <div className="h-2 w-1/3 bg-white/5 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. ANTES x DEPOIS */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-y border-border/40 bg-card/10">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Sua carreira de cara nova
            </h2>
            <p className="text-muted-foreground text-base max-w-xl mx-auto">
              Veja a diferença de posicionamento ao adotar o nosso portal profissional.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* ANTES */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6.5 space-y-6">
              <h3 className="text-xl font-bold text-red-400 flex items-center gap-2 border-b border-red-500/10 pb-3">
                <XCircle className="w-6 h-6" />
                Antes da Plataforma
              </h3>
              
              <ul className="space-y-4">
                {[
                  "Arquivos MP3 perdidos e pesados no chat do WhatsApp.",
                  "Links de Google Drive lentos ou com acessos bloqueados.",
                  "Perfil do Instagram sem link profissional para portfólio.",
                  "Arquivos e letras espalhados em pastas e e-mails.",
                  "Sensação de amadorismo ao enviar links confusos."
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-muted-foreground text-sm">
                    <span className="text-red-500 font-extrabold shrink-0 mt-0.5">❌</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* DEPOIS */}
            <div className="bg-emerald-500/5 border border-emerald-500/25 rounded-3xl p-6.5 space-y-6 shadow-[0_0_30px_rgba(16,185,129,0.08)]">
              <h3 className="text-xl font-bold text-emerald-400 flex items-center gap-2 border-b border-emerald-500/15 pb-3">
                <CheckCircle2 className="w-6 h-6" />
                Depois da Plataforma
              </h3>
              
              <ul className="space-y-4">
                {[
                  "Página profissional de alta performance e carregamento rápido.",
                  "Catálogo musical 100% organizado e categorizado.",
                  "Link único, limpo e profissional (portaldoartista.com/seu-nome).",
                  "Apresentação visual impactante com fotos, redes e letras.",
                  "Postura de destaque que transmite credibilidade e valoriza sua marca."
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-white/90 text-sm font-medium">
                    <span className="text-emerald-400 font-extrabold shrink-0 mt-0.5">✅</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5. DEMONSTRAÇÃO */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Como funciona em menos de 1 minuto
          </h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            Criar sua página profissional, cadastrar músicas e compartilhar seu link com produtores é extremamente simples.
          </p>
        </div>

        <div className="relative max-w-3xl mx-auto aspect-video rounded-3xl overflow-hidden bg-black/60 border border-border/40 shadow-2xl flex flex-col items-center justify-center p-6 text-center group">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
          <div className="z-10 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary text-primary flex items-center justify-center group-hover:scale-110 transition-transform cursor-pointer shadow-lg shadow-primary/20">
              <Play className="w-6 h-6 fill-current ml-1" />
            </div>
            <div>
              <p className="font-bold text-white text-base">Vídeo de Demonstração Rápida</p>
              <p className="text-xs text-muted-foreground/80 mt-1 max-w-md">Veja como criar o perfil, adicionar suas primeiras músicas no catálogo e gerenciar seus contatos em segundos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BENEFÍCIOS */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-y border-border/40 bg-card/10">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Mais do que ferramentas: a sua transformação
            </h2>
            <p className="text-muted-foreground text-base max-w-xl mx-auto">
              Não entregamos apenas tecnologia. Entregamos a chave para o próximo nível da sua jornada artística.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { t: "Impressione Produtores", d: "Seja visto como um artista experiente e preparado que cuida do visual do seu portfólio." },
              { t: "Organize sua Carreira", d: "Suba letras, arquivos de áudio oficiais e histórico de contatos num único local." },
              { t: "Compartilhe seu Link Único", d: "Basta colar portaldoartista.com/nome nas redes sociais ou no WhatsApp de contratantes." },
              { t: "Fortaleça sua Marca Artística", d: "Sua identidade visual, fotos e player personalizados geram autoridade imediata." },
              { t: "Economize seu Tempo", d: "Pare de procurar arquivos salvos em locais diferentes toda vez que pedirem um portfólio." },
              { t: "Centralização Eficaz", d: "Centralize agenda de shows, gerenciador de contatos e material de áudio em um só painel." }
            ].map((ben, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-card/30 border border-border/20 space-y-2 hover:-translate-y-1 transition-all hover:border-primary/30">
                <Check className="w-5 h-5 text-primary" />
                <h4 className="font-bold text-white text-base">{ben.t}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{ben.d}</p>
              </div>
            ))}
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

      {/* 9. PLANOS */}
      <section id="planos" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Planos sob medida para o seu sucesso
          </h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            Escolha o pacote ideal para divulgar suas produções. Ativação instantânea e sem complicação.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-muted-foreground">
              Carregando planos da plataforma...
            </div>
          ) : (
            plans.map((plan) => (
              <div 
                key={plan.id}
                className={`rounded-3xl p-6.5 border flex flex-col justify-between relative transition-all ${plan.cardStyle}`}
              >
                {plan.nome === "pro" && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-black tracking-widest uppercase">
                    ⭐ MAIS POPULAR
                  </span>
                )}
                
                <div className="space-y-4">
                  <div>
                    <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase border ${plan.color}`}>
                      {plan.label}
                    </span>
                    <h3 className="text-xl font-extrabold text-white mt-2.5">{plan.label}</h3>
                    <p className="text-xs text-muted-foreground/80 mt-1 min-h-[32px]">{plan.tagline}</p>
                  </div>

                  <div className="flex items-baseline gap-1 py-2 border-y border-border/20">
                    <span className="text-3xl font-extrabold text-white">
                      R$ {parseFloat(plan.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-muted-foreground">/mês</span>
                  </div>

                  <ul className="space-y-3 pt-2">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-normal">
                        <CheckCircle2 className="w-4.5 h-4.5 text-primary shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-8">
                  <Link href={`/cadastro?plano=${plan.id}`}>
                    <button className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-sm transition-all shadow-md">
                      ASSINAR AGORA
                    </button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 10. GARANTIA */}
      <section className="py-12.5 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="p-6.5 rounded-3xl bg-card/40 border border-border/40 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { t: "Ativação Imediata", d: "Configure seu catálogo na mesma hora.", icon: <ShieldCheck className="w-5 h-5 text-primary mx-auto mb-1.5" /> },
            { t: "Sem Burocracia", d: "Não exigimos tempo mínimo de contrato.", icon: <CheckCircle2 className="w-5 h-5 text-primary mx-auto mb-1.5" /> },
            { t: "Cancele Quando Quiser", d: "Interrompa a cobrança com um clique.", icon: <XCircle className="w-5 h-5 text-primary mx-auto mb-1.5" /> },
            { t: "Evolução Contínua", d: "Novos recursos mensais inclusos.", icon: <Zap className="w-5 h-5 text-primary mx-auto mb-1.5" /> }
          ].map((gar, idx) => (
            <div key={idx} className="space-y-1">
              {gar.icon}
              <h4 className="font-bold text-white text-xs">{gar.t}</h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{gar.d}</p>
            </div>
          ))}
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
            <Link href="/cadastro">
              <button className="px-12 py-5 rounded-full bg-primary hover:bg-primary/95 text-primary-foreground font-black text-lg transition-all shadow-[0_8px_30px_rgba(245,197,24,0.35)] hover:-translate-y-0.5 active:translate-y-0">
                QUERO COMEÇAR AGORA
              </button>
            </Link>
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
