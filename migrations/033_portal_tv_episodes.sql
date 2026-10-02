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

INSERT INTO portal_tv_episodes (title, description, type, content_text, cta_text, cta_url, badge, active, "order")
SELECT 'Bem-vindo à TV do Portal', 'Assista aos tutoriais e fique por dentro das novidades da plataforma.', 'text', 'Bem-vindo ao canal oficial de novidades do Portal do Artista! Aqui você confere dicas exclusivas, novidades e tutoriais para turbinar sua carreira musical.', 'Ver Meu Painel', '/artista/dashboard', 'Novidades', true, 1
WHERE NOT EXISTS (SELECT 1 FROM portal_tv_episodes);

