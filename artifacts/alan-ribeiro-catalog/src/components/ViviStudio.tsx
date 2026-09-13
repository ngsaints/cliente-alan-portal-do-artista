import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Music, 
  Mic, 
  Play, 
  Pause, 
  Download, 
  Plus, 
  Volume2, 
  Send, 
  Bot, 
  User, 
  Zap, 
  Check, 
  Loader2, 
  RefreshCw, 
  Sliders, 
  Disc, 
  Headphones, 
  FileText, 
  Radio, 
  ArrowUpRight,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

interface ViviStudioProps {
  artist: any;
  onRefreshArtist?: () => void;
  onOpenUpgradeModal?: () => void;
}

interface DemoItem {
  id: number;
  titulo: string;
  letra?: string;
  estilo: string;
  voz: string;
  bpm?: number;
  clima?: string;
  audioUrl?: string;
  status: string;
  predictionId?: string;
  error?: string;
  createdAt: string;
}

const GENRES = [
  { id: "Sertanejo", label: "Sertanejo", icon: "🤠" },
  { id: "Sertanejo Universitário", label: "Sertanejo Univ.", icon: "🎸" },
  { id: "Piseiro", label: "Piseiro", icon: "🎹" },
  { id: "Forró", label: "Forró", icon: "🪗" },
  { id: "Pagode", label: "Pagode", icon: "🥁" },
  { id: "Modão", label: "Modão Caipira", icon: "🌾" },
  { id: "Pop", label: "Pop / Trap", icon: "✨" },
  { id: "Gospel", label: "Gospel / Worship", icon: "🙏" },
  { id: "Rock", label: "Rock / MPB", icon: "⚡" },
];

const VOICES = [
  { id: "Masculina", label: "Voz Masculina", desc: "Cantor solo encorpado e marcante" },
  { id: "Feminina", label: "Voz Feminina", desc: "Cantora solo expressiva e afinada" },
  { id: "Dupla / Dueto", label: "Dupla / Dueto", desc: "Harmonia vocal primeira e segunda voz" },
  { id: "Instrumental", label: "Apenas Instrumental", desc: "Arranjo completo sem vocal" },
];

const MOODS = [
  "Romântico",
  "Sofrência",
  "Dançante / Festa",
  "Apaixonado",
  "Bruto / Rústico",
  "Animado / Alto Astral",
  "Nostálgico",
];

const TAGS = [
  "[Intro]",
  "[Verse 1]",
  "[Pre-Chorus]",
  "[Chorus]",
  "[Verse 2]",
  "[Bridge]",
  "[Solo]",
  "[Chorus]",
  "[Outro]",
];

export function ViviStudio({ artist, onRefreshArtist, onOpenUpgradeModal }: ViviStudioProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"studio" | "mentor">("studio");

  // Form State
  const [titulo, setTitulo] = useState("");
  const [letra, setLetra] = useState("");
  const [estilo, setEstilo] = useState("Sertanejo");
  const [voz, setVoz] = useState("Masculina");
  const [bpm, setBpm] = useState(120);
  const [clima, setClima] = useState("Romântico");
  const [promptExtra, setPromptExtra] = useState("");

  // Loading States
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>("");

  // Demos & Credits
  const [demos, setDemos] = useState<DemoItem[]>([]);
  const [currentDemo, setCurrentDemo] = useState<DemoItem | null>(null);
  const [creditsInfo, setCreditsInfo] = useState<{
    plano: string;
    music: { used: number; planLimit: number; extraCredits: number; totalLimit: number; remaining: number };
    text: { used: number; limit: number; remaining: number };
  } | null>(null);

  // Audio Player State
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lyricsTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Mentor Chat State
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content: `👋 Olá, ${artist?.name || "Artista"}! Eu sou a Vivi, sua assistente de composição e mentora no Portal do Artista.\n\nNo **Estúdio de Criação**, posso te ajudar a transformar qualquer letra em uma demo cantada completa com voz e instrumentos usando IA de última geração (MiniMax Music 2.6). Se precisar de dicas de arranjo, ideias de rima ou marketing, estou aqui!`,
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string>("chat");

  // Fetch Credits Balance & Demos History
  const loadData = async () => {
    try {
      const [creditsRes, demosRes] = await Promise.all([
        fetch("/api/ai/credits/balance"),
        fetch("/api/ai/music/history"),
      ]);

      if (creditsRes.ok) {
        const cData = await creditsRes.json();
        setCreditsInfo(cData);
      }

      if (demosRes.ok) {
        const dData = await demosRes.json();
        setDemos(dData);
        if (dData.length > 0 && !currentDemo) {
          setCurrentDemo(dData[0]);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados do Estúdio Vivi:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [artist?.id]);

  // Tag Injection
  const injectTag = (tag: string) => {
    const textarea = lyricsTextareaRef.current;
    if (!textarea) {
      setLetra((prev) => prev ? `${prev}\n\n${tag}\n` : `${tag}\n`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = letra.substring(0, start);
    const after = letra.substring(end);
    const newText = `${before}\n${tag}\n${after}`;
    setLetra(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length + 2, start + tag.length + 2);
    }, 50);
  };

  // Optimize Lyrics with OpenRouter
  const handleOptimizeLyrics = async () => {
    if (!letra.trim()) {
      toast({
        title: "Escreva uma letra primeiro",
        description: "Digite ou cole os versos da sua música para que eu possa estruturá-la com as tags e rimas ideais.",
        variant: "destructive",
      });
      return;
    }

    setIsOptimizing(true);
    try {
      const res = await fetch("/api/ai/lyrics/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titulo || "Composição",
          lyrics: letra,
          genre: estilo,
          mood: clima,
          bpm,
          voice: voz,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Falha ao aprimorar letra");
      }

      const data = await res.json();
      if (data.optimizedLyrics) {
        setLetra(data.optimizedLyrics);
      }
      if (data.suggestedPrompt) {
        setPromptExtra(data.suggestedPrompt);
      }

      toast({
        title: "✨ Letra aprimorada com sucesso!",
        description: "Estruturei as tags [Intro], [Verse], [Chorus] e otimizei a métrica para o MiniMax Music 2.6.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao aprimorar letra",
        description: error.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  // Generate Music with Replicate MiniMax Music 2.6
  const handleGenerateMusic = async () => {
    if (!titulo.trim()) {
      toast({
        title: "Informe o título",
        description: "Dê um título para a sua composição antes de gerar a demo.",
        variant: "destructive",
      });
      return;
    }

    if (!letra.trim()) {
      toast({
        title: "Letra necessária",
        description: "Adicione a letra ou estrutura musical da sua faixa.",
        variant: "destructive",
      });
      return;
    }

    if (creditsInfo && creditsInfo.music.remaining <= 0) {
      toast({
        title: "Créditos de música esgotados",
        description: "Você atingiu o limite de gerações do seu plano atual. Faça upgrade para continuar criando demos cantadas!",
        variant: "destructive",
      });
      if (onOpenUpgradeModal) onOpenUpgradeModal();
      return;
    }

    setIsGenerating(true);
    setGenerationStep("Iniciando sintetizador vocal e arranjos no MiniMax Music 2.6...");

    try {
      const res = await fetch("/api/ai/music/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titulo.trim(),
          lyrics: letra.trim(),
          genre: estilo,
          mood: clima,
          bpm,
          voice: voz,
          prompt: promptExtra,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        if (errData.creditsExhausted && onOpenUpgradeModal) {
          onOpenUpgradeModal();
        }
        throw new Error(errData.error || "Falha ao iniciar geração da demo");
      }

      const initialDemo: DemoItem = await res.json();
      setCurrentDemo(initialDemo);
      setDemos((prev) => [initialDemo, ...prev.filter((d) => d.id !== initialDemo.id)]);

      // Iniciar Polling de Status
      pollDemoStatus(initialDemo.id);
    } catch (error: any) {
      setIsGenerating(false);
      setGenerationStep("");
      toast({
        title: "Não foi possível gerar a demo",
        description: error.message || "Verifique sua conexão ou tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Polling helper
  const pollDemoStatus = async (demoId: number) => {
    const steps = [
      "Interpretando letra e harmonia musical...",
      "Gravando instrumentos e arranjos (bateria, violão, sanfona)...",
      "Sintetizando afinação e expressão vocal...",
      "Masterizando áudio em alta definição (MP3)...",
    ];

    let stepIndex = 0;
    const interval = setInterval(async () => {
      stepIndex = (stepIndex + 1) % steps.length;
      setGenerationStep(steps[stepIndex]);

      try {
        const res = await fetch(`/api/ai/music/status/${demoId}`);
        if (res.ok) {
          const updated: DemoItem = await res.json();
          setCurrentDemo(updated);
          setDemos((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));

          if (updated.status === "completed" && updated.audioUrl) {
            clearInterval(interval);
            setIsGenerating(false);
            setGenerationStep("");
            loadData();
            if (onRefreshArtist) onRefreshArtist();

            toast({
              title: "🎉 Sua demo cantada está pronta!",
              description: `Ouça agora "${updated.titulo}" e salve direto no seu catálogo musical.`,
            });
          } else if (updated.status === "failed") {
            clearInterval(interval);
            setIsGenerating(false);
            setGenerationStep("");
            toast({
              title: "A geração falhou",
              description: updated.error || "O motor de IA não pôde processar este áudio.",
              variant: "destructive",
            });
          }
        }
      } catch (err) {
        console.error("Erro no polling da demo:", err);
      }
    }, 4000);
  };

  // Save Demo directly into Artist Song Catalog
  const handleSaveToCatalog = async (demo: DemoItem) => {
    try {
      const res = await fetch("/api/ai/music/save-to-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demoId: demo.id,
          status: "Disponível",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Falha ao salvar no catálogo");
      }

      toast({
        title: "✅ Música adicionada ao seu catálogo!",
        description: `"${demo.titulo}" agora está disponível na sua vitrine e no seu repertório oficial.`,
      });

      if (onRefreshArtist) onRefreshArtist();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Audio Playback
  const togglePlayAudio = (demo: DemoItem) => {
    if (!demo.audioUrl) return;

    if (playingAudioId === demo.id && audioRef.current) {
      if (!audioRef.current.paused) {
        audioRef.current.pause();
        setPlayingAudioId(null);
      } else {
        audioRef.current.play();
        setPlayingAudioId(demo.id);
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.src = demo.audioUrl;
      audioRef.current.play();
      setPlayingAudioId(demo.id);
    }
  };

  // Mentor Chat Message
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg = { role: "user" as const, content: chatInput.trim() };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/artists/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          tool: selectedTool,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Falha ao consultar a mentora");
      }

      const data = await res.json();
      setChatMessages([...newMessages, { role: "assistant", content: data.reply }]);
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro na resposta da Vivi",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Audio Element Hidden */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setAudioProgress(el.currentTime);
          setAudioDuration(el.duration || 0);
        }}
        onEnded={() => setPlayingAudioId(null)}
      />

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/15 via-background to-cyan-500/10 border border-amber-500/30 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black shadow-lg shadow-amber-500/30 flex-shrink-0">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Estúdio Vivi <span className="text-amber-400">&</span> Demos IA
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  MiniMax 2.6
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                Crie letras perfeitas com a mentoria da Vivi e gere demos completas cantadas com voz humana e instrumentos reais.
              </p>
            </div>
          </div>

          {/* Credits Badge & Quick Actions */}
          <div className="flex flex-wrap items-center gap-3 bg-card/80 border border-border/80 rounded-2xl p-3 backdrop-blur-md">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              <div>
                <span className="text-xs text-muted-foreground block">Créditos de Demo</span>
                <span className="text-sm font-bold text-foreground">
                  {creditsInfo ? `${creditsInfo.music.remaining} de ${creditsInfo.music.totalLimit} restantes` : "Carregando..."}
                </span>
              </div>
            </div>

            {onOpenUpgradeModal && (
              <button
                onClick={onOpenUpgradeModal}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
              >
                <span>Mais Créditos</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-6 pt-6 border-t border-white/10">
          <button
            onClick={() => setActiveTab("studio")}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === "studio"
                ? "bg-amber-400 text-black shadow-lg shadow-amber-400/25"
                : "bg-secondary/40 text-muted-foreground hover:text-white hover:bg-secondary/60"
            }`}
          >
            <Disc className={`w-4 h-4 ${activeTab === "studio" ? "animate-spin" : ""}`} />
            <span>Estúdio de Criação de Demos</span>
          </button>

          <button
            onClick={() => setActiveTab("mentor")}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === "mentor"
                ? "bg-amber-400 text-black shadow-lg shadow-amber-400/25"
                : "bg-secondary/40 text-muted-foreground hover:text-white hover:bg-secondary/60"
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Vivi Mentora (Chat)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ESTÚDIO DE MÚSICA & CRIAÇÃO */}
      {activeTab === "studio" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna Esquerda: Formulário de Composição */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-card/90 border border-border rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-foreground text-base">Parâmetros da Composição</h3>
                </div>
                <span className="text-xs text-muted-foreground font-mono">MiniMax Music 2.6</span>
              </div>

              {/* Título */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wider">
                  Título da Música
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Saudade no Copo, Pra Cima Deles, Amor de Balada..."
                  className="w-full px-4 py-3 bg-secondary/30 border border-border focus:border-amber-400 rounded-2xl text-foreground text-sm font-medium focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              {/* Gênero / Estilo */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-2 uppercase tracking-wider">
                  Gênero Musical
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
                  {GENRES.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setEstilo(g.id)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                        estilo === g.id
                          ? "bg-amber-400/20 border-amber-400 text-amber-300 shadow-sm"
                          : "bg-secondary/20 border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                      }`}
                    >
                      <span>{g.icon}</span>
                      <span className="truncate">{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipo de Voz */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-2 uppercase tracking-wider">
                  Tipo de Vocalização
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {VOICES.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVoz(v.id)}
                      className={`p-3 rounded-2xl text-left border transition-all ${
                        voz === v.id
                          ? "bg-amber-400/15 border-amber-400 text-foreground"
                          : "bg-secondary/20 border-border/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{v.label}</span>
                        {voz === v.id && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{v.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Andamento (BPM) e Clima (Mood) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Andamento: {bpm} BPM
                    </label>
                    <span className="text-[10px] text-amber-400 font-mono">
                      {bpm < 95 ? "Lento / Balada" : bpm < 130 ? "Médio / Padrão" : "Rápido / Pista"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={70}
                    max={165}
                    value={bpm}
                    onChange={(e) => setBpm(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wider">
                    Clima / Atmosfera
                  </label>
                  <select
                    value={clima}
                    onChange={(e) => setClima(e.target.value)}
                    className="w-full px-3 py-2.5 bg-secondary/30 border border-border focus:border-amber-400 rounded-xl text-foreground text-xs font-medium focus:outline-none"
                  >
                    {MOODS.map((m) => (
                      <option key={m} value={m} className="bg-background">
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Área da Letra com Botões de Injeção de Tags */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Letra & Estrutura ({letra.length} / 3.500 caracteres)
                  </label>
                  <button
                    type="button"
                    onClick={handleOptimizeLyrics}
                    disabled={isOptimizing || !letra.trim()}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 disabled:opacity-40 transition-colors"
                  >
                    {isOptimizing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Aprimorando com Vivi...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>✨ Aprimorar com IA</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Tag Pills */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  <span className="text-[10px] text-muted-foreground py-0.5 mr-1 font-mono">Tags:</span>
                  {TAGS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => injectTag(t)}
                      className="px-2 py-0.5 rounded-lg bg-secondary/60 hover:bg-amber-400/20 text-muted-foreground hover:text-amber-300 border border-border/80 text-[10px] font-mono font-medium transition-all"
                    >
                      + {t}
                    </button>
                  ))}
                </div>

                <textarea
                  ref={lyricsTextareaRef}
                  value={letra}
                  onChange={(e) => setLetra(e.target.value)}
                  placeholder={`Cole ou escreva sua letra aqui. Exemplo:\n\n[Intro]\n(Solo de sanfona e violão)\n\n[Verse 1]\nVocê me olhou e o mundo parou...\n\n[Chorus]\nÉ você que eu quero pra minha vida inteira...`}
                  rows={9}
                  maxLength={3500}
                  className="w-full px-4 py-3 bg-secondary/20 border border-border focus:border-amber-400 rounded-2xl text-foreground text-xs font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              {/* Botão de Disparo */}
              <button
                type="button"
                onClick={handleGenerateMusic}
                disabled={isGenerating || !titulo.trim() || !letra.trim()}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Gerando Demo Musical...</span>
                  </>
                ) : (
                  <>
                    <Headphones className="w-5 h-5" />
                    <span>🚀 Gerar Demo Cantada (MiniMax Music 2.6)</span>
                  </>
                )}
              </button>

              {isGenerating && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-2 animate-pulse">
                  <p className="text-xs font-semibold text-amber-300">{generationStep}</p>
                  <p className="text-[11px] text-muted-foreground">
                    A geração de áudio com voz e instrumentos leva em média 30 a 60 segundos. Não feche esta tela!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Coluna Direita: Player da Demo Atual & Histórico */}
          <div className="lg:col-span-5 space-y-6">
            {/* Player em Destaque */}
            <div className="bg-gradient-to-b from-card to-secondary/20 border border-border rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Disc className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: "8s" }} />
                  <h3 className="font-bold text-foreground text-sm">Demo em Destaque</h3>
                </div>
                {currentDemo && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-mono">
                    {new Date(currentDemo.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>

              {currentDemo ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-background/80 border border-border/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-foreground text-base line-clamp-1">{currentDemo.titulo}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-amber-400 font-semibold">{currentDemo.estilo}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{currentDemo.voz}</span>
                        </div>
                      </div>

                      {/* Play / Pause */}
                      <button
                        onClick={() => togglePlayAudio(currentDemo)}
                        disabled={!currentDemo.audioUrl || currentDemo.status !== "completed"}
                        className="w-12 h-12 rounded-full bg-amber-400 hover:bg-amber-300 text-black flex items-center justify-center shadow-lg shadow-amber-400/30 transition-transform active:scale-95 disabled:opacity-40"
                      >
                        {playingAudioId === currentDemo.id ? (
                          <Pause className="w-5 h-5 fill-black" />
                        ) : (
                          <Play className="w-5 h-5 fill-black ml-0.5" />
                        )}
                      </button>
                    </div>

                    {/* Progress Bar se estiver tocando */}
                    {playingAudioId === currentDemo.id && audioDuration > 0 && (
                      <div className="space-y-1">
                        <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-400 h-full transition-all"
                            style={{ width: `${(audioProgress / audioDuration) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                          <span>{Math.floor(audioProgress)}s</span>
                          <span>{Math.floor(audioDuration)}s</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ações da Demo */}
                  {currentDemo.status === "completed" && currentDemo.audioUrl && (
                    <div className="grid grid-cols-2 gap-3">
                      <a
                        href={currentDemo.audioUrl}
                        download={`${currentDemo.titulo}.mp3`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2.5 rounded-xl bg-secondary/80 hover:bg-secondary border border-border text-foreground font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar MP3</span>
                      </a>

                      <button
                        onClick={() => handleSaveToCatalog(currentDemo)}
                        className="px-3 py-2.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Salvar no Catálogo</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <Music className="w-10 h-10 mx-auto opacity-30" />
                  <p className="text-xs">Nenhuma demo gerada ainda.</p>
                  <p className="text-[11px] opacity-70">
                    Preencha o formulário e clique em "Gerar Demo Cantada" para ver a mágica da IA acontecer!
                  </p>
                </div>
              )}
            </div>

            {/* Histórico de Demos */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-foreground text-sm">Histórico de Demos ({demos.length})</h3>
                </div>
                <button
                  onClick={loadData}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  title="Atualizar histórico"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {demos.length > 0 ? (
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {demos.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => setCurrentDemo(d)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        currentDemo?.id === d.id
                          ? "bg-amber-400/10 border-amber-400/60 shadow-sm"
                          : "bg-secondary/20 border-border/60 hover:bg-secondary/40"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <h5 className="font-bold text-xs text-foreground truncate">{d.titulo}</h5>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {d.estilo} • {d.voz} • {new Date(d.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {d.status === "completed" && d.audioUrl ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePlayAudio(d);
                            }}
                            className="w-8 h-8 rounded-full bg-secondary hover:bg-amber-400 hover:text-black flex items-center justify-center transition-colors"
                          >
                            {playingAudioId === d.id ? (
                              <Pause className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5 ml-0.5" />
                            )}
                          </button>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-mono animate-pulse">
                            Processando...
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Suas músicas geradas aparecerão salvas aqui.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VIVI MENTORA (CHAT) */}
      {activeTab === "mentor" && (
        <div className="bg-card border border-border rounded-3xl p-6 shadow-xl space-y-4 max-w-4xl mx-auto">
          {/* Tool Selector */}
          <div className="flex flex-wrap gap-2 pb-3 border-b border-border">
            {[
              { id: "chat", label: "💬 Dúvidas Gerais" },
              { id: "biografia", label: "📝 Biografia Profissional" },
              { id: "comercial", label: "⭐ Análise Comercial da Letra" },
              { id: "legenda", label: "📱 Legenda para Instagram" },
              { id: "reels", label: "🎬 Roteiro de Vídeo / Reels" },
              { id: "titulos", label: "💡 Sugestão de Títulos" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTool(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  selectedTool === t.id
                    ? "bg-amber-400 text-black border-amber-400 shadow-sm"
                    : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Messages Container */}
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {chatMessages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center shrink-0 shadow-md">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-amber-400 text-black font-medium rounded-tr-none"
                      : "bg-secondary/40 border border-border/80 text-foreground rounded-tl-none shadow-sm"
                  }`}
                >
                  {m.content}
                </div>
                {m.role === "user" && (
                  <div className="w-8 h-8 rounded-xl bg-secondary text-foreground flex items-center justify-center shrink-0 border border-border">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isChatLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl bg-secondary/40 border border-border/80 text-foreground text-xs flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Vivi está formulando a resposta...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="flex gap-2 pt-3 border-t border-border">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChatMessage();
                }
              }}
              placeholder="Digite sua dúvida ou peça para a Vivi analisar sua música..."
              rows={2}
              className="flex-1 px-4 py-3 bg-secondary/20 border border-border focus:border-amber-400 rounded-2xl text-foreground text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
            />
            <button
              onClick={handleSendChatMessage}
              disabled={isChatLoading || !chatInput.trim()}
              className="px-5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold flex items-center justify-center transition-all disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
