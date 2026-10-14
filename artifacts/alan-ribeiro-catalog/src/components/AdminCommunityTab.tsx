import { useEffect, useState } from "react";
import { Link } from "wouter";
import { MessageSquare, RefreshCw, Loader2 } from "lucide-react";
import { communityRequest } from "@/pages/Community";
import { useToast } from "@/hooks/use-toast";
export function AdminCommunityTab() {
  const [data, setData] = useState<{ reports: any[]; bans: any[] }>({
      reports: [],
      bans: [],
    }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const { toast } = useToast();
  const load = async () => {
    setLoading(true);
    try {
      setData(await communityRequest("/admin/community"));
      setError("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const action = async (path: string, method: string, body?: any) => {
    try {
      await communityRequest(path, {
        method,
        body: body ? JSON.stringify(body) : undefined,
      });
      await load();
      toast({ title: "Moderação atualizada" });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold flex gap-2 items-center">
            <MessageSquare className="text-primary" />
            Comunidade
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Revise denúncias e cuide das conversas entre os artistas.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/comunidade"
            className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-bold"
          >
            Abrir salas
          </Link>
          <button
            disabled={loading}
            onClick={load}
            className="p-2 border border-border rounded-xl"
            aria-label="Atualizar moderação"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-red-400">
          {error}
        </p>
      )}
      {loading ? (
        <Loader2 className="animate-spin text-primary" />
      ) : (
        <>
          <section className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-bold mb-4">
              Denúncias pendentes ({data.reports.length})
            </h3>
            {!data.reports.length ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma denúncia pendente.
              </p>
            ) : (
              <div className="space-y-4">
                {data.reports.map((r) => (
                  <article
                    key={r.id}
                    className="border border-border rounded-xl p-4"
                  >
                    <div className="text-sm font-semibold">
                      {r.name}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        ·{" "}
                        {r.room === "parcerias"
                          ? "Parcerias de Composição"
                          : "Encontro dos Artistas"}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm my-3 p-3 bg-background rounded-lg">
                      {r.body}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Denunciado por {r.reporterName}: {r.reason}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <button
                        onClick={() =>
                          action(
                            `/admin/community/reports/${r.id}/review`,
                            "POST",
                          )
                        }
                        className="text-xs border border-border rounded-lg p-2"
                      >
                        Encerrar denúncia
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Remover esta mensagem da sala?"))
                            action(
                              `/admin/community/messages/${r.messageId}`,
                              "DELETE",
                            );
                        }}
                        className="text-xs border border-red-500/30 text-red-400 rounded-lg p-2"
                      >
                        Remover mensagem
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt(
                            "Motivo da suspensão da comunidade:",
                          );
                          if (reason)
                            action(
                              `/admin/community/bans/${r.artistId}`,
                              "POST",
                              { reason },
                            );
                        }}
                        className="text-xs border border-primary/30 text-primary rounded-lg p-2"
                      >
                        Suspender participante
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          <section className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-bold mb-4">
              Participantes suspensos ({data.bans.length})
            </h3>
            {!data.bans.length ? (
              <p className="text-sm text-muted-foreground">
                Nenhum participante suspenso.
              </p>
            ) : (
              data.bans.map((b) => (
                <div
                  key={b.id}
                  className="flex justify-between items-center gap-3 py-3 border-b border-border"
                >
                  <div>
                    <p className="text-sm font-semibold">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.reason}</p>
                  </div>
                  <button
                    onClick={() =>
                      action(`/admin/community/bans/${b.id}`, "DELETE")
                    }
                    className="text-primary text-xs"
                  >
                    Remover suspensão
                  </button>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
