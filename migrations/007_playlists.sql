-- Migration: 007_playlists.sql
-- Create playlists and playlist_songs tables

CREATE TABLE IF NOT EXISTS playlists (
  id SERIAL PRIMARY KEY,
  artista_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  capa_url TEXT,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playlist_songs (
  id SERIAL PRIMARY KEY,
  playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_playlists_artista ON playlists(artista_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist ON playlist_songs(playlist_id);

-- Seed initial demo playlist for Alan Ribeiro (id=2)
INSERT INTO playlists (artista_id, nome, descricao, ordem) 
VALUES (2, 'Meus Favoritos', 'Músicas que eu mais gosto', 1)
ON CONFLICT DO NOTHING;
