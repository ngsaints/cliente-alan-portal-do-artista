import assert from 'node:assert/strict';
import express from 'express';

process.env.DATABASE_URL = 'postgres://test:test@127.0.0.1:1/test';
const { pool } = await import('@workspace/db');
const queries: { sql: string; values: unknown[] }[] = [];
let fail = false;
(pool as any).query = async (sql: string, values: unknown[] = []) => {
  queries.push({ sql, values });
  if (fail) throw new Error('simulated database failure');
  return { rows: sql.startsWith('SELECT id') ? [{ id: 42 }] : [], rowCount: 1 };
};
const { default: router } = await import('./src/routes/engagement');
const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.session = { artistId: req.headers['x-test-artist'] ? Number(req.headers['x-test-artist']) : undefined,
    logado: req.headers['x-test-admin'] === 'yes' } as any;
  next();
});
app.use(router);
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const address = server.address() as { port: number };
const base = `http://127.0.0.1:${address.port}`;
async function post(body: unknown, artist?: number) {
  return fetch(`${base}/engagement`, { method: 'POST', headers: {
    'Content-Type': 'application/json', ...(artist ? { 'x-test-artist': String(artist) } : {}),
  }, body: JSON.stringify(body) });
}
try {
  assert.equal((await fetch(`${base}/admin/engagement`)).status, 401);
  assert.equal((await post({ event: 'share', artistId: 99 })).status, 401);
  assert.equal(queries.length, 0, 'Unauthorized calls must not query the database');
  assert.equal((await post({ event: 'invalid' }, 7)).status, 400);
  assert.equal((await post({ event: 'view', slug: {} })).status, 400);
  assert.equal((await post({ event: 'share', artistId: 99 }, 7)).status, 204);
  assert.deepEqual(queries.at(-1)?.values, [7, 'share'], 'Ignore client-provided ownership');
  assert.equal((await post({ event: 'activity' }, 7)).status, 204);
  assert.deepEqual(queries.at(-1)?.values, [7, 'activity']);
  const before = queries.length;
  assert.equal((await post({ event: 'view', slug: 'artist' }, 42)).status, 204);
  assert.equal(queries.length, before + 1, 'Do not count own profile view');
  assert.equal((await post({ event: 'view', slug: 'artist' })).status, 204);
  assert.deepEqual(queries.at(-1)?.values, [42, 'view']);
  assert.equal((await fetch(`${base}/admin/engagement`, { headers: { 'x-test-admin': 'yes' } })).status, 200);
  fail = true;
  assert.equal((await post({ event: 'activity' }, 7)).status, 500);
  process.env.REACTIVATION_EMAILS_ENABLED = 'false';
  const beforeDisabled = queries.length;
  const { runReactivation } = await import('./src/lib/reactivation');
  await runReactivation();
  assert.equal(queries.length, beforeDisabled, 'Disabled email worker must perform no database work or send');
  console.log('PASS: authorization, validation, ownership, activity, views and database failure handling');
} finally {
  server.close();
  await pool.end();
}
