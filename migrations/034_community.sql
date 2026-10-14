-- Community chat, presence and moderation
CREATE TABLE IF NOT EXISTS community_messages (id TEXT PRIMARY KEY, room TEXT NOT NULL, artist_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE, body TEXT NOT NULL, reply_to TEXT, created_at BIGINT NOT NULL, removed_at BIGINT);
CREATE INDEX IF NOT EXISTS community_messages_room_date ON community_messages(room, created_at);
CREATE TABLE IF NOT EXISTS community_presence (room TEXT NOT NULL, artist_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE, last_seen BIGINT NOT NULL, PRIMARY KEY(room, artist_id));
CREATE TABLE IF NOT EXISTS community_reports (id TEXT PRIMARY KEY, message_id TEXT NOT NULL REFERENCES community_messages(id) ON DELETE CASCADE, artist_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE, reason TEXT NOT NULL, created_at BIGINT NOT NULL, reviewed_at BIGINT, UNIQUE(message_id, artist_id));
CREATE TABLE IF NOT EXISTS community_bans (artist_id INTEGER PRIMARY KEY REFERENCES artists(id) ON DELETE CASCADE, reason TEXT NOT NULL, created_at BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS community_blocks (artist_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE, blocked_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE, PRIMARY KEY(artist_id, blocked_id));
