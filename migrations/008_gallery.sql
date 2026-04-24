-- Migration: 008_gallery.sql
-- Create galleries and gallery_photos tables

CREATE TABLE IF NOT EXISTS galleries (
  id SERIAL PRIMARY KEY,
  artista_id TEXT NOT NULL,
  titulo TEXT DEFAULT 'Galeria',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gallery_photos (
  id SERIAL PRIMARY KEY,
  gallery_id INTEGER NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  foto_url TEXT NOT NULL,
  legenda TEXT,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_gallery_artista ON galleries(artista_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_gallery ON gallery_photos(gallery_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_ordem ON gallery_photos(ordem);

-- Create default gallery for artist 1 (Daniel)
INSERT INTO galleries (artista_id, titulo) VALUES ('1', 'Galeria de Fotos') ON CONFLICT DO NOTHING;
