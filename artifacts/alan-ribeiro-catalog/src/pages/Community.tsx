import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import {
  MessageSquare,
  Users,
  Send,
  Reply,
  Flag,
  Ban,
  X,
  Loader2,
  Music,
  ExternalLink,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatImageUrl } from "@/lib/utils";
interface Room {
  id: string;
  name: string;
  description: string;
  prompt: string;
  online: number;
}
interface Person {
  id: number;
  name: string;
  slug?: string;
  photo?: string;
}
interface Message {
  id: string;
  artistId: number;
  name: string;
  slug?: string;
  photo?: string;
  body: string;
  createdAt: number;
  removedAt?: number;
  replyTo?: string;
  replyName?: string;
  replyBody?: string;
}
export async function communityRequest(
  path: string,
  options: RequestInit = {},
) {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(
      data.error || "Não foi possível concluir a ação.",
    ) as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}
function MessageBody({ body }: { body: string }) {
  return (
    <>
      {body.split(/(https?:\/\/[^\s<>]+)/g).map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline break-all"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
export default function Community() {
  const [rooms, setRooms] = useState<Room[]>([]),
    [room, setRoom] = useState("encontro"),
    [messages, setMessages] = useState<Message[]>([]),
    [people, setPeople] = useState<Person[]>([]),
    [artistId, setArtistId] = useState<number | null>(null),
    [isAdmin, setIsAdmin] = useState(false),
    [loggedIn, setLoggedIn] = useState(false),
    [checking, setChecking] = useState(true),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [body, setBody] = useState(""),
    [sending, setSending] = useState(false),
    [reply, setReply] = useState<Message | null>(null),
    [showPeople, setShowPeople] = useState(false),
    [banned, setBanned] = useState(""),
    [blocks, setBlocks] = useState<Person[]>([]);
  const { toast } = useToast();
  const list = useRef<HTMLDivElement>(null),
    nearBottom = useRef(true),
    draft = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    let active = true;
    communityRequest("/community/rooms")
      .then((data) => {
        if (!active) return;
        setRooms(data.rooms);
        setArtistId(data.artistId);
        setIsAdmin(data.isAdmin);
        setBanned(data.banned || "");
        setLoggedIn(true);
      })
      .catch((err) => {
        if (active && err.status !== 401) setError(err.message);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const refreshBlocks = useCallback(
    () =>
      communityRequest("/community/blocks")
        .then(setBlocks)
        .catch(() => {}),
    [],
  );
  useEffect(() => {
    if (loggedIn) refreshBlocks();
  }, [loggedIn, refreshBlocks]);
  useEffect(() => {
    if (!loggedIn) return;
    let active = true,
      busy = false;
    setMessages([]);
    setPeople([]);
    setReply(null);
    setBody("");
    setLoading(true);
    nearBottom.current = true;
    const refresh = async () => {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const data = await communityRequest(
          `/community/rooms/${room}/messages`,
        );
        if (active) {
          setMessages(data.messages);
          setPeople(data.people);
          setError("");
        }
      } catch (err) {
        if (active)
          setError(err instanceof Error ? err.message : "Falha na conexão.");
      } finally {
        busy = false;
        if (active) setLoading(false);
      }
    };
    const presence = () => {
      if (!document.hidden)
        communityRequest(`/community/rooms/${room}/presence`, {
          method: "POST",
          body: "{}",
        })
          .then(refresh)
          .catch(() => {});
    };
    presence();
    refresh();
    const stream = new EventSource(`/api/community/events?room=${room}`);
    stream.onmessage = refresh;
    const fallback = setInterval(refresh, 15000),
      heartbeat = setInterval(presence, 30000);
    document.addEventListener("visibilitychange", presence);
    return () => {
      active = false;
      stream.close();
      clearInterval(fallback);
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", presence);
    };
  }, [loggedIn, room]);
  useEffect(() => {
    if (nearBottom.current && list.current)
      list.current.scrollTop = list.current.scrollHeight;
  }, [messages]);
  const reload = async () => {
    try {
      const data = await communityRequest(`/community/rooms/${room}/messages`);
      setMessages(data.messages);
      setPeople(data.people);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na conexão.");
    }
  };
  const send = async () => {
    if (sending || !body.trim()) return;
    setSending(true);
    try {
      await communityRequest(`/community/rooms/${room}/messages`, {
        method: "POST",
        body: JSON.stringify({ body, replyTo: reply?.id }),
      });
      setBody("");
      setReply(null);
      nearBottom.current = true;
      await reload();
      draft.current?.focus();
    } catch (err) {
      toast({
        title: "Mensagem não enviada",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };
  const report = async (message: Message) => {
    const reason = window.prompt(
      "Por que você está denunciando esta mensagem? (3 a 500 caracteres)",
    );
    if (!reason) return;
    try {
      await communityRequest(`/community/messages/${message.id}/report`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      toast({ title: "Denúncia enviada à moderação" });
    } catch (err) {
      toast({
        title: "Não foi possível denunciar",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };
  const removeMessage = async (id: string) => {
    if (!confirm("Remover esta mensagem da sala?")) return;
    try {
      await communityRequest(`/admin/community/messages/${id}`, {
        method: "DELETE",
      });
      await reload();
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    }
  };
  const block = async (id: number) => {
    if (!confirm("Ocultar as mensagens deste participante para você?")) return;
    try {
      await communityRequest(`/community/blocks/${id}`, {
        method: "POST",
        body: "{}",
      });
      await refreshBlocks();
      await reload();
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    }
  };
  const unblock = async (id: number) => {
    try {
      await communityRequest(`/community/blocks/${id}`, { method: "DELETE" });
      await refreshBlocks();
      await reload();
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    }
  };
  const selected = rooms.find((r) => r.id === room);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 pt-24 pb-8">
        <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
          <div>
            <p className="text-primary text-xs tracking-[0.2em] uppercase font-bold mb-2">
              Conexões que viram música
            </p>
            <h1 className="text-2xl sm:text-3xl font-display font-bold flex items-center gap-3">
              <MessageSquare className="text-primary" />
              Comunidade do Portal
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              Encontre artistas, troque ideias e crie novas parcerias.
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/admin"
              className="text-xs border border-border rounded-xl px-4 py-2 flex gap-2"
            >
              <Shield className="w-4 h-4" />
              Painel de moderação
            </Link>
          )}
        </div>
        {checking ? (
          <div className="p-16 flex justify-center">
            <Loader2 className="animate-spin text-primary" />
          </div>
        ) : !loggedIn ? (
          <div className="rounded-2xl border border-primary/20 bg-card p-8 text-center max-w-xl mx-auto">
            <Users className="text-primary w-12 h-12 mx-auto mb-4" />
            <h2 className="text-xl font-bold">
              Sua próxima parceria pode começar aqui
            </h2>
            <p className="text-sm text-muted-foreground my-4">
              Entre na sua conta de artista para conversar nas salas, conhecer
              quem está online e compartilhar suas músicas.
            </p>
            {error && (
              <p role="alert" className="text-red-400 text-sm mb-4">
                {error}
              </p>
            )}
            <Link
              href="/artista/login"
              className="inline-block bg-primary text-primary-foreground rounded-xl px-6 py-3 font-bold"
            >
              Entrar na comunidade
            </Link>
            <p className="text-xs mt-4 text-muted-foreground">
              Ainda não tem conta?{" "}
              <Link href="/cadastro" className="text-primary underline">
                Cadastre-se no Portal
              </Link>
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_220px] gap-4">
              <aside className="bg-card border border-border rounded-2xl p-4 min-w-0">
                <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-3">
                  Escolha sua sala
                </h2>
                <div className="flex lg:flex-col gap-2 overflow-x-auto">
                  {rooms.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setRoom(r.id)}
                      aria-pressed={room === r.id}
                      className={`text-left p-3 rounded-xl min-w-[190px] lg:min-w-0 border transition-colors ${room === r.id ? "bg-primary/10 border-primary/40" : "border-border hover:border-primary/30"}`}
                    >
                      <span
                        className={`font-bold text-sm ${room === r.id ? "text-primary" : ""}`}
                      >
                        {r.name}
                      </span>
                      <span className="block text-xs text-muted-foreground mt-2">
                        {r.description}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                  Respeite os participantes. Sem spam, ofensas ou divulgação
                  repetitiva. Compartilhe apenas trabalhos que você pode
                  divulgar.
                </p>
                {blocks.length > 0 && (
                  <details className="mt-4 text-xs">
                    <summary className="cursor-pointer text-muted-foreground">
                      Participantes bloqueados ({blocks.length})
                    </summary>
                    {blocks.map((p) => (
                      <div
                        key={p.id}
                        className="flex justify-between gap-2 py-2"
                      >
                        <span>{p.name}</span>
                        <button
                          className="text-primary"
                          onClick={() => unblock(p.id)}
                        >
                          Desbloquear
                        </button>
                      </div>
                    ))}
                  </details>
                )}
              </aside>
              <section className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col min-w-0">
                <header className="p-4 border-b border-border flex justify-between items-center gap-2">
                  <div>
                    <h2 className="font-bold">{selected?.name}</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Mensagens ao vivo · histórico recente
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPeople(!showPeople)}
                    className="lg:hidden text-primary text-xs flex gap-1 items-center"
                  >
                    <Users className="w-4 h-4" />
                    {people.length} online
                  </button>
                </header>
                <p className="mx-4 mt-4 p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs leading-relaxed text-primary">
                  {selected?.prompt}
                </p>
                {error && (
                  <p role="alert" className="px-4 py-2 text-xs text-red-400">
                    {error}{" "}
                    <button onClick={reload} className="underline">
                      Tentar novamente
                    </button>
                  </p>
                )}
                <div
                  ref={list}
                  onScroll={() => {
                    const el = list.current;
                    if (el)
                      nearBottom.current =
                        el.scrollHeight - el.scrollTop - el.clientHeight < 100;
                  }}
                  className="h-[48vh] min-h-[300px] lg:h-[440px] overflow-y-auto px-4 py-4 space-y-4"
                  role="log"
                  aria-label="Mensagens da sala"
                  aria-live="polite"
                  aria-relevant="additions text"
                >
                  {loading ? (
                    <p className="text-muted-foreground text-sm flex gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando conversa…
                    </p>
                  ) : !messages.length ? (
                    <div className="text-center text-muted-foreground py-12">
                      <Music className="w-10 h-10 mx-auto text-primary mb-3" />
                      <p className="font-semibold">
                        Seja o primeiro a puxar conversa
                      </p>
                      <p className="text-xs mt-2">
                        Apresente-se e conte o que está criando.
                      </p>
                    </div>
                  ) : (
                    messages.map((m) => (
                      <article
                        key={m.id}
                        className={`rounded-xl p-3 border ${m.artistId === artistId ? "bg-primary/5 border-primary/20" : "bg-background/40 border-border"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Link
                            href={
                              m.slug ? `/${m.slug}` : `/artista/${m.artistId}`
                            }
                            className="font-semibold text-sm hover:text-primary flex gap-2 items-center"
                          >
                            {m.photo ? (
                              <img
                                src={formatImageUrl(m.photo)}
                                alt=""
                                className="w-7 h-7 rounded-full object-cover"
                              />
                            ) : (
                              <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center">
                                {m.name.slice(0, 1)}
                              </span>
                            )}
                            {m.name}
                            {m.artistId === artistId && (
                              <span className="text-[10px] text-primary">
                                Você
                              </span>
                            )}
                          </Link>
                          <time className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(Number(m.createdAt)).toLocaleString(
                              "pt-BR",
                              {
                                timeZone: "America/Sao_Paulo",
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </time>
                        </div>
                        {m.replyTo && (
                          <div className="mt-2 border-l-2 border-primary/40 pl-3 text-xs text-muted-foreground">
                            <strong>{m.replyName}</strong>
                            <p className="line-clamp-2">
                              {m.replyBody?.slice(0, 180) ||
                                "Mensagem indisponível"}
                            </p>
                          </div>
                        )}
                        <p
                          className={`mt-2 text-sm whitespace-pre-wrap break-words ${m.removedAt ? "text-muted-foreground italic" : ""}`}
                        >
                          {m.removedAt ? (
                            "Mensagem removida pela moderação."
                          ) : (
                            <MessageBody body={m.body} />
                          )}
                        </p>
                        {!m.removedAt && (
                          <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-muted-foreground">
                            <button
                              className="flex items-center gap-1 hover:text-primary"
                              onClick={() => {
                                setReply(m);
                                draft.current?.focus();
                              }}
                            >
                              <Reply className="w-3 h-3" />
                              Responder
                            </button>
                            {isAdmin && (
                              <button
                                className="text-red-400 hover:underline"
                                onClick={() => removeMessage(m.id)}
                              >
                                Remover mensagem
                              </button>
                            )}
                            {m.artistId !== artistId && (
                              <>
                                <button
                                  className="flex gap-1 items-center hover:text-red-400"
                                  onClick={() => report(m)}
                                >
                                  <Flag className="w-3 h-3" />
                                  Denunciar
                                </button>
                                <button
                                  className="flex gap-1 items-center hover:text-primary"
                                  onClick={() => block(m.artistId)}
                                >
                                  <Ban className="w-3 h-3" />
                                  Bloquear
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </article>
                    ))
                  )}
                </div>
                <form
                  className="p-4 border-t border-border"
                  onSubmit={(e) => {
                    e.preventDefault();
                    send();
                  }}
                >
                  {reply && (
                    <div className="flex justify-between gap-2 mb-2 text-xs bg-primary/10 rounded-lg p-2">
                      <span className="truncate">
                        Respondendo a {reply.name}: {reply.body.slice(0, 100)}
                      </span>
                      <button
                        type="button"
                        aria-label="Cancelar resposta"
                        onClick={() => setReply(null)}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {banned ? (
                    <p className="text-red-400 text-sm">
                      Sua participação foi suspensa. Motivo: {banned}
                    </p>
                  ) : (
                    <>
                      <div className="flex items-end gap-2">
                        <textarea
                          ref={draft}
                          aria-label="Sua mensagem"
                          value={body}
                          maxLength={2000}
                          disabled={sending}
                          onChange={(e) => setBody(e.target.value)}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              !e.shiftKey &&
                              !e.nativeEvent.isComposing
                            ) {
                              e.preventDefault();
                              send();
                            }
                          }}
                          placeholder={
                            room === "parcerias"
                              ? "Faço letras de MPB e procuro alguém para criar melodias…"
                              : "Apresente-se e entre na conversa…"
                          }
                          rows={2}
                          className="w-full bg-input border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                        />
                        <button
                          aria-label="Enviar mensagem"
                          type="submit"
                          disabled={sending || !body.trim()}
                          className="p-3 bg-primary text-primary-foreground rounded-xl disabled:opacity-40"
                        >
                          {sending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Send className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2 flex justify-between">
                        <span>
                          Enter para enviar · Shift + Enter para nova linha
                        </span>
                        <span>{body.length}/2.000</span>
                      </p>
                    </>
                  )}
                </form>
              </section>
              <aside
                className={`${showPeople ? "block" : "hidden"} lg:block bg-card border border-border rounded-2xl p-4`}
              >
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                  {people.length} na sala
                </h2>
                <p className="text-xs text-muted-foreground mt-2 mb-4">
                  Clique no nome para conhecer o artista.
                </p>
                <div className="space-y-3">
                  {people.map((p) => (
                    <Link
                      key={p.id}
                      href={p.slug ? `/${p.slug}` : `/artista/${p.id}`}
                      className="flex items-center gap-2 text-sm hover:text-primary"
                    >
                      <span className="w-7 h-7 shrink-0 rounded-full bg-primary/10 text-primary flex justify-center items-center text-xs">
                        {p.name.slice(0, 1)}
                      </span>
                      <span className="truncate">{p.name}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </aside>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Converse com respeito e combine autorias e permissões antes de
              compartilhar uma composição. A sala mostra as últimas 100
              mensagens.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
