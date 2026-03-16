import { useState, useRef } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { 
  useLogin, 
  useLogout, 
  useGetAuthStatus, 
  useListSongs, 
  useCreateSong, 
  useDeleteSong,
  getListSongsQueryKey,
  getGetAuthStatusQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Music, Plus, Trash2, ShieldAlert, Upload, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const { data: authStatus, isLoading: isAuthLoading } = useGetAuthStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (isAuthLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-primary">Carregando...</div>;
  }

  if (!authStatus?.logado) {
    return <LoginForm />;
  }

  return <AdminDashboard />;
}

function LoginForm() {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const { mutate: login, isPending } = useLogin();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(
      { data: { usuario, senha } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAuthStatusQueryKey() });
          toast({ title: "Login realizado com sucesso!", variant: "default" });
        },
        onError: () => {
          toast({ 
            title: "Erro no login", 
            description: "Credenciais inválidas. Use admin / 1234", 
            variant: "destructive" 
          });
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-4 left-4">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
          <Music className="w-5 h-5" />
          Voltar ao Catálogo
        </Link>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 bg-card rounded-3xl border border-border shadow-2xl"
      >
        <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-display font-bold text-center text-foreground mb-2">Painel Admin</h1>
        <p className="text-center text-muted-foreground mb-8">Acesso restrito à equipe.</p>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Usuário</label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full px-4 py-3 bg-input border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground transition-all"
              placeholder="Ex: admin"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-4 py-3 bg-input border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(245,197,24,0.3)] disabled:opacity-50"
          >
            {isPending ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function AdminDashboard() {
  const { data: songs, isLoading } = useListSongs();
  const { mutate: logout } = useLogout();
  const { mutate: deleteSong } = useDeleteSong();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAuthStatusQueryKey() });
        toast({ title: "Sessão encerrada" });
      }
    });
  };

  const handleDelete = (id: number, titulo: string) => {
    if (window.confirm(`Tem certeza que deseja excluir "${titulo}"?`)) {
      deleteSong({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });
          toast({ title: "Música excluída com sucesso" });
        },
        onError: () => {
          toast({ title: "Erro ao excluir música", variant: "destructive" });
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Admin Nav */}
      <nav className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-primary hover:text-primary/80 font-medium flex items-center gap-2">
              <Music className="w-4 h-4" />
              Ver Site
            </Link>
            <span className="text-border">|</span>
            <span className="font-display font-bold text-foreground">Painel Administrativo</span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-muted-foreground hover:text-destructive transition-colors text-sm font-medium"
          >
            Sair <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Column */}
        <div className="lg:col-span-1">
          <AddSongForm />
        </div>

        {/* List Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-bold text-foreground">Músicas Cadastradas</h2>
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold">
              {songs?.length || 0} faixas
            </span>
          </div>

          {isLoading ? (
            <div className="text-primary animate-pulse">Carregando lista...</div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
              {songs?.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground">Nenhuma música cadastrada ainda.</div>
              ) : (
                <div className="divide-y divide-border/50">
                  {songs?.map((song) => (
                    <div key={song.id} className="p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                      <img 
                        src={song.capaUrl || `${import.meta.env.BASE_URL}images/default-cover.png`} 
                        alt="Capa" 
                        className="w-12 h-12 rounded bg-black/50 object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-foreground font-semibold truncate">{song.titulo}</h4>
                        <p className="text-xs text-muted-foreground">{song.genero}</p>
                      </div>
                      <button
                        onClick={() => handleDelete(song.id, song.titulo)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AddSongForm() {
  const { mutate: createSong, isPending } = useCreateSong();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const [capaFile, setCapaFile] = useState<File | null>(null);
  const [mp3File, setMp3File] = useState<File | null>(null);
  const [isVip, setIsVip] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      titulo: formData.get("titulo") as string,
      descricao: formData.get("descricao") as string,
      genero: formData.get("genero") as string,
      subgenero: (formData.get("subgenero") as string) || undefined,
      compositor: (formData.get("compositor") as string) || undefined,
      status: (formData.get("status") as string) || "Disponível",
      precoX: (formData.get("precoX") as string) || undefined,
      precoY: (formData.get("precoY") as string) || undefined,
      isVip: isVip ? "true" : "false",
      capa: capaFile || undefined,
      mp3: mp3File || undefined,
    };

    createSong({ data }, {
      onSuccess: () => {
        toast({ title: "Sucesso", description: "Música adicionada ao catálogo!", variant: "default" });
        formRef.current?.reset();
        setCapaFile(null);
        setMp3File(null);
        setIsVip(false);
        queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });
      },
      onError: (err) => {
        toast({ title: "Erro", description: err.message || "Erro ao adicionar", variant: "destructive" });
      }
    });
  };

  return (
    <div className="bg-card border border-border rounded-3xl p-6 shadow-xl sticky top-24">
      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border/50">
        <div className="bg-primary/20 p-2 rounded-lg">
          <Plus className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-xl font-display font-bold text-foreground">Nova Música</h3>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Título da Música</label>
          <input
            name="titulo"
            required
            className="w-full px-4 py-2.5 bg-input border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-foreground text-sm"
            placeholder="Ex: Na Hora"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Gênero</label>
          <select
            name="genero"
            required
            className="w-full px-4 py-2.5 bg-input border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-foreground text-sm appearance-none"
          >
            <option value="Sertanejo">Sertanejo</option>
            <option value="Piseiro">Piseiro</option>
            <option value="Pop">Pop</option>
            <option value="Rock">Rock</option>
            <option value="MPB">MPB</option>
            <option value="Acústico">Acústico</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Subgênero <span className="text-muted-foreground font-normal">(opcional)</span></label>
          <input
            name="subgenero"
            className="w-full px-4 py-2.5 bg-input border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-foreground text-sm"
            placeholder="Ex: Romântico, Vaneira, Dançante"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Compositor <span className="text-muted-foreground font-normal">(opcional)</span></label>
          <input
            name="compositor"
            className="w-full px-4 py-2.5 bg-input border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-foreground text-sm"
            placeholder="Ex: Alan Ribeiro"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Status</label>
          <select
            name="status"
            className="w-full px-4 py-2.5 bg-input border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-foreground text-sm appearance-none"
          >
            <option value="Disponível">Disponível</option>
            <option value="Reservado">Reservado</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Valor X · Livre</label>
            <input
              name="precoX"
              type="number"
              step="0.01"
              min="0"
              className="w-full px-4 py-2.5 bg-input border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-foreground text-sm"
              placeholder="R$ 0,00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Valor Y · Exclusivo</label>
            <input
              name="precoY"
              type="number"
              step="0.01"
              min="0"
              className="w-full px-4 py-2.5 bg-input border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-foreground text-sm"
              placeholder="R$ 0,00"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Descrição</label>
          <textarea
            name="descricao"
            required
            rows={3}
            className="w-full px-4 py-2.5 bg-input border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-foreground text-sm resize-none"
            placeholder="Uma breve história sobre a música..."
          />
        </div>

        {/* VIP Toggle */}
        <div
          onClick={() => setIsVip(!isVip)}
          className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer select-none transition-colors ${
            isVip
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-input text-muted-foreground hover:border-primary/40"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Composição VIP (inédita)</span>
          </div>
          <div
            className={`w-10 h-5 rounded-full transition-colors relative ${
              isVip ? "bg-primary" : "bg-border"
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                isVip ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </div>
        </div>

        <div className="space-y-4 pt-2">
          {/* File Uploads styled beautifully */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Capa da Música (Imagem)</label>
            <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${capaFile ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-input/50'}`}>
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {capaFile ? <CheckCircle2 className="w-6 h-6 text-primary mb-1" /> : <ImageIcon className="w-6 h-6 text-muted-foreground mb-1" />}
                <p className="text-xs text-muted-foreground">
                  {capaFile ? capaFile.name : "Clique para enviar imagem"}
                </p>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setCapaFile(e.target.files?.[0] || null)} />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Arquivo de Áudio (MP3)</label>
            <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${mp3File ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-input/50'}`}>
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {mp3File ? <CheckCircle2 className="w-6 h-6 text-primary mb-1" /> : <Upload className="w-6 h-6 text-muted-foreground mb-1" />}
                <p className="text-xs text-muted-foreground">
                  {mp3File ? mp3File.name : "Clique para enviar áudio"}
                </p>
              </div>
              <input type="file" accept="audio/*" className="hidden" onChange={(e) => setMp3File(e.target.files?.[0] || null)} required />
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3.5 mt-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all shadow-[0_4px_20px_rgba(245,197,24,0.25)] disabled:opacity-50"
        >
          {isPending ? "Adicionando..." : "Salvar Música"}
        </button>
      </form>
    </div>
  );
}
