import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.DATABASE_URL = 'postgres://test:test@127.0.0.1:1/test';
const { verifyKieWebhookSignature, releaseKieWebhookReplay } = await import('./src/lib/kie-music.js');

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

// 12. integração: sem chave HMAC configurada o endpoint responde 503 (fail-closed)
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

console.log('✅ kie-webhook.test: 12 cenários passaram');
