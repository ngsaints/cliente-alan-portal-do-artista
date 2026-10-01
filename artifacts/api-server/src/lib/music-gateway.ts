import {
  getPredictionStatus,
  getReplicateConfig,
  startMusicGeneration as startReplicateMusicGeneration,
  testMusicGeneration as testReplicateMusicGeneration,
  testReplicateIntegration,
  type MiniMaxMusicInput,
  type MusicGenerationTestResult,
  type ReplicateIntegrationReport,
  type ReplicatePredictionResponse,
} from "./replicate-music.js";
import {
  getOpenRouterMusicStatus,
  startOpenRouterMusicGeneration,
  testOpenRouterIntegration,
  testOpenRouterMusicGeneration,
} from "./openrouter-music.js";
import {
  getKiePredictionStatus,
  startKieMusicGeneration,
  testKieIntegration,
  testKieMusicGeneration,
} from "./kie-music.js";
import type { MusicProvider } from "./music-provider.js";

/** Modelo Replicate usado quando o escolhido é de outro provedor e ele falhar. */
const FALLBACK_REPLICATE_MODEL = "minimax/music-2.6";

export interface MusicIntegrationReport extends ReplicateIntegrationReport {
  provider: MusicProvider;
}

/**
 * Fachada da geração de música.
 * O provedor é escolhido pelo id do modelo (sem configuração extra):
 *   openrouter:google/lyria-3-pro-preview → OpenRouter
 *   kie:V6                                → kie.ai (Suno)
 *   minimax/music-2.6                      → Replicate
 * Se o provedor escolhido falhar por infraestrutura (chave, saldo, modelo), cai
 * para o Replicate automaticamente para o artista não ficar sem gerar.
 */
export async function startMusicGeneration(
  input: MiniMaxMusicInput,
  opts: { plano?: string } = {}
): Promise<ReplicatePredictionResponse> {
  const config = await getReplicateConfig(opts.plano);

  // Fallback só existe se o Replicate estiver configurado E habilitado no painel.
  const canFallback = !!config.apiKey && config.enabled;

  // Cover (áudio de referência) e estender (continuar um hit) são exclusivos do
  // kie.ai: os outros provedores não têm essas tarefas e gerariam um hit do zero
  // como se tivessem usado o áudio do artista.
  const isCover = !!input.coverAudioUrl?.trim();
  const isExtend = !!input.extendAudioUrl?.trim();
  const usesSourceAudio = isCover || isExtend;
  if (usesSourceAudio && config.provider !== "kie") {
    const err: any = new Error(
      isExtend
        ? "O modo estender (continuar um hit) só está disponível enquanto o kie.ai estiver selecionado como provedor de música."
        : "O modo cover (áudio de referência) só está disponível enquanto o kie.ai estiver selecionado como provedor de música."
    );
    err.status = 409;
    err.code = isExtend ? "EXTEND_PROVIDER_UNAVAILABLE" : "COVER_PROVIDER_UNAVAILABLE";
    throw err;
  }

  if (config.provider === "kie") {
    try {
      const prediction = await startKieMusicGeneration(input, opts);
      console.log(`[AI Music] provider=kie id=${prediction.id}`);
      return prediction;
    } catch (err: any) {
      // Com áudio fonte não há fallback: cair no Replicate entregaria outro hit do zero
      // e o artista pagaria por uma música que não usou o áudio dele.
      if (!canFallback || usesSourceAudio) throw err;
      console.warn(
        `[AI Music] kie.ai indisponível (${err?.code || "erro"}), usando Replicate como fallback:`,
        err?.message || err
      );
      const prediction = await startReplicateMusicGeneration(input, {
        ...opts,
        modelOverride: FALLBACK_REPLICATE_MODEL,
      });
      console.log(`[AI Music] provider=replicate(fallback) id=${prediction.id}`);
      return prediction;
    }
  }

  if (config.provider === "openrouter") {
    try {
      const prediction = await startOpenRouterMusicGeneration(input, opts);
      console.log(`[AI Music] provider=openrouter id=${prediction.id}`);
      return prediction;
    } catch (err: any) {
      if (!canFallback) throw err;
      console.warn(
        `[AI Music] OpenRouter indisponível (${err?.code || "erro"}), usando Replicate como fallback:`,
        err?.message || err
      );
      const prediction = await startReplicateMusicGeneration(input, {
        ...opts,
        modelOverride: FALLBACK_REPLICATE_MODEL,
      });
      console.log(`[AI Music] provider=replicate(fallback) id=${prediction.id}`);
      return prediction;
    }
  }

  const prediction = await startReplicateMusicGeneration(input, opts);
  console.log(`[AI Music] provider=replicate id=${prediction.id}`);
  return prediction;
}

/** Despacha a consulta de status pelo id gerado (kie = tarefa remota, orw = job em memória). */
export async function getMusicPredictionStatus(
  predictionId: string
): Promise<ReplicatePredictionResponse & { alreadySaved?: boolean }> {
  if (predictionId.startsWith("kie:")) {
    return await getKiePredictionStatus(predictionId);
  }
  if (predictionId.startsWith("orw:")) {
    return getOpenRouterMusicStatus(predictionId);
  }
  return await getPredictionStatus(predictionId);
}

export interface MusicTestReport extends MusicGenerationTestResult {
  provider: MusicProvider;
}

/**
 * Teste pago do painel: roda o caminho completo (gerar → salvar → link tocável)
 * no provedor que está configurado para o plano escolhido.
 */
export async function runMusicGenerationTest(
  opts: { plano?: string; prompt?: string; lyrics?: string; title?: string } = {}
): Promise<MusicTestReport> {
  const config = await getReplicateConfig(opts.plano);

  if (config.provider === "kie") {
    const report = await testKieMusicGeneration(opts);
    return { ...report, provider: "kie" };
  }

  if (config.provider === "openrouter") {
    const report = await testOpenRouterMusicGeneration(opts);
    return { ...report, modelSource: config.modelSource, provider: "openrouter" };
  }

  const report = await testReplicateMusicGeneration(opts);
  return { ...report, provider: "replicate" };
}

/**
 * Verificação GRÁTIS da integração (chave/modelo/saldo, sem gerar nada),
 * despachando para o provedor do modelo configurado.
 */
export async function runIntegrationTest(): Promise<MusicIntegrationReport> {
  const config = await getReplicateConfig();

  if (config.provider === "kie") {
    const report = await testKieIntegration();
    return { ...report, provider: "kie" };
  }

  if (config.provider === "openrouter") {
    const report = await testOpenRouterIntegration();
    return { ...report, provider: "openrouter" };
  }

  const report = await testReplicateIntegration();
  return { ...report, provider: config.provider };
}
