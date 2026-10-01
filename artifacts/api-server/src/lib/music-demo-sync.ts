import { and, desc, eq, gte, sql } from "drizzle-orm";
import { aiMusicDemosTable, artistsTable, db } from "@workspace/db";
import { downloadAndSaveGeneratedAudio } from "./replicate-music.js";
import { getMusicPredictionStatus } from "./music-gateway.js";

type MusicDemo = typeof aiMusicDemosTable.$inferSelect;

/**
 * Estado final de um hit gerado por IA.
 *
 * Webhook do kie.ai, polling do Estúdio e a varredura do servidor passam por
 * aqui para a cota ser devolvida e o áudio ser salvo exatamente uma vez —
 * independente de qual caminho chegar primeiro.
 */

// Devolve 1 cota de música quando a geração falha — o artista pagou por um hit que não recebeu.
// Só estorna se a demo foi criada no mesmo ciclo mensal da cota (evita mexer na cota do mês seguinte).
export async function refundMusicCredit(artistId: number, demoCreatedAt: Date): Promise<void> {
  try {
    const now = new Date();
    const created = new Date(demoCreatedAt);
    if (created.getMonth() !== now.getMonth() || created.getFullYear() !== now.getFullYear()) return;

    await db
      .update(artistsTable)
      .set({ aiMusicQueriesCount: sql`GREATEST(${artistsTable.aiMusicQueriesCount} - 1, 0)` })
      .where(eq(artistsTable.id, artistId));
    console.log(`[AI Music] Cota devolvida ao artista ${artistId} após falha da geração.`);
  } catch (err) {
    console.warn(`[AI Music] Falha ao devolver cota do artista ${artistId}:`, err);
  }
}

/** Baixa (quando preciso) e marca a demo como concluída. Idempotente: uma segunda chamada não rebaixa o arquivo. */
export async function saveDemoSuccess(
  demo: MusicDemo,
  remoteUrl: string,
  opts: { alreadySaved?: boolean; duration?: number | null } = {}
): Promise<MusicDemo> {
  const alreadyCompleted = demo.status === "completed" && !!demo.audioUrl;
  const finalAudioUrl = alreadyCompleted
    ? demo.audioUrl!
    : opts.alreadySaved
      ? remoteUrl
      : await downloadAndSaveGeneratedAudio(remoteUrl, demo.titulo);

  const [updated] = await db
    .update(aiMusicDemosTable)
    .set({
      status: "completed",
      audioUrl: finalAudioUrl,
      error: null,
      ...(opts.duration ? { duracao: String(opts.duration) } : {}),
    })
    .where(eq(aiMusicDemosTable.id, demo.id))
    .returning();

  return updated ?? { ...demo, status: "completed", audioUrl: finalAudioUrl, error: null };
}

/** Marca a demo como falha e devolve a cota ao artista (sem reembolsar duas vezes). */
export async function saveDemoFailure(demo: MusicDemo, message: string): Promise<MusicDemo> {
  if (demo.status === "failed") return demo;

  const [updated] = await db
    .update(aiMusicDemosTable)
    .set({ status: "failed", error: (message || "A geração falhou.").slice(0, 500) })
    .where(eq(aiMusicDemosTable.id, demo.id))
    .returning();

  await refundMusicCredit(demo.artistaId, demo.createdAt);
  return updated ?? { ...demo, status: "failed", error: message };
}

/**
 * Varredura de segurança do kie.ai (nosso provedor principal).
 *
 * O callback do kie.ai só chega se a assinatura HMAC estiver habilitada no
 * painel deles, e o polling só acontece com o Estúdio aberto. Sem isto, um hit
 * cujo artista fechou a aba ficaria "processing" para sempre com a cota dele
 * consumida. Consulta no máximo `limit` hits por rodada (janela de 12h).
 */
export async function syncPendingMusicDemos(limit = 10): Promise<number> {
  const rows = await db
    .select()
    .from(aiMusicDemosTable)
    .where(
      and(
        eq(aiMusicDemosTable.status, "processing"),
        sql`${aiMusicDemosTable.predictionId} LIKE ${"kie:%"}`,
        gte(aiMusicDemosTable.createdAt, new Date(Date.now() - 12 * 60 * 60 * 1000))
      )
    )
    .orderBy(desc(aiMusicDemosTable.id))
    .limit(limit);

  let finalized = 0;
  for (const demo of rows) {
    if (!demo.predictionId) continue;
    try {
      const statusResult = await getMusicPredictionStatus(demo.predictionId);

      if (statusResult.status === "succeeded") {
        const remoteUrl = Array.isArray(statusResult.output) ? statusResult.output[0] : statusResult.output;
        if (typeof remoteUrl === "string" && remoteUrl) {
          await saveDemoSuccess(demo, remoteUrl, { alreadySaved: statusResult.alreadySaved ?? false });
          finalized++;
          console.log(`[kie.ai] Varredura concluiu o hit #${demo.id} ("${demo.titulo}") sem callback.`);
        } else {
          await saveDemoFailure(demo, "O provedor concluiu a geração mas não devolveu o áudio. Tente gerar de novo.");
          finalized++;
          console.warn(`[kie.ai] Varredura: hit #${demo.id} concluído sem áudio — cota devolvida.`);
        }
      } else if (statusResult.status === "failed" || statusResult.status === "canceled") {
        await saveDemoFailure(
          demo,
          statusResult.error || "A geração da música foi cancelada ou falhou."
        );
        finalized++;
        console.log(`[kie.ai] Varredura registrou falha do hit #${demo.id} e devolveu a cota.`);
      }
    } catch (err: any) {
      // Erro de rede/chave: não marca nada — a próxima rodada tenta de novo.
      console.warn(`[kie.ai] Varredura não conseguiu consultar o hit #${demo.id}:`, err?.message || err);
    }
  }
  return finalized;
}

/** Sobe a varredura a cada minuto (sem bloquear o start do servidor). */
export function startMusicDemoSync(): void {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await syncPendingMusicDemos();
    } catch (err) {
      console.error("[kie.ai] Varredura de hits falhou:", err);
    } finally {
      running = false;
    }
  };
  console.log("[kie.ai] Varredura de hits ativa — fecha demos pendentes do kie.ai a cada 60s.");
  void run();
  setInterval(() => void run(), 60 * 1000).unref();
}
