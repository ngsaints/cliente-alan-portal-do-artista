-- Migration: Portal do Artista - Likes e Plays
-- Run this on your PostgreSQL VPS database

ALTER TABLE songs ADD COLUMN IF NOT EXISTS likes NUMERIC NOT NULL DEFAULT '0';
ALTER TABLE songs ADD COLUMN IF NOT EXISTS plays NUMERIC NOT NULL DEFAULT '0';

CREATE INDEX IF NOT EXISTS idx_songs_likes ON songs(likes DESC);
CREATE INDEX IF NOT EXISTS idx_songs_plays ON songs(plays DESC);