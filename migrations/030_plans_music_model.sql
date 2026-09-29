-- Migration: 030_plans_music_model.sql
-- Modelo de geração de música por plano (ex.: start = modelo barato, premium = melhor)
-- NULL = usa o modelo global replicate_music_model

ALTER TABLE plans ADD COLUMN IF NOT EXISTS replicate_model TEXT;
