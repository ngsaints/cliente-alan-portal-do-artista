-- Migration: 033_portal_tv_episodes.sql
-- Tabela para os episódios, vídeos, tutoriais e notícias da TVzinha Retrô do Portal
CREATE TABLE IF NOT EXISTS portal_tv_episodes (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'video',
  video_url TEXT,
  content_text TEXT,
  cta_text TEXT,
  cta_url TEXT,
  thumbnail_url TEXT,
  badge TEXT DEFAULT 'Novidade',
  active BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_tv_episodes_active_order ON portal_tv_episodes(active, "order");
