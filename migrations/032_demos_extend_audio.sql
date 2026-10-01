-- Migration: 032_demos_extend_audio.sql
-- Modo Estender no Estúdio Vivi: guarda o áudio fonte e o ponto de continuação
-- usados na geração (kie.ai / Suno upload-and-extend-audio)
ALTER TABLE ai_music_demos ADD COLUMN IF NOT EXISTS extend_audio_url TEXT;
ALTER TABLE ai_music_demos ADD COLUMN IF NOT EXISTS continue_at NUMERIC;
