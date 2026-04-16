-- Migration: Portal do Artista - Novos Campos de Mídia
-- Run this on your PostgreSQL VPS database

-- Adicionar campos para suporte a vídeo (YouTube) e VIP individualizado
ALTER TABLE songs ADD COLUMN IF NOT EXISTS youtube_url TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS tipo_midia TEXT NOT NULL DEFAULT 'audio';
ALTER TABLE songs ADD COLUMN IF NOT EXISTS vip_code TEXT;

-- Index para performance em filtros
CREATE INDEX IF NOT EXISTS idx_songs_tipo_midia ON songs(tipo_midia);
CREATE INDEX IF NOT EXISTS idx_songs_is_vip ON songs(is_vip);
