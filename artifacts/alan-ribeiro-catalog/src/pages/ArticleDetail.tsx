import { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import {
  Clock, Eye, Share2, ArrowLeft, BookOpen, User, Calendar,
  CheckCircle2, Sparkles, Copy, MessageCircle, Twitter, Linkedin, ExternalLink
} from "lucide-react";

interface Article {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverUrl: string;
  category: string;
  keywords: string;
  metaTitle: string;
  metaDescription: string;
  views: number;
  authorName: string;
  readingTimeMinutes: number;
  publishedAt: string;
}

export default function ArticleDetail() {
  const [, params] = useRoute("/artigos/:slug");
  const slug = params?.slug;
  const { toast } = useToast();

  const [article, setArticle] = useState<Article | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Handle Reading Scroll Progress Bar
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const currentProgress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, currentProgress)));
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch Article Data & Update SEO Head Meta Tags + JSON-LD
  useEffect(() => {
    if (!slug) return;

    setLoading(true);
    fetch(`/api/articles/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Artigo não encontrado");
        return res.json();
      })
      .then((data: Article) => {
        setArticle(data);

        // 1. Update Title and Meta Tags
        const metaTitle = data.metaTitle || data.title;
        const metaDesc = data.metaDescription || data.excerpt;
        document.title = `${metaTitle} | Portal do Artista`;

        // Update or create Meta Description
        let metaDescTag = document.querySelector('meta[name="description"]');
        if (!metaDescTag) {
          metaDescTag = document.createElement("meta");
          metaDescTag.setAttribute("name", "description");
          document.head.appendChild(metaDescTag);
        }
        metaDescTag.setAttribute("content", metaDesc);

        // Update Keywords
        if (data.keywords) {
          let metaKeywords = document.querySelector('meta[name="keywords"]');
          if (!metaKeywords) {
            metaKeywords = document.createElement("meta");
            metaKeywords.setAttribute("name", "keywords");
            document.head.appendChild(metaKeywords);
          }
          metaKeywords.setAttribute("content", data.keywords);
        }

        // 2. Inject JSON-LD Schema.org Structured Data
        const articleUrl = `https://portaldoartista.com/artigos/${data.slug}`;
        const jsonLdData = {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": data.title,
          "description": metaDesc,
          "image": [data.coverUrl || "https://portaldoartista.com/images/default-cover.png"],
          "datePublished": data.publishedAt,
          "dateModified": data.publishedAt,
          "author": {
            "@type": "Person",
            "name": data.authorName || "Redação Portal do Artista"
          },
          "publisher": {
            "@type": "Organization",
            "name": "Portal do Artista",
            "logo": {
              "@type": "ImageObject",
              "url": "https://portaldoartista.com/logo.png"
            }
          },
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": articleUrl
          }
        };

        let scriptTag = document.getElementById("article-schema-jsonld");
        if (!scriptTag) {
          scriptTag = document.createElement("script");
          scriptTag.id = "article-schema-jsonld";
          scriptTag.setAttribute("type", "application/ld+json");
          document.head.appendChild(scriptTag);
        }
        scriptTag.textContent = JSON.stringify(jsonLdData);

        // Fetch Related Articles
        fetch(`/api/articles?category=${encodeURIComponent(data.category)}`)
          .then((r) => r.json())
          .then((list) => {
            if (Array.isArray(list)) {
              setRelatedArticles(list.filter((item: Article) => item.id !== data.id).slice(0, 3));
            }
          })
          .catch(() => {});
      })
      .catch((err) => {
        console.error("Erro ao carregar artigo:", err);
        setArticle(null);
      })
      .finally(() => setLoading(false));

    return () => {
      // Clean up injected script when leaving page
      const scriptTag = document.getElementById("article-schema-jsonld");
      if (scriptTag) {
        scriptTag.remove();
      }
    };
  }, [slug]);

  // Social Share Handlers
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareTitle = article ? article.title : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    toast({
      title: "Link copiado!",
      description: "O link do artigo foi copiado para a sua área de transferência.",
    });
  };

  const handleShareWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareTitle} - ${currentUrl}`)}`, "_blank");
  };

  const handleShareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(currentUrl)}`, "_blank");
  };

  const handleShareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        <Navbar />
        <div className="pt-32 pb-20 max-w-4xl mx-auto px-4 w-full space-y-6 animate-pulse">
          <div className="h-6 w-32 bg-card rounded-md" />
          <div className="h-12 w-3/4 bg-card rounded-xl" />
          <div className="h-64 w-full bg-card rounded-2xl" />
          <div className="space-y-3">
            <div className="h-4 w-full bg-card rounded" />
            <div className="h-4 w-full bg-card rounded" />
            <div className="h-4 w-2/3 bg-card rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        <Navbar />
        <div className="pt-36 pb-20 max-w-xl mx-auto px-4 text-center space-y-4">
          <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Artigo não encontrado</h1>
          <p className="text-sm text-muted-foreground">O artigo que você procurou não está disponível ou foi movido.</p>
          <Link href="/artigos" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-black font-extrabold text-xs">
            <ArrowLeft className="w-4 h-4" /> Voltar para o Blog
          </Link>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(article.publishedAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary selection:text-black">
      {/* Top Scroll Reading Progress Bar */}
      <div
        className="fixed top-16 left-0 right-0 h-1 bg-gradient-to-r from-primary via-amber-400 to-yellow-500 z-50 transition-all duration-150"
        style={{ width: `${scrollProgress}%` }}
      />

      <Navbar />

      <main className="pt-24 pb-20 flex-1">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Breadcrumb & Navigation */}
          <div className="flex items-center justify-between">
            <Link
              href="/artigos"
              className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Voltar para Artigos
            </Link>

            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-primary/20 text-primary border border-primary/30">
              {article.category}
            </span>
          </div>

          {/* Article Header */}
          <header className="space-y-4">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight">
              {article.title}
            </h1>

            {article.excerpt && (
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-normal italic border-l-2 border-primary/50 pl-4 py-1">
                {article.excerpt}
              </p>
            )}

            {/* Author & Meta Info */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-b border-border/40 py-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 font-bold text-white">
                  <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <span>{article.authorName}</span>
                </div>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  {formattedDate}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  {article.readingTimeMinutes} min de leitura
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-primary" />
                <span>{article.views} visualizações</span>
              </div>
            </div>
          </header>

          {/* Cover Image */}
          {article.coverUrl && (
            <div className="relative rounded-3xl overflow-hidden border border-border/60 shadow-2xl bg-card">
              <img
                src={article.coverUrl}
                alt={article.title}
                className="w-full max-h-[480px] object-cover"
              />
            </div>
          )}

          {/* Article Body Content */}
          <div className="py-2">
            <div
              className="prose prose-invert prose-yellow max-w-none text-muted-foreground text-sm sm:text-base leading-relaxed space-y-6"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </div>

          {/* Call to Action Inside Article */}
          <div className="my-10 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-yellow-500/15 via-amber-500/10 to-card border border-yellow-500/30 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-[11px] font-extrabold uppercase">
                <Sparkles className="w-3.5 h-3.5" /> Portal do Artista
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white">
                Pronto para profissionalizar sua carreira musical?
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-lg">
                Crie seu catálogo próprio com vitrine de faixas, proteção por senha VIP, liberação de reprodutores e assessoria de carreira.
              </p>
            </div>
            <Link
              href="/planos"
              className="shrink-0 px-6 py-3 rounded-2xl bg-primary text-black font-extrabold text-xs sm:text-sm hover:bg-primary/90 transition-all shadow-xl hover:scale-105"
            >
              Conhecer os Planos →
            </Link>
          </div>

          {/* Social Share Box */}
          <div className="p-5 rounded-2xl bg-card border border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-primary" />
              Gostou deste conteúdo? Compartilhe com outros artistas:
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShareWhatsApp}
                className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors cursor-pointer"
                title="Compartilhar no WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
              <button
                onClick={handleShareTwitter}
                className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30 hover:bg-sky-500/25 transition-colors cursor-pointer"
                title="Compartilhar no X (Twitter)"
              >
                <Twitter className="w-4 h-4" />
              </button>
              <button
                onClick={handleShareLinkedIn}
                className="p-2.5 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition-colors cursor-pointer"
                title="Compartilhar no LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </button>
              <button
                onClick={handleCopyLink}
                className="p-2.5 rounded-xl bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors cursor-pointer"
                title="Copiar Link"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Related Articles Section */}
          {relatedArticles.length > 0 && (
            <section className="pt-10 border-t border-border/40 space-y-6">
              <h3 className="text-xl font-bold text-white tracking-tight">Artigos Relacionados</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedArticles.map((rel) => (
                  <Link key={rel.id} href={`/artigos/${rel.slug}`}>
                    <div className="group bg-card border border-border/60 hover:border-primary/40 rounded-2xl overflow-hidden shadow-lg transition-all cursor-pointer h-full flex flex-col justify-between">
                      <div>
                        <div className="h-36 overflow-hidden bg-muted relative">
                          <img
                            src={rel.coverUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop"}
                            alt={rel.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="p-4 space-y-2">
                          <span className="text-[10px] font-bold text-primary uppercase">{rel.category}</span>
                          <h4 className="font-bold text-sm text-white group-hover:text-primary transition-colors line-clamp-2">
                            {rel.title}
                          </h4>
                        </div>
                      </div>
                      <div className="p-4 pt-0 text-[11px] text-muted-foreground flex items-center justify-between">
                        <span>{rel.readingTimeMinutes} min de leitura</span>
                        <span className="text-primary font-bold">Ler →</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>
      </main>

      <footer className="border-t border-border/40 py-8 bg-card/40 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Portal do Artista. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-primary transition-colors">Início</Link>
            <Link href="/artigos" className="hover:text-primary transition-colors">Artigos</Link>
            <Link href="/artistas" className="hover:text-primary transition-colors">Artistas</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
