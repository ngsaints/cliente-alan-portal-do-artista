import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Search, BookOpen, Clock, Tag, Eye, ChevronRight, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

interface Article {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string;
  category: string;
  views: number;
  authorName: string;
  readingTimeMinutes: number;
  publishedAt: string;
  isFeatured: boolean;
}

const CATEGORIES = ["Todos", "Direitos Autorais", "Marca & Registro", "Marketing Musical", "Carreira", "Mercado"];

export default function Articles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [featuredArticle, setFeaturedArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  useEffect(() => {
    // Dynamic page title for SEO
    document.title = "Artigos & Dicas para Carreira Musical | Portal do Artista";

    fetchFeatured();
    fetchArticles();
  }, [selectedCategory]);

  const fetchFeatured = async () => {
    try {
      const res = await fetch("/api/articles/featured");
      if (res.ok) {
        const data = await res.json();
        setFeaturedArticle(data);
      }
    } catch (err) {
      console.error("Erro ao buscar artigo em destaque:", err);
    }
  };

  const fetchArticles = async () => {
    setLoading(true);
    try {
      let url = "/api/articles";
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== "Todos") {
        params.append("category", selectedCategory);
      }
      if (search.trim()) {
        params.append("search", search.trim());
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setArticles(data);
      }
    } catch (err) {
      console.error("Erro ao buscar artigos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchArticles();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary selection:text-black">
      <Navbar />

      {/* Hero Header */}
      <div className="relative pt-24 pb-12 bg-gradient-to-b from-card/80 via-background to-background border-b border-border/40 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-extrabold uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" />
              Blog & Conhecimento Musical
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Dicas, Legislação e <span className="text-primary">Estratégia Musical</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Conteúdos práticos e otimizados sobre proteção de nome artístico, direitos autorais, distribuição e alavancagem de carreira para músicos independentes.
            </p>

            {/* Barra de Busca */}
            <form onSubmit={handleSearchSubmit} className="pt-2 max-w-xl mx-auto relative flex items-center">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar artigos por título, palavra-chave ou tema..."
                className="w-full pl-11 pr-28 py-3.5 rounded-2xl bg-card/90 border border-border/60 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 shadow-xl transition-all"
              />
              <Search className="w-5 h-5 text-muted-foreground absolute left-4 pointer-events-none" />
              <button
                type="submit"
                className="absolute right-2 px-4 py-2 rounded-xl bg-primary text-black font-extrabold text-xs hover:bg-primary/90 transition-colors shadow-md cursor-pointer"
              >
                Buscar
              </button>
            </form>
          </div>

          {/* Filtros de Categoria */}
          <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-primary text-black shadow-[0_0_15px_rgba(245,197,24,0.3)] scale-[1.02]"
                    : "bg-card/70 text-muted-foreground border border-border/50 hover:text-white hover:border-primary/40"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-12">
        {/* Artigo em Destaque (Se houver e se estiver no filtro "Todos" e sem busca) */}
        {featuredArticle && selectedCategory === "Todos" && !search && (
          <section className="relative">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-primary mb-3 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              Artigo em Destaque
            </h2>
            <Link href={`/artigos/${featuredArticle.slug}`}>
              <div className="group relative rounded-3xl overflow-hidden border border-border/60 bg-gradient-to-r from-card via-card/90 to-background shadow-2xl hover:border-primary/50 transition-all cursor-pointer grid grid-cols-1 lg:grid-cols-12 gap-0">
                <div className="lg:col-span-7 relative min-h-[260px] sm:min-h-[340px] overflow-hidden">
                  <img
                    src={featuredArticle.coverUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1200&auto=format&fit=crop"}
                    alt={featuredArticle.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent lg:hidden" />
                </div>
                <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-primary/20 text-primary border border-primary/30">
                        {featuredArticle.category}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {featuredArticle.readingTimeMinutes} min de leitura
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-extrabold text-white group-hover:text-primary transition-colors leading-snug">
                      {featuredArticle.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                      {featuredArticle.excerpt}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border/40 text-xs">
                    <span className="text-muted-foreground font-medium">{featuredArticle.authorName}</span>
                    <span className="text-primary font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Ler Artigo Completo <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Lista de Artigos */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {selectedCategory === "Todos" ? "Todos os Artigos" : `Artigos sobre ${selectedCategory}`}
            </h2>
            <span className="text-xs text-muted-foreground">
              {articles.length} artigo{articles.length !== 1 ? "s" : ""} encontrado{articles.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-80 rounded-2xl bg-card/60 animate-pulse border border-border/40" />
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-16 bg-card/40 rounded-3xl border border-border/40 space-y-3">
              <BookOpen className="w-12 h-12 text-muted-foreground/40 mx-auto" />
              <h3 className="text-base font-bold text-white">Nenhum artigo encontrado</h3>
              <p className="text-xs text-muted-foreground">Tente buscar por outro termo ou selecione outra categoria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <Link key={article.id} href={`/artigos/${article.slug}`}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    className="group flex flex-col h-full bg-card/80 border border-border/60 hover:border-primary/40 rounded-2xl overflow-hidden shadow-lg transition-all cursor-pointer"
                  >
                    <div className="relative h-48 overflow-hidden bg-muted">
                      <img
                        src={article.coverUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop"}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-black/80 text-primary border border-primary/30 backdrop-blur-md">
                        {article.category}
                      </span>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-primary" />
                            {article.readingTimeMinutes} min
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-primary" />
                            {article.views} viz
                          </span>
                        </div>

                        <h3 className="font-bold text-base text-white group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                          {article.title}
                        </h3>

                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {article.excerpt}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="truncate font-medium">{article.authorName}</span>
                        <span className="text-primary font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          Ler <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer CTA */}
      <footer className="border-t border-border/40 py-8 bg-card/40 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Portal do Artista. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-primary transition-colors">Início</Link>
            <Link href="/explorar" className="hover:text-primary transition-colors">Músicas</Link>
            <Link href="/artistas" className="hover:text-primary transition-colors">Artistas</Link>
            <Link href="/planos" className="hover:text-primary transition-colors">Assine Já</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
