-- Migration: Portal do Artista - Novas Tabelas
-- Run this on your PostgreSQL VPS database

-- Table: artists (artistas/usuários)
CREATE TABLE IF NOT EXISTS artists (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password TEXT NOT NULL,
  profissao TEXT,
  contato TEXT,
  instagram TEXT,
  tiktok TEXT,
  spotify TEXT,
  capa_url TEXT,
  fonte TEXT DEFAULT 'Arial',
  cor TEXT DEFAULT '#ffffff',
  layout TEXT,
  player TEXT DEFAULT 'Padrão',
  plano TEXT NOT NULL DEFAULT 'free',
  plano_ativo BOOLEAN NOT NULL DEFAULT true,
  musica_count NUMERIC NOT NULL DEFAULT '0',
  limite_musicas NUMERIC NOT NULL DEFAULT '2',
  personalizacao_percent NUMERIC NOT NULL DEFAULT '10',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Table: plans (planos)
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  preco NUMERIC NOT NULL,
  limite_musicas NUMERIC NOT NULL,
  personalizacao_percent NUMERIC NOT NULL,
  descricao TEXT,
  frase_efeito TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Table: interests (interesses/notificações)
CREATE TABLE IF NOT EXISTS interests (
  id SERIAL PRIMARY KEY,
  song_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  mensagem TEXT,
  contratar_show BOOLEAN NOT NULL DEFAULT false,
  reservar_musica BOOLEAN NOT NULL DEFAULT false,
  agendar_reuniao BOOLEAN NOT NULL DEFAULT false,
  lido BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default plans
INSERT INTO plans (nome, label, preco, limite_musicas, personalizacao_percent, descricao, frase_efeito)
VALUES
  ('free', 'Free Experimental', 0, 2, 10, '2 músicas para testar a plataforma', 'Experimente e veja seu trabalho ganhar destaque!'),
  ('basico', 'Básico', 20, 20, 20, '20 músicas, 20% de personalização', 'Comece a profissionalizar seu trabalho agora!'),
  ('intermediario', 'Intermediário', 50, 70, 50, '70 músicas, 50% de personalização', 'Impulsione sua carreira com visibilidade profissional!'),
  ('pro', 'Pro', 70, 100, 70, '100 músicas, 70% de personalização', 'Seu perfil profissional com máxima qualidade!'),
  ('premium', 'Premium', 100, 200, 100, '200 músicas, 100% de personalização', 'Transforme seu perfil em portfólio profissional completo!')
ON CONFLICT (nome) DO NOTHING;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_artists_email ON artists(email);
CREATE INDEX IF NOT EXISTS idx_interests_song_id ON interests(song_id);
CREATE INDEX IF NOT EXISTS idx_interests_lido ON interests(lido);
CREATE INDEX IF NOT EXISTS idx_interests_created_at ON interests(created_at DESC);
