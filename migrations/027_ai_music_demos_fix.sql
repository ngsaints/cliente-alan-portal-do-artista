-- Fix Vivi Studio: colunas e tabela faltantes que quebravam /api/admin/stats e /api/ai/music/* (erro 42703 em 2026-09-13 20:22:27)
-- Origem: lib/db/src/schema/artists.ts:52 e lib/db/src/schema/aiMusicDemos.ts:5 (commit 98da1bf/d6d08cd) sem migration Postgres
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
