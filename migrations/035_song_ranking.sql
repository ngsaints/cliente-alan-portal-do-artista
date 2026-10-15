-- Qualified plays, replay protection and listener deduplication
CREATE TABLE IF NOT EXISTS song_play_receipts (id TEXT PRIMARY KEY,received_at BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS song_play_events (id TEXT PRIMARY KEY,song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,listener_key TEXT NOT NULL,played_at BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS song_play_events_recent ON song_play_events(played_at,song_id);
CREATE TABLE IF NOT EXISTS song_play_listeners (song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,listener_key TEXT NOT NULL,last_counted_at BIGINT NOT NULL,PRIMARY KEY(song_id,listener_key));
