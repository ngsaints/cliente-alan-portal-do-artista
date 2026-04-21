-- Migration: Add cities table
-- Run this on your PostgreSQL VPS database

-- Table: cities (cidades para localização padronizada)
CREATE TABLE IF NOT EXISTS cities (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  estado TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default cities
INSERT INTO cities (nome, estado, ordem) VALUES
  ('São Paulo', 'SP', 1),
  ('Rio de Janeiro', 'RJ', 2),
  ('Belo Horizonte', 'MG', 3),
  ('Salvador', 'BA', 4),
  ('Curitiba', 'PR', 5),
  ('Fortaleza', 'CE', 6),
  ('Brasília', 'DF', 7),
  ('Porto Alegre', 'RS', 8),
  ('Recife', 'PE', 9),
  ('Goiânia', 'GO', 10),
  ('Manaus', 'AM', 11),
  ('Belém', 'PA', 12),
  ('Guarulhos', 'SP', 13),
  ('Campinas', 'SP', 14),
  ('São Luís', 'MA', 15),
  ('Maceió', 'AL', 16),
  ('Duque de Caxias', 'RJ', 17),
  ('Natal', 'RN', 18),
  ('Campo Grande', 'MS', 19),
  ('Teresina', 'PI', 20)
ON CONFLICT (nome) DO NOTHING;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_cities_ativo_ordem ON cities(ativo, ordem);
