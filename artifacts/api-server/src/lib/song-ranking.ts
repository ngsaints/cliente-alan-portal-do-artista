import { pool, getTursoClient } from "@workspace/db";
import { communityQuery as query } from "./community-store";
import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";
export const MIN_LISTEN_MS = 30_000,
  PLAY_COOLDOWN_MS = 30 * 60_000,
  RANKING_WINDOW_MS = 7 * 24 * 60 * 60_000;
export const PLAY_DDL = [
  `CREATE TABLE IF NOT EXISTS song_play_receipts (id TEXT PRIMARY KEY,received_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS song_play_events (id TEXT PRIMARY KEY,song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,listener_key TEXT NOT NULL,played_at BIGINT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS song_play_events_recent ON song_play_events(played_at,song_id)`,
  `CREATE TABLE IF NOT EXISTS song_play_listeners (song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,listener_key TEXT NOT NULL,last_counted_at BIGINT NOT NULL,PRIMARY KEY(song_id,listener_key))`,
];
let ready: Promise<void> | undefined;
export function ensurePlaySchema() {
  return (ready ||= (async () => {
    for (const sql of PLAY_DDL) await query(sql);
  })().catch((e) => {
    ready = undefined;
    throw e;
  }));
}
export function playbackSecret() {
  const key = process.env.PLAYBACK_SIGNING_SECRET || process.env.SESSION_SECRET;
  if (!key && process.env.NODE_ENV === "production")
    throw new Error("Configure SESSION_SECRET para registrar reproduções.");
  return key || "local-playback-development";
}
export function listenerKey(identity: string, secret: string) {
  return createHmac("sha256", secret).update(identity).digest("hex");
}
export function makeListenToken(
  songId: number,
  listener: string,
  secret: string,
  now = Date.now(),
) {
  const payload = Buffer.from(
    JSON.stringify({ songId, listener, issuedAt: now, nonce: randomUUID() }),
  ).toString("base64url");
  return (
    payload +
    "." +
    createHmac("sha256", secret).update(payload).digest("base64url")
  );
}
export function verifyListenToken(
  token: unknown,
  songId: number,
  listener: string,
  secret: string,
  now = Date.now(),
): { nonce: string } | null {
  try {
    if (typeof token !== "string" || token.length > 2000) return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const expected = createHmac("sha256", secret).update(parts[0]).digest();
    const signature = Buffer.from(parts[1], "base64url");
    if (
      signature.length !== expected.length ||
      !timingSafeEqual(signature, expected)
    )
      return null;
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    if (
      payload.songId !== songId ||
      payload.listener !== listener ||
      !Number.isFinite(payload.issuedAt) ||
      now - payload.issuedAt < MIN_LISTEN_MS ||
      now - payload.issuedAt > 2 * 60 * 60_000 ||
      typeof payload.nonce !== "string"
    )
      return null;
    return { nonce: payload.nonce };
  } catch {
    return null;
  }
}
export type PlayQuery = (sql: string, args?: unknown[]) => Promise<any[]>;
export async function recordPlayInTransaction(
  q: PlayQuery,
  id: number,
  listener: string,
  nonce: string,
  now: number,
) {
  const [song] = await q(
    "SELECT id,is_private,mp3_path FROM songs WHERE id=$1",
    [id],
  );
  if (!song || song.is_private || !song.mp3_path)
    return { found: false, counted: false };
  const receipt = await q(
    "INSERT INTO song_play_receipts(id,received_at) VALUES($1,$2) ON CONFLICT(id) DO NOTHING RETURNING id",
    [nonce, now],
  );
  if (!receipt.length) return { found: true, counted: false };
  const accepted = await q(
    `INSERT INTO song_play_listeners(song_id,listener_key,last_counted_at) VALUES($1,$2,$3) ON CONFLICT(song_id,listener_key) DO UPDATE SET last_counted_at=EXCLUDED.last_counted_at WHERE song_play_listeners.last_counted_at <= $4 RETURNING song_id`,
    [id, listener, now, now - PLAY_COOLDOWN_MS],
  );
  if (!accepted.length) return { found: true, counted: false };
  await q(
    "INSERT INTO song_play_events(id,song_id,listener_key,played_at) VALUES($1,$2,$3,$4)",
    [nonce, id, listener, now],
  );
  await q("UPDATE songs SET plays=COALESCE(plays,0)+1 WHERE id=$1", [id]);
  return { found: true, counted: true };
}
export async function recordQualifiedPlay(
  id: number,
  listener: string,
  nonce: string,
  now: number,
) {
  if (pool) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await recordPlayInTransaction(
        async (sql, args) => (await client.query(sql, args)).rows,
        id,
        listener,
        nonce,
        now,
      );
      await client.query("COMMIT");
      return result;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
  const transaction = await getTursoClient().transaction("write");
  try {
    const result = await recordPlayInTransaction(
      async (sql, args = []) => {
        const params: any[] = [];
        const converted = sql.replace(/\$(\d+)/g, (_, n) => {
          params.push(args[Number(n) - 1]);
          return "?";
        });
        return (await transaction.execute({ sql: converted, args: params }))
          .rows as any[];
      },
      id,
      listener,
      nonce,
      now,
    );
    await transaction.commit();
    return result;
  } catch (e) {
    await transaction.rollback();
    throw e;
  } finally {
    transaction.close();
  }
}
export function rankSongs<T extends { id: number; createdAt: unknown }>(
  songs: T[],
  events: { song_id: number; count: unknown; last_play: unknown }[],
) {
  const byId = new Map(events.map((e) => [Number(e.song_id), e]));
  return songs
    .map((song) => ({
      ...song,
      weeklyPlays: Number(byId.get(song.id)?.count || 0),
      lastPlay: Number(byId.get(song.id)?.last_play || 0),
    }))
    .sort(
      (a, b) =>
        b.weeklyPlays - a.weeklyPlays ||
        b.lastPlay - a.lastPlay ||
        new Date(String(b.createdAt)).getTime() -
          new Date(String(a.createdAt)).getTime() ||
        b.id - a.id,
    );
}
export async function recentPlays(now = Date.now()) {
  return query(
    "SELECT song_id,COUNT(*) AS count,MAX(played_at) AS last_play FROM song_play_events WHERE played_at >= $1 GROUP BY song_id",
    [now - RANKING_WINDOW_MS],
  );
}
export async function eligibleSong(id: number) {
  return (
    (
      await query(
        "SELECT id FROM songs WHERE id=$1 AND is_private=$2 AND mp3_path IS NOT NULL AND mp3_path<>$3",
        [id, false, ""],
      )
    ).length > 0
  );
}
