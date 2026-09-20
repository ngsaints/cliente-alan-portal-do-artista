import { Router, type IRouter } from "express";
import { db, aiMusicDemosTable, songsTable, artistsTable, subscriptionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getCreditPackages, fulfillAiCreditPurchase } from "../lib/ai-credits.js";
import { getPaymentById } from "../lib/asaas-client.js";
import { 
  optimizeLyricsForMiniMax, 
  composeFullSongFromIdea,
  getOpenRouterConfig, 
  listOpenRouterModels, 
  getOpenRouterCredits,
} from "../lib/openrouter.js";
import { 
  startMusicGeneration, 
  getPredictionStatus, 
  downloadAndSaveGeneratedAudio, 
  getReplicateConfig 
} from "../lib/replicate-music.js";

const router: IRouter = Router();

// Retorna limites padrão de geração de música por plano
function getPlanMusicLimit(plano: string): number {
  const p = plano.toLowerCase();
  if (p === "premium") return 30;
  if (p === "pro" || p === "intermediario") return 15;
  if (p === "basico") return 5;
  return 1; // Plano Gratuito (Free)
}

// GET /api/ai/config/status - Retorna status dos gateways de IA
router.get("/ai/config/status", async (_req, res): Promise<void> => {
  try {
    const { getImageModelConfig } = await import("../lib/replicate-image.js");
    const [openrouter, replicate, openrouterCredits, imageConfig] = await Promise.all([
      getOpenRouterConfig(),
      getReplicateConfig(),
      getOpenRouterCredits(),
      getImageModelConfig(),
    ]);

    res.json({
      openrouter: {
        configured: !!openrouter.apiKey,
        model: openrouter.model,
        enabled: openrouter.enabled,
        isDirectOpenAi: openrouter.isDirectOpenAi,
        credits: openrouterCredits,
      },
      replicate: {
        configured: !!replicate.apiKey,
        model: replicate.model,
        enabled: replicate.enabled,
      },
      image: {
        provider: imageConfig.provider,
        model: imageConfig.model,
      },
    });
  } catch (error) {
    console.error("Erro ao verificar status de IA:", error);
    res.status(500).json({ error: "Erro ao verificar status dos gateways de IA" });
  }
});

// GET /api/ai/models - Lista modelos do OpenRouter dinamicamente
router.get("/ai/models", async (req, res): Promise<void> => {
  try {
    const sort = typeof req.query.sort === "string" ? req.query.sort : "most-popular";
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const refresh = req.query.refresh === "true" || req.query.refresh === "1";
    const models = await listOpenRouterModels(sort, search, refresh);
    res.json(models);
  } catch (error) {
    console.error("Erro ao listar modelos de IA:", error);
    res.status(500).json({ error: "Erro ao listar modelos de IA" });
  }
});

// GET /api/ai/credits/balance - Consulta saldo de créditos de IA do artista logado
router.get("/ai/credits/balance", async (req, res): Promise<void> => {
  try {
    const sessionArtistId = req.session.artistId;
    if (!sessionArtistId) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }

    const artists = await db.select().from(artistsTable).where(eq(artistsTable.id, sessionArtistId));
    if (artists.length === 0) {
      res.status(404).json({ error: "Artista não encontrado" });
      return;
    }

    const artist = artists[0];
    const plano = artist.plano || "free";

    // Verificar se o ciclo mensal reiniciou
    const now = new Date();
    const lastReset = artist.aiQueriesResetAt ? new Date(artist.aiQueriesResetAt) : new Date(0);
    const isNextMonth = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();

    let textUsed = artist.aiQueriesCount || 0;
    let musicUsed = artist.aiMusicQueriesCount || 0;

    if (isNextMonth) {
      textUsed = 0;
      musicUsed = 0;
      await db
        .update(artistsTable)
        .set({
          aiQueriesCount: 0,
          aiMusicQueriesCount: 0,
          aiQueriesResetAt: now,
        })
        .where(eq(artistsTable.id, sessionArtistId));
    }

    // Limites de texto — Vivi é GRÁTIS e ilimitada via OpenRouter free (custo zero).
    // Mantemos used só para métricas; o frontend deve tratar unlimited=true como "Grátis • Ilimitado".
    const textLimit: number | null = null;

    // Limites de música
    const musicLimit = getPlanMusicLimit(plano);
    const musicExtra = artist.aiMusicExtraCredits || 0;
    const musicTotalLimit = musicLimit + musicExtra;
    const musicRemaining = Math.max(0, musicTotalLimit - musicUsed);

    res.json({
      plano,
      text: {
        used: textUsed,
        limit: textLimit,
        remaining: null,
        unlimited: true,
        free: true,
      },
      music: {
        used: musicUsed,
        planLimit: musicLimit,
        extraCredits: musicExtra,
        totalLimit: musicTotalLimit,
        remaining: musicRemaining,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar saldo de créditos:", error);
    res.status(500).json({ error: "Erro ao buscar saldo de créditos de IA" });
  }
});

// POST /api/ai/lyrics/optimize - Otimiza letra do compositor para o formato do MiniMax
router.post("/ai/lyrics/optimize", async (req, res): Promise<void> => {
  try {
    const sessionArtistId = req.session.artistId;
    if (!sessionArtistId && !req.session.logado) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }

    const { title, lyrics, genre, mood, bpm, voice } = req.body;
    if (!lyrics || typeof lyrics !== "string" || lyrics.trim().length === 0) {
      res.status(400).json({ error: "A letra da música é obrigatória para otimização." });
      return;
    }

    const result = await optimizeLyricsForMiniMax({
      title,
      lyrics,
      genre: genre || "Sertanejo",
      mood,
      bpm: Number(bpm) || 120,
      voice: voice || "Masculina",
    });

    res.json(result);
  } catch (error: any) {
    console.error("Erro ao otimizar letra com OpenRouter:", error);
    res.status(500).json({ error: error.message || "Erro ao aprimorar letra com IA" });
  }
});

// POST /api/ai/lyrics/compose - Compõe uma letra inédita completa com base em uma ideia/tema
router.post("/ai/lyrics/compose", async (req, res): Promise<void> => {
  try {
    const sessionArtistId = req.session.artistId;
    if (!sessionArtistId && !req.session.logado) {
      res.status(401).json({ error: "Você precisa estar logado para compor com a Vivi." });
      return;
    }

    const { idea, genre, mood, bpm, voice } = req.body;
    if (!idea || typeof idea !== "string" || idea.trim().length === 0) {
      res.status(400).json({ error: "Informe a ideia ou tema da música para a Vivi compor." });
      return;
    }

    const result = await composeFullSongFromIdea({
      idea: idea.trim(),
      genre: genre || "Sertanejo",
      mood: mood || "Animado",
      bpm: Number(bpm) || 120,
      voice: voice || "Masculina",
    });

    res.json(result);
  } catch (error: any) {
    console.error("Erro ao compor letra com OpenRouter:", error);
    res.status(500).json({ error: error.message || "Erro ao compor letra com a IA da Vivi" });
  }
});

// POST /api/ai/music/generate - Dispara a geração de demo no Replicate MiniMax Music 2.6
router.post("/ai/music/generate", async (req, res): Promise<void> => {
  try {
    const sessionArtistId = req.session.artistId;
    if (!sessionArtistId) {
      res.status(401).json({ error: "Você precisa estar logado como artista para gerar hits musicais." });
      return;
    }

    const { title, lyrics, genre, mood, bpm, voice, prompt } = req.body;
    if (!title || !title.trim()) {
      res.status(400).json({ error: "Informe o título da música." });
      return;
    }

    if (!lyrics || !lyrics.trim()) {
      res.status(400).json({ error: "Informe a letra ou estrutura musical da composição." });
      return;
    }

    // Verificar créditos do artista
    const artists = await db.select().from(artistsTable).where(eq(artistsTable.id, sessionArtistId));
    if (artists.length === 0) {
      res.status(404).json({ error: "Artista não encontrado" });
      return;
    }

    const artist = artists[0];
    const plano = artist.plano || "free";

    // Checagem de ciclo mensal
    const now = new Date();
    const lastReset = artist.aiQueriesResetAt ? new Date(artist.aiQueriesResetAt) : new Date(0);
    const isNextMonth = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();

    let currentMusicUsed = isNextMonth ? 0 : (artist.aiMusicQueriesCount || 0);
    const musicPlanLimit = getPlanMusicLimit(plano);
    const musicTotalLimit = musicPlanLimit + (artist.aiMusicExtraCredits || 0);

    if (currentMusicUsed >= musicTotalLimit) {
      res.status(403).json({
        error: `Você atingiu o limite de ${musicTotalLimit} geração(ões) de música do seu plano ${plano.toUpperCase()}. Faça um upgrade ou adquira créditos extras para continuar criando hits!`,
        creditsExhausted: true,
        used: currentMusicUsed,
        limit: musicTotalLimit,
        plano,
      });
      return;
    }

    // Iniciar predição no Replicate
    const prediction = await startMusicGeneration({
      prompt: prompt || "",
      lyrics,
      genre: genre || "Sertanejo",
      mood: mood || "Romântico",
      bpm: Number(bpm) || 120,
      voice: voice || "Masculina",
    });

    let initialAudioUrl: string | null = null;
    let initialStatus = prediction.status;

    // Se o Replicate respondeu imediatamente com sucesso
    if (prediction.status === "succeeded" && prediction.output) {
      const remoteUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      if (remoteUrl && typeof remoteUrl === "string") {
        initialAudioUrl = await downloadAndSaveGeneratedAudio(remoteUrl, title);
        initialStatus = "completed" as any;
      }
    }

    // Salvar demo no banco de dados
    const [savedDemo] = await db
      .insert(aiMusicDemosTable)
      .values({
        artistaId: sessionArtistId,
        titulo: title.trim(),
        letra: lyrics.trim(),
        estilo: genre || "Sertanejo",
        voz: voice || "Masculina",
        bpm: Number(bpm) || 120,
        clima: mood || "Romântico",
        prompt: prompt || "",
        audioUrl: initialAudioUrl,
        predictionId: prediction.id,
        status: initialStatus === "succeeded" ? "completed" : initialStatus,
      })
      .returning();

    // Incrementar uso de créditos de música do artista
    await db
      .update(artistsTable)
      .set({
        aiMusicQueriesCount: currentMusicUsed + 1,
        ...(isNextMonth ? { aiQueriesResetAt: now } : {}),
      })
      .where(eq(artistsTable.id, sessionArtistId));

    res.status(201).json(savedDemo);
  } catch (error: any) {
    console.error("Erro ao gerar música:", error);
    res.status(500).json({ error: error.message || "Erro ao iniciar geração de música" });
  }
});

// GET /api/ai/music/status/:id - Verifica o status de uma predição e atualiza o áudio se concluído
router.get("/ai/music/status/:id", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const demoId = parseInt(id);

    if (isNaN(demoId)) {
      res.status(400).json({ error: "ID de hit inválido" });
      return;
    }

    const demos = await db.select().from(aiMusicDemosTable).where(eq(aiMusicDemosTable.id, demoId));
    if (demos.length === 0) {
      res.status(404).json({ error: "Hit musical não encontrado" });
      return;
    }

    const demo = demos[0];
    if (demo.status === "completed" && demo.audioUrl) {
      res.json(demo);
      return;
    }

    if (!demo.predictionId) {
      res.json(demo);
      return;
    }

    // Consultar status no Replicate
    const statusResult = await getPredictionStatus(demo.predictionId);

    if (statusResult.status === "succeeded" && statusResult.output) {
      const remoteUrl = Array.isArray(statusResult.output) ? statusResult.output[0] : statusResult.output;
      let finalAudioUrl = demo.audioUrl;

      if (remoteUrl && typeof remoteUrl === "string") {
        finalAudioUrl = await downloadAndSaveGeneratedAudio(remoteUrl, demo.titulo);
      }

      const [updatedDemo] = await db
        .update(aiMusicDemosTable)
        .set({
          status: "completed",
          audioUrl: finalAudioUrl,
        })
        .where(eq(aiMusicDemosTable.id, demoId))
        .returning();

      res.json(updatedDemo);
      return;
    }

    if (statusResult.status === "failed" || statusResult.status === "canceled") {
      const [failedDemo] = await db
        .update(aiMusicDemosTable)
        .set({
          status: "failed",
          error: statusResult.error || "A geração da música foi cancelada ou falhou.",
        })
        .where(eq(aiMusicDemosTable.id, demoId))
        .returning();

      res.json(failedDemo);
      return;
    }

    // Continua processando
    res.json({
      ...demo,
      status: statusResult.status,
    });
  } catch (error: any) {
    console.error("Erro ao verificar status da demo:", error);
    res.status(500).json({ error: error.message || "Erro ao verificar status" });
  }
});

// GET /api/ai/music/history - Retorna histórico de demos geradas pelo artista logado
router.get("/ai/music/history", async (req, res): Promise<void> => {
  try {
    const sessionArtistId = req.session.artistId;
    if (!sessionArtistId) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }

    const demos = await db
      .select()
      .from(aiMusicDemosTable)
      .where(eq(aiMusicDemosTable.artistaId, sessionArtistId))
      .orderBy(desc(aiMusicDemosTable.createdAt));

    res.json(demos);
  } catch (error) {
    console.error("Erro ao buscar histórico de demos:", error);
    res.status(500).json({ error: "Erro ao buscar histórico de hits musicais" });
  }
});

// POST /api/ai/music/save-to-catalog - Salva uma demo gerada como música oficial no catálogo do artista
router.post("/ai/music/save-to-catalog", async (req, res): Promise<void> => {
  try {
    const sessionArtistId = req.session.artistId;
    if (!sessionArtistId) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }

    const { demoId, status, precoX, precoY, descricao } = req.body;
    const dId = parseInt(demoId);

    const demos = await db.select().from(aiMusicDemosTable).where(eq(aiMusicDemosTable.id, dId));
    if (demos.length === 0) {
      res.status(404).json({ error: "Hit musical não encontrado" });
      return;
    }

    const demo = demos[0];
    if (demo.artistaId !== sessionArtistId) {
      res.status(403).json({ error: "Você só pode salvar músicas do seu próprio histórico" });
      return;
    }

    if (!demo.audioUrl) {
      res.status(400).json({ error: "Este hit ainda não possui áudio gerado." });
      return;
    }

    const artists = await db.select().from(artistsTable).where(eq(artistsTable.id, sessionArtistId));
    const artist = artists[0];

    // Inserir música oficial no catálogo
    const [song] = await db
      .insert(songsTable)
      .values({
        artistaId: String(sessionArtistId),
        titulo: demo.titulo,
        descricao: descricao || `Hit musical gerado no Estúdio Vivi (Estilo: ${demo.estilo}, Voz: ${demo.voz}).`,
        genero: demo.estilo,
        subgenero: demo.clima || null,
        compositor: artist?.name || "Artista",
        letra: demo.letra || null,
        status: status || "Disponível",
        precoX: precoX || null,
        precoY: precoY || null,
        mp3Path: demo.audioUrl,
        capaPath: artist?.capaUrl || "/images/default-cover.png",
        tipoMidia: "audio",
        isVip: false,
      })
      .returning();

    // Atualizar contador de músicas do artista
    if (artist) {
      await db
        .update(artistsTable)
        .set({
          musicaCount: (parseInt(artist.musicaCount || "0") + 1).toString(),
        })
        .where(eq(artistsTable.id, sessionArtistId));
    }

    res.status(201).json({
      success: true,
      message: "Música salva no seu catálogo com sucesso!",
      song,
    });
  } catch (error: any) {
    console.error("Erro ao salvar demo no catálogo:", error);
    res.status(500).json({ error: error.message || "Erro ao salvar música no catálogo" });
  }
});

// DELETE /api/ai/music/:id - Exclui uma demo do histórico do artista
router.delete("/ai/music/:id", async (req, res): Promise<void> => {
  try {
    const sessionArtistId = req.session.artistId;
    if (!sessionArtistId) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }

    const demoId = parseInt(req.params.id);
    if (isNaN(demoId)) {
      res.status(400).json({ error: "ID de hit inválido" });
      return;
    }

    const demos = await db.select().from(aiMusicDemosTable).where(eq(aiMusicDemosTable.id, demoId));
    if (demos.length === 0) {
      res.status(404).json({ error: "Hit não encontrado" });
      return;
    }

    if (demos[0].artistaId !== sessionArtistId) {
      res.status(403).json({ error: "Você só pode excluir hits do seu próprio histórico" });
      return;
    }

    await db.delete(aiMusicDemosTable).where(eq(aiMusicDemosTable.id, demoId));

    res.json({ success: true, message: "Hit removido com sucesso" });
  } catch (error: any) {
    console.error("Erro ao excluir hit:", error);
    res.status(500).json({ error: "Erro ao excluir hit" });
  }
});

// GET /api/ai/credits/packages - Lista pacotes de créditos extras disponíveis
router.get("/ai/credits/packages", async (_req, res): Promise<void> => {
  try {
    const packages = await getCreditPackages();
    res.json(packages);
  } catch (error) {
    console.error("Erro ao listar pacotes de créditos:", error);
    res.status(500).json({ error: "Erro ao listar pacotes de créditos" });
  }
});

// POST /api/ai/credits/buy-package - Inicia compra de pacote de créditos de música
router.post("/ai/credits/buy-package", async (req, res): Promise<void> => {
  try {
    const sessionArtistId = req.session.artistId;
    if (!sessionArtistId) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }

    const { packageId } = req.body;
    const packages = await getCreditPackages();
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) {
      res.status(400).json({ error: "Pacote inválido" });
      return;
    }

    const artists = await db.select().from(artistsTable).where(eq(artistsTable.id, sessionArtistId));
    if (artists.length === 0) {
      res.status(404).json({ error: "Artista não encontrado" });
      return;
    }
    const artist = artists[0];

    // Verificar se o Asaas está disponível
    try {
      const { getAsaasCredentials, findOrCreateCustomer, asaasFetch } = await import("../lib/asaas-client.js");
      const creds = await getAsaasCredentials();

      if (creds.apiKey) {
        const customer = await findOrCreateCustomer(
          artist.name,
          artist.email,
          artist.documento || undefined,
          artist.contato || undefined
        );

        const today = new Date().toISOString().split("T")[0];
        const paymentRes = await asaasFetch<any>("/payments", {
          method: "POST",
          body: {
            customer: customer.id,
            billingType: "PIX",
            value: pkg.price,
            dueDate: today,
            description: `Portal do Artista - Créditos de Música IA (${pkg.name} - ${pkg.credits} Hits)`,
            externalReference: `credits-${sessionArtistId}-${pkg.id}`,
          },
        });

        let qrCodeData = { encodedImage: "", payload: "" };
        try {
          qrCodeData = await asaasFetch<any>(`/payments/${paymentRes.id}/pixQrCode`);
        } catch (qrErr) {
          console.warn("Falha ao gerar QR Code PIX Asaas:", qrErr);
        }

        await db.insert(subscriptionsTable).values({
          artistId: String(sessionArtistId) as any,
          planNome: `ai_credits:${pkg.id}`,
          asaasPaymentId: paymentRes.id,
          status: "pending",
          amount: String(pkg.price),
          billingType: "PIX",
        });

        res.json({
          success: true,
          mode: "asaas_pix",
          paymentId: paymentRes.id,
          pixQrCode: qrCodeData.encodedImage,
          pixCopiaECola: qrCodeData.payload,
          package: pkg,
        });
        return;
      }
    } catch (asaasErr) {
      console.warn("Asaas não configurado ou indisponível, usando modo teste/direto:", asaasErr);
    }

    // Modo de demonstração / ativação direta quando sem Asaas em desenvolvimento
    const newExtra = (artist.aiMusicExtraCredits || 0) + pkg.credits;
    await db
      .update(artistsTable)
      .set({ aiMusicExtraCredits: newExtra })
      .where(eq(artistsTable.id, sessionArtistId));

    res.json({
      success: true,
      mode: "instant",
      message: `Pacote de ${pkg.credits} créditos ativado com sucesso!`,
      addedCredits: pkg.credits,
      totalExtraCredits: newExtra,
      package: pkg,
    });
  } catch (error: any) {
    console.error("Erro ao processar compra de créditos:", error);
    res.status(500).json({ error: error.message || "Erro ao processar compra de créditos" });
  }
});

// POST /api/ai/credits/confirm-payment - Confirma PIX e libera créditos extras
router.post("/ai/credits/confirm-payment", async (req, res): Promise<void> => {
  try {
    const sessionArtistId = req.session.artistId;
    if (!sessionArtistId) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }

    const paymentId = String(req.body?.paymentId || "").trim();
    if (!paymentId) {
      res.status(400).json({ error: "Pagamento não informado" });
      return;
    }

    const [pending] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.asaasPaymentId, paymentId));

    if (!pending || String(pending.artistId) !== String(sessionArtistId)) {
      res.status(404).json({ error: "Pagamento não encontrado para este artista" });
      return;
    }

    if (pending.status === "active") {
      res.json({ success: true, alreadyProcessed: true, message: "Créditos já liberados." });
      return;
    }

    const payment = await getPaymentById(paymentId);
    const paidStatuses = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"];
    if (!paidStatuses.includes(String(payment.status || "").toUpperCase())) {
      res.json({ success: false, pending: true, message: "Pagamento ainda não confirmado. Aguarde alguns instantes." });
      return;
    }

    const packageId = String(pending.planNome || "").replace("ai_credits:", "");
    const result = await fulfillAiCreditPurchase({
      artistId: sessionArtistId,
      packageId,
      paymentId,
      amount: pending.amount,
    });

    if (!result.ok) {
      res.status(400).json({ error: result.error || "Não foi possível liberar os créditos" });
      return;
    }

    res.json({
      success: true,
      alreadyProcessed: result.alreadyProcessed === true,
      addedCredits: result.addedCredits || 0,
      extraCredits: result.extraCredits,
      message: result.alreadyProcessed
        ? "Créditos já estavam liberados."
        : `${result.addedCredits} crédito(s) de música liberado(s)!`,
    });
  } catch (error: any) {
    console.error("Erro ao confirmar pagamento de créditos:", error);
    res.status(500).json({ error: error.message || "Erro ao confirmar pagamento" });
  }
});

export default router;
