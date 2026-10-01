-- Migration: 031_demos_cover_audio.sql
-- Modo cover no Estúdio Vivi: guarda o áudio de referência usado na geração (kie.ai / Suno)
ALTER TABLE ai_music_demos ADD COLUMN IF NOT EXISTS cover_audio_url TEXT;
