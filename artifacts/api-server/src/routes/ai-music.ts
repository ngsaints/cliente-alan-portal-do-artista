import { Router, type IRouter } from "express";
import { db, aiMusicDemosTable, songsTable, artistsTable, subscriptionsTable, plansTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
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
  downloadAndSaveGeneratedAudio, 
  getReplicateConfig 
} from "../lib/replicate-music.js";
import { startMusicGeneration, getMusicPredictionStatus } from "../lib/music-gateway.js";
import { 
  uploadKieBase64File, 
  uploadKieUrlFile, 
  getKieCredits,
  getKieCreditDetails, 
  getKieDownloadUrl,
  getKieWebhookHmacKey,
  verifyKieWebhookSignature,
  setKieStatusCache,
  resolveDownloadUrl,
  getKieMusicConfig,
  FAILED_STATUSES 
} from "../lib/kie-music.js";

const router: IRouter = Router();

// Limites de geração de música por plano — 100% definido pelo admin em Planos (plans.ai_credits_limit)
async function getPlanMusicLimit(plano: string): Promise<number> {
  const p = (plano || "").toLowerCase();
  try {
    const rows = await db
      .select({ limit: plansTable.musicCreditsLimit })
      .from(plansTable)
      .where(sql`lower(${plansTable.nome}) = ${p}`);
    // Plano existe no cadastro: o valor do admin manda (inclusive 0 = sem gerações)
    if (rows.length > 0) {
      return Number(rows[0]?.limit ?? 0);
    }
    // Plano sem linha no cadastro (ex.: artistas antigos em "free") = sem cota definida
    console.warn(`[AI Music] Plano "${p}" sem cadastro em plans — gerações de IA bloqueadas até o admin definir a cota.`);
  } catch (err) {
    console.warn("[AI Music] Falha ao ler limite do plano no banco:", err);
  }
  return 0;
}

// Devolve 1 cota de música quando a geração falha — o artista pagou por um hit que não recebeu.
// Só estorna se a demo foi criada no mesmo ciclo mensal da cota (evita mexer na cota do mês seguinte).
async function refundMusicCredit(artistId: number, demoCreatedAt: Date): Promise<void> {
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
        // Provedor deduzido do modelo escolhido: replicate | openrouter | kie
        provider: replicate.provider,
        modelSource: replicate.modelSource,
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
    const musicLimit = await getPlanMusicLimit(plano);
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

    const { title, lyrics, genre, mood, bpm, voice, instructions } = req.body;
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
      instructions: typeof instructions === "string" ? instructions.trim().slice(0, 800) : undefined,
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

    const { idea, genre, mood, bpm, voice, instructions } = req.body;
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
      instructions: typeof instructions === "string" ? instructions.trim().slice(0, 800) : undefined,
    });

    res.json(result);
  } catch (error: any) {
    console.error("Erro ao compor letra com OpenRouter:", error);
    res.status(500).json({ error: error.message || "Erro ao compor letra com a IA da Vivi" });
  }
});

// POST /api/ai/music/generate - Dispara a geração de demo (Replicate, OpenRouter ou kie.ai)
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
    const musicPlanLimit = await getPlanMusicLimit(plano);
    const musicTotalLimit = musicPlanLimit + (artist.aiMusicExtraCredits || 0);

    if (currentMusicUsed >= musicTotalLimit) {
      const blocked =
        musicTotalLimit <= 0
          ? `Seu plano ${plano.toUpperCase()} não inclui gerações de música por IA. Faça upgrade de plano para criar seus hits com inteligência artificial.`
          : `Você atingiu o limite de ${musicTotalLimit} geração(ões) de música do seu plano ${plano.toUpperCase()}. Faça um upgrade ou adquira créditos extras para continuar criando hits!`;
      res.status(403).json({
        error: blocked,
        creditsExhausted: true,
        used: currentMusicUsed,
        limit: musicTotalLimit,
        plano,
      });
      return;
    }

    // Iniciar geração — o provedor sai do modelo escolhido (Replicate, OpenRouter ou kie.ai)
    const prediction = await startMusicGeneration(
      {
        title: title.trim(),
        prompt: prompt || "",
        lyrics,
        genre: genre || "Sertanejo",
        mood: mood || "Romântico",
        bpm: Number(bpm) || 120,
        voice: voice || "Masculina",
      },
      { plano }
    );

    let initialAudioUrl: string | null = null;
    let initialStatus = prediction.status;

    // Se o provedor respondeu imediatamente com sucesso
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

    console.log(
      `[AI Music] Geração de hit — artista=${artist.name} (id ${sessionArtistId}) plano=${plano} ` +
        `cota=${currentMusicUsed + 1}/${musicTotalLimit} titulo="${title.trim()}" prediction=${prediction.id}`
    );

    res.status(201).json(savedDemo);
  } catch (error: any) {
    console.error("Erro ao gerar música:", error);
    const status = typeof error?.status === "number" ? error.status : 500;
    const code = typeof error?.code === "string" ? error.code : undefined;
    res.status(status).json({
      error: error.message || "Erro ao iniciar geração de música",
      ...(code ? { code } : {}),
    });
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

    // Estado terminal: não repollar o provedor nem reprocessar o reembolso.
    if (demo.status === "failed") {
      res.json(demo);
      return;
    }

    if (!demo.predictionId) {
      res.json(demo);
      return;
    }

    // Consultar status da geração (kie: tarefa remota, orw: job em memória, senão Replicate)
    const statusResult = await getMusicPredictionStatus(demo.predictionId);

    if (statusResult.status === "succeeded" && statusResult.output) {
      const remoteUrl = Array.isArray(statusResult.output) ? statusResult.output[0] : statusResult.output;
      let finalAudioUrl = demo.audioUrl;

      if (remoteUrl && typeof remoteUrl === "string") {
        // OpenRouter já salvou o arquivo no job (R2/local); Replicate devolve URL remota.
        finalAudioUrl = statusResult.alreadySaved
          ? remoteUrl
          : await downloadAndSaveGeneratedAudio(remoteUrl, demo.titulo);
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

      // O artista não recebeu o áudio: devolve a cota consumida na submissão.
      await refundMusicCredit(demo.artistaId, demo.createdAt);

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
    // Repassa o código do provedor (ex.: KIE_NO_CREDIT) para o Estúdio parar o polling
    // em vez de ficar tentando contra um gateway que está fora.
    const status = typeof error?.status === "number" ? error.status : 500;
    const code = typeof error?.code === "string" ? error.code : undefined;
    res.status(status).json({
      error: error.message || "Erro ao verificar status",
      ...(code ? { code } : {}),
    });
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

// POST /api/ai/kie/upload-base64 - Upload temporário via Base64 para o kie.ai
router.post("/ai/kie/upload-base64", async (req, res): Promise<void> => {
  try {
    const isArtist = Boolean((req.session as any)?.artistId);
    const isAdmin = Boolean((req.session as any)?.admin || (req.session as any)?.logado);
    if (!isArtist && !isAdmin) {
      res.status(401).json({ error: "Faça login para utilizar este serviço." });
      return;
    }
    const { base64Data, fileName, uploadPath } = req.body || {};
    if (!base64Data || typeof base64Data !== "string") {
      res.status(400).json({ error: "base64Data é obrigatório e deve ser uma string Base64 ou Data URL." });
      return;
    }
    const result = await uploadKieBase64File(base64Data, fileName, uploadPath);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error("[kie.ai] Erro no upload Base64:", error);
    res.status(500).json({ error: error.message || "Falha ao enviar arquivo para o kie.ai" });
  }
});

// POST /api/ai/kie/upload-url - Upload temporário de arquivo via URL para o kie.ai
router.post("/ai/kie/upload-url", async (req, res): Promise<void> => {
  try {
    const isArtist = Boolean((req.session as any)?.artistId);
    const isAdmin = Boolean((req.session as any)?.admin || (req.session as any)?.logado);
    if (!isArtist && !isAdmin) {
      res.status(401).json({ error: "Faça login para utilizar este serviço." });
      return;
    }
    const { fileUrl, fileName, uploadPath } = req.body || {};
    if (!fileUrl || typeof fileUrl !== "string" || !/^https?:\/\//i.test(fileUrl.trim())) {
      res.status(400).json({ error: "fileUrl é obrigatório e deve ser uma URL HTTP/HTTPS válida." });
      return;
    }
    const result = await uploadKieUrlFile(fileUrl, fileName, uploadPath);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error("[kie.ai] Erro no upload por URL:", error);
    res.status(500).json({ error: error.message || "Falha ao enviar arquivo por URL para o kie.ai" });
  }
});

// GET /api/ai/kie/credits - Consulta o saldo de créditos da conta kie.ai (OpenAPI: /api/v1/chat/credit)
router.get("/ai/kie/credits", async (req, res): Promise<void> => {
  try {
    const isArtist = Boolean((req.session as any)?.artistId);
    const isAdmin = Boolean((req.session as any)?.admin || (req.session as any)?.logado);
    if (!isArtist && !isAdmin) {
      res.status(401).json({ error: "Faça login para utilizar este serviço." });
      return;
    }
    const details = await getKieCreditDetails();
    if (!details.ok) {
      const httpStatus = details.code >= 400 && details.code <= 599 ? details.code : 400;
      res.status(httpStatus).json({
        success: false,
        code: details.code,
        msg: details.msg,
        credits: details.credits,
        error: details.error || details.msg,
      });
      return;
    }
    res.json({
      success: true,
      code: 200,
      msg: "success",
      credits: details.credits,
      data: details.credits,
    });
  } catch (error: any) {
    console.error("[kie.ai] Erro ao consultar créditos:", error);
    res.status(500).json({ error: error.message || "Falha ao consultar créditos do kie.ai" });
  }
});

// POST /api/ai/kie/download-url - Gera link de download temporário (20 min) para arquivo gerado no kie.ai
router.post("/ai/kie/download-url", async (req, res): Promise<void> => {
  try {
    const isArtist = Boolean((req.session as any)?.artistId);
    const isAdmin = Boolean((req.session as any)?.admin || (req.session as any)?.logado);
    if (!isArtist && !isAdmin) {
      res.status(401).json({ error: "Faça login para utilizar este serviço." });
      return;
    }
    const { url } = req.body || {};
    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "url é obrigatória." });
      return;
    }
    const downloadUrl = await getKieDownloadUrl(url);
    res.json({ success: true, downloadUrl });
  } catch (error: any) {
    console.error("[kie.ai] Erro ao obter link de download:", error);
    res.status(500).json({ error: error.message || "Falha ao obter link de download do kie.ai" });
  }
});

/**
 * Manipulador compartilhado para o Webhook do kie.ai (POST /api/webhooks/kie e POST /api/ai/kie/webhook).
 * Valida a assinatura HMAC-SHA256 via headers X-Webhook-Timestamp e X-Webhook-Signature.
 */
async function handleKieWebhook(req: any, res: any): Promise<void> {
  try {
    const hmacKey = await getKieWebhookHmacKey();

    if (hmacKey) {
      const verification = verifyKieWebhookSignature(req.headers, req.body, hmacKey);
      if (!verification.valid) {
        console.warn(`[kie.ai Webhook] Assinatura HMAC rejeitada: ${verification.error}`);
        res.status(401).json({ error: verification.error || "Invalid signature" });
        return;
      }
      console.log(`[kie.ai Webhook] Assinatura HMAC verificada com sucesso (taskId=${verification.taskId})`);
    } else {
      console.warn("[kie.ai Webhook] Aviso: kie_webhook_hmac_key não configurada — requisição aceita sem validação HMAC.");
    }

    const { code, msg, data } = req.body || {};
    const callbackData = data && typeof data === "object" ? data : {};
    const taskId = String(callbackData.task_id || callbackData.taskId || req.body?.taskId || "");
    const callbackType = callbackData.callbackType || "";

    if (!taskId) {
      res.status(400).json({ error: "Missing task_id" });
      return;
    }

    console.log(`[kie.ai Webhook] Callback recebido — taskId=${taskId} code=${code} type=${callbackType}`);

    const predictionId = `kie:${taskId}`;

    // Buscar demo correspondente no banco
    const demos = await db
      .select()
      .from(aiMusicDemosTable)
      .where(eq(aiMusicDemosTable.predictionId, predictionId));

    const demo = demos[0];
    const remoteStatus = String(callbackData.status || (code === 200 ? "SUCCESS" : "FAILED"));

    if (remoteStatus === "SUCCESS" || code === 200) {
      const tracks: any[] = Array.isArray(callbackData?.response?.sunoData)
        ? callbackData.response.sunoData
        : [];
      const remoteAudio = tracks[0]?.audioUrl || callbackData.audioUrl || callbackData.fileUrl || null;

      if (remoteAudio) {
        const config = await getKieMusicConfig();
        const resolvedUrl = config.apiKey ? await resolveDownloadUrl(config.apiKey, remoteAudio) : remoteAudio;

        let finalAudioUrl = resolvedUrl;
        if (demo) {
          finalAudioUrl = await downloadAndSaveGeneratedAudio(resolvedUrl, demo.titulo);
          await db
            .update(aiMusicDemosTable)
            .set({
              status: "completed",
              audioUrl: finalAudioUrl,
            })
            .where(eq(aiMusicDemosTable.id, demo.id));
          console.log(`[kie.ai Webhook] Hit salvo com sucesso — demoId=${demo.id} audio=${finalAudioUrl}`);
        }

        setKieStatusCache(taskId, {
          id: predictionId,
          status: "succeeded",
          output: finalAudioUrl,
          error: null,
          logs: null,
          alreadySaved: !!demo,
        });
      }
    } else if (FAILED_STATUSES[remoteStatus] || (code && code !== 200)) {
      const errMessage = String(
        callbackData.errorMessage || msg || FAILED_STATUSES[remoteStatus] || "Falha na geração do áudio"
      );

      if (demo && demo.status !== "failed" && demo.status !== "completed") {
        await db
          .update(aiMusicDemosTable)
          .set({
            status: "failed",
            error: errMessage,
          })
          .where(eq(aiMusicDemosTable.id, demo.id));

        await refundMusicCredit(demo.artistaId, demo.createdAt);
        console.log(`[kie.ai Webhook] Falha registrada e cota devolvida — demoId=${demo.id} erro=${errMessage}`);
      }

      setKieStatusCache(taskId, {
        id: predictionId,
        status: "failed",
        output: null,
        error: errMessage,
        logs: null,
      });
    }

    res.status(200).json({ status: "received", taskId });
  } catch (error: any) {
    console.error("[kie.ai Webhook] Erro ao processar webhook:", error);
    res.status(500).json({ error: error.message || "Internal webhook processing error" });
  }
}

// Endpoints do Webhook do kie.ai (ambos aceitos)
router.post("/webhooks/kie", handleKieWebhook);
router.post("/ai/kie/webhook", handleKieWebhook);

export default router;



