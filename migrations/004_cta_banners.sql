-- Migration: CTA Banners
-- Run this on your PostgreSQL VPS database

-- Table: cta_banners (banners de chamada para ação)
CREATE TABLE IF NOT EXISTS cta_banners (
  id SERIAL PRIMARY KEY,
  texto TEXT NOT NULL,
  cor_fundo TEXT NOT NULL DEFAULT '#1a1a2e',
  cor_texto TEXT NOT NULL DEFAULT '#ffffff',
  botao_texto TEXT,
  botao_link TEXT,
  imagem_fundo_url TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  intervalo_segundos INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default banners
INSERT INTO cta_banners (texto, cor_fundo, cor_texto, botao_texto, botao_link, ordem)
VALUES
  ('Crie seu portal de artista em minutos', '#1a1a2e', '#ffffff', 'Criar Meu Portal', '/artista/cadastro', 1),
  ('Monte e compartilhe seu catálogo musical', '#2d1b4e', '#ffffff', 'Começar Grátis', '/artista/cadastro', 2),
  ('Sua plataforma musical personalizada', '#1a2e1a', '#ffffff', 'Saiba Mais', '/artista/cadastro', 3),
  ('Seu site artístico, do seu jeito', '#2e1a1a', '#ffffff', 'Criar Perfil', '/artista/cadastro', 4)
ON CONFLICT DO NOTHING;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_cta_banners_ativo_ordem ON cta_banners(ativo, ordem);
