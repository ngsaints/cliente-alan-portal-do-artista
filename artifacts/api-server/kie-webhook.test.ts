import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.DATABASE_URL = 'postgres://test:test@127.0.0.1:1/test';
const { verifyKieWebhookSignature, releaseKieWebhookReplay, parseKieCallback, kieFailedMessage, buildKieInput, kieTaskModelFor, estimateSongSeconds } = await import(
  './src/lib/kie-music.js'
);
const { extractJsonObject } = await import('./src/lib/openrouter.js');

const SECRET = 'segredo-de-teste';
const TASK = 'task-abc-123';

function sign(taskId: string, timestamp: number | string, secret = SECRET): string {
  return crypto.createHmac('sha256', secret).update(`${taskId}.${timestamp}`).digest('base64');
}

function call(overrides: {
  timestamp?: string | number;
  signature?: string;
  body?: any;
  secret?: string;
} = {}) {
  const timestamp = overrides.timestamp ?? Math.floor(Date.now() / 1000);
  const headers: Record<string, string> = {
    'x-webhook-timestamp': String(timestamp),
    'x-webhook-signature': overrides.signature ?? sign(TASK, timestamp, overrides.secret ?? SECRET),
  };
  return verifyKieWebhookSignature(headers, overrides.body ?? { data: { task_id: TASK } }, overrides.secret ?? SECRET);
}

// 1. assinatura válida
{
  const r = call();
  assert.equal(r.valid, true, `esperava válida, recebeu: ${r.error}`);
  assert.equal(r.taskId, TASK);
}

// 2. timestamp fora da janela (antigo) → replay de requisição antiga
{
  const stale = Math.floor(Date.now() / 1000) - 4000;
  const r = call({ timestamp: stale });
  assert.equal(r.valid, false);
  assert.match(String(r.error), /window/i);
}

// 3. timestamp futuro além da tolerância
{
  const ahead = Math.floor(Date.now() / 1000) + 4000;
  const r = call({ timestamp: ahead });
  assert.equal(r.valid, false);
  assert.match(String(r.error), /window/i);
}

// 4. assinatura adulterada
{
  const ts = Math.floor(Date.now() / 1000);
  const r = call({ timestamp: ts, signature: sign(TASK, ts, 'outra-chave') });
  assert.equal(r.valid, false);
  assert.equal(r.error, 'Invalid signature');
}

// 5. headers ausentes
{
  const r = verifyKieWebhookSignature({}, { data: { task_id: TASK } }, SECRET);
  assert.equal(r.valid, false);
  assert.equal(r.error, 'Missing signature headers');
}

// 6. body sem task_id
{
  const ts = Math.floor(Date.now() / 1000);
  const r = call({ timestamp: ts, body: { data: {} } });
  assert.equal(r.valid, false);
  assert.match(String(r.error), /task_id/i);
}

// 7. timestamp não numérico
{
  const r = call({ timestamp: 'ontem' });
  assert.equal(r.valid, false);
  assert.equal(r.error, 'Invalid timestamp');
}

// 8. replay: segunda entrega idêntica é recusada
{
  const ts = Math.floor(Date.now() / 1000) + 1;
  const first = call({ timestamp: ts });
  assert.equal(first.valid, true, `primeira entrega deveria passar: ${first.error}`);
  const second = call({ timestamp: ts });
  assert.equal(second.valid, false);
  assert.equal(second.error, 'Replay detected');
}

// 9. base64 não canônico (espaços) decodifica igual e passa
{
  const ts = Math.floor(Date.now() / 1000) + 2;
  const signature = sign(TASK, ts);
  const r = call({ timestamp: ts, signature: signature.replace(/(.{8})/g, '$1 ') });
  assert.equal(r.valid, true, `base64 com espaços deveria ser aceito: ${r.error}`);
}

// 10. chave errada nunca passa
{
  const ts = Math.floor(Date.now() / 1000) + 3;
  const r = call({ timestamp: ts, signature: sign(TASK, ts, 'chave-errada'), secret: SECRET });
  assert.equal(r.valid, false);
  assert.equal(r.error, 'Invalid signature');
}

// 11. falha no processamento libera o replay → o reenvio do kie.ai é aceito
{
  const ts = Math.floor(Date.now() / 1000) + 4;
  const headers = {
    'x-webhook-timestamp': String(ts),
    'x-webhook-signature': sign(TASK, ts),
  };
  const body = { data: { task_id: TASK } };
  assert.equal(verifyKieWebhookSignature(headers, body, SECRET).valid, true);
  assert.equal(verifyKieWebhookSignature(headers, body, SECRET).error, 'Replay detected');
  releaseKieWebhookReplay(headers, body);
  assert.equal(verifyKieWebhookSignature(headers, body, SECRET).valid, true, 'reenvio após 500 deveria passar');
}

// 12. payload oficial do callback (data.data[0].audio_url)
{
  const info = parseKieCallback({
    code: 200,
    msg: 'All generated successfully.',
    data: {
      callbackType: 'complete',
      task_id: TASK,
      data: [{ id: 'x', audio_url: 'https://cdn.kie/um.mp3', duration: 54.36 }],
    },
  });
  assert.equal(info.taskId, TASK, 'task_id deve sair de data.task_id');
  assert.equal(info.status, 'success', `esperava success, veio ${info.status}`);
  assert.equal(info.audioUrl, 'https://cdn.kie/um.mp3');
  assert.equal(info.callbackType, 'complete');
  assert.equal(info.duration, 54.36);
}

// 13. callback da primeira faixa já é suficiente para salvar o hit
{
  const info = parseKieCallback({
    code: 200,
    data: { callbackType: 'first', task_id: TASK, data: [{ audio_url: 'https://cdn.kie/a.mp3' }] },
  });
  assert.equal(info.status, 'success');
  assert.equal(info.callbackType, 'first');
}

// 14. formato do record-info (response.sunoData em camelCase) também é aceito
{
  const info = parseKieCallback({
    data: {
      task_id: TASK,
      status: 'SUCCESS',
      response: { sunoData: [{ audioUrl: 'https://cdn.kie/b.mp3' }] },
    },
  });
  assert.equal(info.status, 'success');
  assert.equal(info.audioUrl, 'https://cdn.kie/b.mp3');
}

// 15. code != 200 vira falha com mensagem amigável do código (cota devolvida)
{
  const info = parseKieCallback({ code: 501, msg: 'Audio generation failed', data: { task_id: TASK } });
  assert.equal(info.status, 'failed', `esperava failed, veio ${info.status}`);
  assert.match(String(info.failureMessage), /devolvida/);
}

// 15b. código 413 (áudio enviado igual a obra existente) e callbackType error
{
  const conflict = parseKieCallback({ code: 413, msg: 'Conflict', data: { task_id: TASK } });
  assert.equal(conflict.status, 'failed');
  assert.match(String(conflict.failureMessage), /outra referência/);

  const typed = parseKieCallback({ code: 200, msg: 'Audio generation failed', data: { task_id: TASK, callbackType: 'error', data: [] } });
  assert.equal(typed.status, 'failed', 'callbackType error deve virar falha');
}

// 15c. code desconhecido sem msg não deixa o hit preso em pending
{
  const info = parseKieCallback({ code: 599, data: { task_id: TASK } });
  assert.equal(info.status, 'failed');
  assert.ok(String(info.failureMessage).length > 0, 'falha sem msg precisa de texto');
}

// 16. status remoto de erro não documentado (ex.: FAILED) não deixa o hit preso em processing
{
  const info = parseKieCallback({ code: 200, data: { task_id: TASK, status: 'failed' } });
  assert.equal(info.status, 'failed');
  assert.equal(kieFailedMessage('failed'), kieFailedMessage('FAILED'));
}

// 17. callback sem áudio ainda (ex.: callbackType text) é só um ack — nem sucesso nem falha
{
  const info = parseKieCallback({ code: 200, data: { task_id: TASK, callbackType: 'text' } });
  assert.equal(info.status, 'pending', `esperava pending, veio ${info.status}`);
  assert.equal(info.audioUrl, null);
}

// 18. extração de JSON: prosa, cercas de código e chaves dentro de strings
{
  const prose = `Claro! Aqui está:\n\`\`\`json\n{"optimizedLyrics":"[Chorus]\\nSó você","tips":["ok"]}\n\`\`\``;
  const parsed = extractJsonObject(prose);
  assert.equal(parsed?.optimizedLyrics, '[Chorus]\nSó você', `prosa/cerca não extraída: ${JSON.stringify(parsed)}`);

  const inline = extractJsonObject('Sure thing: {"lyrics":"tem {chaves} na string"} — done');
  assert.equal(inline?.lyrics, 'tem {chaves} na string');

  assert.equal(extractJsonObject('Here is a nice song for you, no json at all.'), null);
}

// 19. integração: sem chave HMAC configurada o endpoint responde 503 (fail-closed)
{
  delete process.env.KIE_WEBHOOK_HMAC_KEY;
  delete process.env.WEBHOOK_HMAC_KEY;
  const express = (await import('express')).default;
  const { default: aiMusicRouter } = await import('./src/routes/ai-music.js');
  const app = express();
  app.use(express.json());
  app.use('/api', aiMusicRouter);

  const server = app.listen(0);
  const port = (server.address() as any).port;
  const HMAC_KEY = 'chave-definida-depois';
  const send = (secret: string, timestamp = Math.floor(Date.now() / 1000)) =>
    fetch(`http://127.0.0.1:${port}/api/webhooks/kie`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-webhook-timestamp': String(timestamp),
        'x-webhook-signature': sign(TASK, timestamp, secret),
      },
      body: JSON.stringify({ data: { task_id: TASK } }),
    }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

  const noKey = await send(SECRET);
  assert.equal(noKey.status, 503, `sem chave deveria ser 503, veio ${noKey.status}`);

  process.env.KIE_WEBHOOK_HMAC_KEY = HMAC_KEY;
  // assinatura correta + banco de teste inacessível → handler falha e libera o replay
  const failed = await send(HMAC_KEY);
  assert.equal(failed.status, 500, `esperava 500 (DB de teste indisponível), veio ${failed.status}: ${JSON.stringify(failed.body)}`);
  const retry = await send(HMAC_KEY, Math.floor(Date.now() / 1000) + 1);
  assert.equal(retry.status, 500, 'reenvio após 500 não pode ser bloqueado como replay');
  const wrongKey = await send(SECRET, Math.floor(Date.now() / 1000) + 2);
  assert.equal(wrongKey.status, 401, 'assinatura com a chave errada deve cair em 401');
  delete process.env.KIE_WEBHOOK_HMAC_KEY;

  await new Promise<void>((resolve) => server.close(() => resolve()));
}

// 20. modo cover: payload sai no formato ai-music-api/upload-and-cover-audio
{
  const cover = buildKieInput(
    {
      prompt: 'violão de aço e sanfona',
      lyrics: '[Refrão]\nSua melodia na minha voz',
      voice: 'Masculina',
      genre: 'Sertanejo',
      mood: 'Romântico',
      title: 'Minha Demo Cover',
      coverAudioUrl: 'https://tempfile.redpandaai.co/kieai/1/referencia.mp3',
      audioWeight: 0.7,
      styleWeight: 1.4,
    },
    'V6'
  );
  assert.equal(kieTaskModelFor({ prompt: '', lyrics: '', coverAudioUrl: 'https://x/a.mp3' }), 'ai-music-api/upload-and-cover-audio');
  assert.equal(cover.upload_url, 'https://tempfile.redpandaai.co/kieai/1/referencia.mp3');
  assert.equal(cover.model, 'V6');
  assert.equal(cover.instrumental, false);
  assert.equal(cover.custom_mode, undefined, 'cover não usa custom_mode');
  assert.equal(cover.duration, 90, 'duration sai da letra (5 palavras → piso de 90s), nunca mais 60 fixo');
  assert.equal(cover.audio_weight, 0.7);
  assert.equal(cover.style_weight, 1, 'peso acima de 1 é limitado');
  assert.equal(cover.vocal_gender, 'm');
  assert.match(String(cover.lyrics), /Sua melodia/);
}

// 21. cover sem letra mantém a referência conduzindo a faixa; instrumental não manda letra/vocal
{
  const noLyrics = buildKieInput(
    { prompt: 'arranjo acústico', lyrics: '', voice: 'Feminina', title: 'Demo', coverAudioUrl: 'https://tempfile.redpandaai.co/kieai/1/a.mp3' },
    'V6'
  );
  assert.equal(noLyrics.lyrics, undefined, 'cover sem letra não deve enviar lyrics');
  assert.equal(noLyrics.prompt, undefined, 'instruções do artista não viram letra na cover');
  assert.equal(noLyrics.vocal_gender, 'f');

  const instrumental = buildKieInput(
    { prompt: '', lyrics: '[Chorus]\nabc', voice: 'Instrumental', title: 'Demo', coverAudioUrl: 'https://tempfile.redpandaai.co/kieai/1/a.mp3' },
    'V6'
  );
  assert.equal(instrumental.instrumental, true);
  assert.equal(instrumental.lyrics, undefined, 'instrumental não leva lyrics');
  assert.equal(instrumental.vocal_gender, undefined, 'instrumental não leva vocal_gender');
}

// 22. sem áudio de referência segue na tarefa de geração do zero
{
  assert.equal(kieTaskModelFor({ prompt: 'x', lyrics: 'y' }), 'ai-music-api/generate');
  const hit = buildKieInput({ prompt: 'x', lyrics: '[Verse]\nabc', voice: 'Masculina', title: 'Hit' }, 'V6');
  assert.equal(hit.custom_mode, true);
  assert.equal(hit.upload_url, undefined);
}

// 23. modo estender: payload sai no formato ai-music-api/upload-and-extend-audio
{
  const ext = buildKieInput(
    {
      prompt: 'violão de aço',
      lyrics: '[Refrão]\nE a música continua',
      voice: 'Masculina',
      genre: 'Sertanejo',
      mood: 'Romântico',
      title: `${'Meu hit para estender '.repeat(6)}`,
      extendAudioUrl: 'https://tempfile.redpandaai.co/kieai/1/hit.mp3',
      continueAt: 47.56,
      audioWeight: 0.8,
      styleWeight: 0.35,
    },
    'V6'
  );
  assert.equal(kieTaskModelFor({ prompt: '', lyrics: '', extendAudioUrl: 'https://x/a.mp3' }), 'ai-music-api/upload-and-extend-audio');
  assert.equal(ext.upload_url, 'https://tempfile.redpandaai.co/kieai/1/hit.mp3');
  assert.equal(ext.model, 'V6');
  assert.equal(ext.instrumental, false);
  assert.equal(ext.continue_at, 47.6, 'continue_at com 1 casa decimal');
  assert.equal(ext.custom_mode, undefined, 'estender não aceita custom_mode');
  assert.equal(ext.duration, undefined, 'estender nasce do áudio fonte e não envia duration');
  assert.equal(String(ext.title).length, 100, 'título da extensão cortado em 100 caracteres');
  assert.equal(ext.audio_weight, 0.8);
  assert.equal(ext.style_weight, 0.35);
  assert.match(String(ext.lyrics), /continua/);
}

// 24. estender sem letra mantém o áudio conduzindo; instrumental não manda letra/vocal
{
  const noLyrics = buildKieInput(
    { prompt: 'arranjo acústico', lyrics: '', voice: 'Feminina', title: 'Demo', extendAudioUrl: 'https://x/a.mp3', continueAt: 12 },
    'V6'
  );
  assert.equal(noLyrics.lyrics, undefined, 'extensão sem letra não deve enviar lyrics');
  assert.equal(noLyrics.prompt, undefined, 'instruções do artista não viram letra na extensão');
  assert.equal(noLyrics.vocal_gender, 'f');

  const instrumental = buildKieInput(
    { prompt: '', lyrics: '[Chorus]\nabc', voice: 'Instrumental', title: 'Demo', extendAudioUrl: 'https://x/a.mp3', continueAt: 12 },
    'V6'
  );
  assert.equal(instrumental.instrumental, true);
  assert.equal(instrumental.lyrics, undefined, 'instrumental não leva lyrics');
  assert.equal(instrumental.vocal_gender, undefined, 'instrumental não leva vocal_gender');
}

// 25. duração sai da letra (a antiga 60s fixa cortava a música no meio)
{
  assert.equal(estimateSongSeconds(''), 90, 'piso de 90s sem letra');
  assert.equal(estimateSongSeconds('[Verse]\nabc def'), 90, 'letra curta também no piso');
  assert.equal(
    estimateSongSeconds(Array.from({ length: 150 }, (_, i) => `palavra${i}`).join(' ')),
    180,
    '150 palavras cabem em 3 minutos'
  );
  assert.equal(
    estimateSongSeconds(Array.from({ length: 900 }, () => 'x').join(' ')),
    360,
    'teto de 360s (limite do kie.ai)'
  );
  // duration só existe nos modelos V6
  assert.equal(
    buildKieInput({ prompt: 'x', lyrics: '[Verse]\nabc', voice: 'Masculina', title: 'Hit' }, 'V4').duration,
    undefined,
    'modelos antigos não aceitam duration'
  );
}

console.log('✅ kie-webhook.test: 28 cenários passaram');
