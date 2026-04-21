-- Migration: Add portal settings
-- Run this on your PostgreSQL VPS database

-- Insert default portal settings
INSERT INTO settings (key, value) VALUES
  ('artists_section_title', 'Nossos Artistas'),
  ('artists_section_subtitle', 'Descubra e acompanhe artistas independentes de todo o Brasil')
ON CONFLICT (key) DO NOTHING;
