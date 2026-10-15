import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import express from "express";
import {
  PLAY_DDL,
  recordPlayInTransaction,
  rankSongs,
  listenerKey,
  makeListenToken,
  verifyListenToken,
  RANKING_WINDOW_MS,
} from "./src/lib/song-ranking";
import { createRankingRouter } from "./src/routes/song-ranking";
const database = new DatabaseSync(":memory:");
database.exec(
  "PRAGMA foreign_keys=ON; CREATE TABLE songs(id INTEGER PRIMARY KEY,is_private INTEGER,mp3_path TEXT,plays NUMERIC); INSERT INTO songs VALUES(1,0,'audio.mp3',0),(2,0,'other.mp3',999),(3,1,'private.mp3',0),(4,0,NULL,0);",
);
for (const sql of PLAY_DDL) database.exec(sql);
const q = async (sql: string, args: unknown[] = []) => {
  const params: any[] = [];
  const s = database.prepare(
    sql.replace(/\$(\d+)/g, (_, n) => {
      params.push(args[Number(n) - 1]);
      return "?";
    }),
  );
  if (s.columns().length) return s.all(...params);
  s.run(...params);
  return [];
};
const record = async (id: number, key: string, nonce: string, now: number) => {
  database.exec("BEGIN");
  try {
    const result = await recordPlayInTransaction(q, id, key, nonce, now);
    database.exec("COMMIT");
    return result;
  } catch (e) {
    database.exec("ROLLBACK");
    throw e;
  }
};
const secret = "test-secret",
  now = Date.now(),
  key = listenerKey("artist:1", secret),
  token = makeListenToken(1, key, secret, now - 31_000);
assert.ok(verifyListenToken(token, 1, key, secret, now));
assert.equal(verifyListenToken(token, 2, key, secret, now), null);
assert.equal(
  verifyListenToken(token, 1, listenerKey("artist:2", secret), secret, now),
  null,
);
assert.equal(verifyListenToken(token + "bad", 1, key, secret, now), null);
assert.equal(
  verifyListenToken(makeListenToken(1, key, secret, now), 1, key, secret, now),
  null,
);
assert.equal(
  verifyListenToken(token, 1, key, secret, now + 3 * 60 * 60_000),
  null,
);
assert.equal((await record(1, key, "a", now)).counted, true);
assert.equal(
  (await record(1, key, "a", now + 31 * 60_000)).counted,
  false,
  "Used ticket cannot be replayed after cooldown",
);
assert.equal(
  (await record(1, key, "b", now + 1000)).counted,
  false,
  "Different tickets must share the same listener cooldown",
);
assert.equal(
  (await record(1, key, "b", now + 31 * 60_000)).counted,
  false,
  "Rejected duplicate-listen ticket is consumed too",
);
assert.equal((await record(1, key, "c", now + 31 * 60_000)).counted, true);
assert.equal((await record(3, key, "private", now)).found, false);
assert.equal((await record(4, key, "noaudio", now)).found, false);
assert.equal((await q("SELECT plays FROM songs WHERE id=1"))[0].plays, 2);
const songs = [
  { id: 1, createdAt: "2026-10-01", plays: 2 },
  { id: 2, createdAt: "2026-10-13", plays: 999 },
];
assert.equal(
  rankSongs(songs, [{ song_id: 1, count: 2, last_play: now }])[0].id,
  1,
  "Recent listening outranks inflated lifetime totals",
);
assert.equal(
  rankSongs(songs, [])[0].id,
  2,
  "No-data fallback is deterministic recent publication",
);
await record(
  2,
  "older-listener",
  "outside-window",
  now - RANKING_WINDOW_MS - 1,
);
process.env.PLAYBACK_SIGNING_SECRET = secret;
const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.session = { artistId: Number(req.headers["x-artist"] || 1) } as any;
  next();
});
app.use(
  createRankingRouter({
    initialize: async () => {},
    eligible: async (id) => id === 1 || id === 2,
    recent: async () =>
      q(
        "SELECT song_id,COUNT(*) AS count,MAX(played_at) AS last_play FROM song_play_events WHERE played_at >= $1 GROUP BY song_id",
        [now - RANKING_WINDOW_MS],
      ),
    record,
    catalog: async () => ({
      songs: [
        {
          ...songs[0],
          isPrivate: false,
          mp3Path: "audio.mp3",
          titulo: "Em alta",
        },
        {
          ...songs[1],
          isPrivate: false,
          mp3Path: "other.mp3",
          titulo: "Antiga",
        },
      ] as any,
      artists: [],
    }),
  }),
);
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${(server.address() as any).port}`;
try {
  const listen = await fetch(base + "/songs/1/listen", { method: "POST" });
  assert.equal(listen.status, 200);
  const ticket = await listen.json();
  assert.ok(ticket.token);
  const post = (body: any, artist = 1) =>
    fetch(base + "/songs/1/play", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-artist": String(artist),
      },
      body: JSON.stringify(body),
    });
  assert.equal((await post({})).status, 400);
  assert.equal((await post({ token: ticket.token })).status, 400);
  assert.equal((await post({ token }, 2)).status, 400);
  const ranking = await (await fetch(base + "/songs/trending")).json();
  assert.equal(ranking[0].id, 1);
  assert.equal(ranking[0].weeklyPlays, 2);
  assert.equal(ranking[1].weeklyPlays, 0);
  console.log(
    "PASS: real SQL event ledger, token validation, replay protection, cooldown, private/local exclusion, rolling ranking, stable fallback and API validation",
  );
} finally {
  server.close();
  database.close();
}
