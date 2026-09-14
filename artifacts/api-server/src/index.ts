import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });


import { initLogger } from "./lib/logger.js";
initLogger();

import app from "./app";
import { startReactivation } from './lib/reactivation';
import { pool } from "@workspace/db";

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
  ensureDbSchema();
  startReactivation();
  console.log(`Server listening on port ${port}`);
});
