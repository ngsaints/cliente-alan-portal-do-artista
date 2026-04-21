-- Track likes by IP to prevent duplicate likes per session/IP
CREATE TABLE IF NOT EXISTS song_likes (
  id SERIAL PRIMARY KEY,
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(song_id, ip_address)
);

CREATE INDEX IF NOT EXISTS idx_song_likes_song_id ON song_likes(song_id);
CREATE INDEX IF NOT EXISTS idx_song_likes_ip ON song_likes(ip_address);
