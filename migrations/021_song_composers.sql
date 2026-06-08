-- Migration: Composição com percentual (múltiplos compositores por música)
CREATE TABLE IF NOT EXISTS song_composers (
  id SERIAL PRIMARY KEY,
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  percentual NUMERIC NOT NULL DEFAULT '0',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_song_composers_song ON song_composers(song_id);
