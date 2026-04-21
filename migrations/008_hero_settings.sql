-- Migration: Add hero section settings
-- Run this on your PostgreSQL VPS database

-- Insert hero section settings
INSERT INTO settings (key, value) VALUES
  ('hero_title', NULL),
  ('hero_subtitle', NULL),
  ('hero_cta', NULL)
ON CONFLICT (key) DO NOTHING;