import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });


import { initLogger } from "./lib/logger.js";
initLogger();

import app from "./app";
import { startReactivation } from './lib/reactivation';
import { startSubscriptionExpiry } from './lib/subscriptions';
import { startMusicDemoSync } from './lib/music-demo-sync';
import { pool, db, appSettingsTable } from "@workspace/db";

async function syncAppSettingsToEnv() {
  if (!db) return;
  try {
    const rows = await db.select().from(appSettingsTable);
    for (const r of rows) {
      if (!r.value) continue;
      const val = r.value.trim();
      if (r.key === "kie_api_key") process.env.KIE_API_KEY = val;
      if (r.key === "kie_webhook_hmac_key") process.env.KIE_WEBHOOK_HMAC_KEY = val;
      if (r.key === "openrouter_api_key") process.env.OPENROUTER_API_KEY = val;
      if (r.key === "replicate_api_key") process.env.REPLICATE_API_TOKEN = val;
      if (r.key === "asaas_api_key") process.env.ASAAS_API_KEY = val;
      if (r.key === "resend_api_key") process.env.RESEND_API_KEY = val;
    }
    console.log("✅ [Settings] Chaves cadastradas no painel sincronizadas com o ambiente da aplicação.");
  } catch (err: any) {
    console.warn("⚠️ [Settings] Aviso ao sincronizar configurações do painel:", err.message || err);
  }
}

async function ensureDbSchema() {
  if (!pool) return;
  try {
    await pool.query(`
      ALTER TABLE artists ADD COLUMN IF NOT EXISTS ai_music_queries_count INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE artists ADD COLUMN IF NOT EXISTS ai_music_extra_credits INTEGER NOT NULL DEFAULT 0;
      CREATE TABLE IF NOT EXISTS ai_music_demos (
        id SERIAL PRIMARY KEY,
        artista_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
        titulo TEXT NOT NULL,
        letra TEXT,
        estilo TEXT NOT NULL DEFAULT 'Sertanejo',
        voz TEXT NOT NULL DEFAULT 'Masculina',
        bpm INTEGER DEFAULT 120,
        clima TEXT,
        prompt TEXT,
        audio_url TEXT,
        prediction_id TEXT,
        status TEXT NOT NULL DEFAULT 'completed',
        error TEXT,
        duracao NUMERIC,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ai_music_demos_artista ON ai_music_demos(artista_id);
      ALTER TABLE plans ADD COLUMN IF NOT EXISTS music_credits_limit INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE plans ADD COLUMN IF NOT EXISTS replicate_model TEXT;
      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS overdue_at TIMESTAMPTZ;
      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS overdue_notified_at TIMESTAMPTZ;
    `);
    console.log("✅ [DB] Colunas e tabelas de IA verificadas com sucesso.");
  } catch (err: any) {
    console.warn("⚠️ [DB] Aviso ao verificar colunas (continuando):", err.message || err);
  }
}

const rawPort = process.env["PORT"] || (typeof (globalThis as any).Deno !== "undefined" ? "8000" : "3000");
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  // Garante as colunas e sincroniza chaves do painel antes de subir os jobs.
  void ensureDbSchema().then(async () => {
    await syncAppSettingsToEnv();
    startReactivation();
    startSubscriptionExpiry();
    // Garante que hits do kie.ai fechem mesmo sem callback (HMAC desligado) ou com a aba do artista fechada.
    startMusicDemoSync();
  });
});
