-- Migration: CRM - Portal do Artista
-- Novas tabelas para gestão de carreira

-- ============================================================
-- 1. CAMPOS EXTRAS NA TABELA SONGS (letra, edição, distribuição, associação)
-- ============================================================
ALTER TABLE songs ADD COLUMN IF NOT EXISTS letra TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS edicao TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS distribuicao TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS associacao TEXT;

-- ============================================================
-- 2. AUDIÇÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS audicoes (
  id SERIAL PRIMARY KEY,
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  artista_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  artista_nome TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'em_analise',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. LIBERAÇÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS liberacoes (
  id SERIAL PRIMARY KEY,
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  artista_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  artista_nome TEXT NOT NULL,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_liberacao DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. CONTATOS
-- ============================================================
CREATE TABLE IF NOT EXISTS contatos (
  id SERIAL PRIMARY KEY,
  artista_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Outro',
  telefone TEXT,
  email TEXT,
  anotacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. CUSTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS custos (
  id SERIAL PRIMARY KEY,
  artista_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT '0',
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. RECEITAS
-- ============================================================
CREATE TABLE IF NOT EXISTS receitas (
  id SERIAL PRIMARY KEY,
  artista_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT '0',
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. EVENTOS (CALENDÁRIO)
-- ============================================================
CREATE TABLE IF NOT EXISTS eventos (
  id SERIAL PRIMARY KEY,
  artista_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data DATE NOT NULL,
  horario_inicial TEXT,
  horario_final TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. AJUDA / SUPORTE
-- ============================================================
CREATE TABLE IF NOT EXISTS ajuda (
  id SERIAL PRIMARY KEY,
  artista_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lido BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audicoes_artista ON audicoes(artista_id);
CREATE INDEX IF NOT EXISTS idx_liberacoes_artista ON liberacoes(artista_id);
CREATE INDEX IF NOT EXISTS idx_contatos_artista ON contatos(artista_id);
CREATE INDEX IF NOT EXISTS idx_custos_artista ON custos(artista_id);
CREATE INDEX IF NOT EXISTS idx_receitas_artista ON receitas(artista_id);
CREATE INDEX IF NOT EXISTS idx_eventos_artista ON eventos(artista_id);
CREATE INDEX IF NOT EXISTS idx_eventos_data ON eventos(data);
CREATE INDEX IF NOT EXISTS idx_ajuda_artista ON ajuda(artista_id);
