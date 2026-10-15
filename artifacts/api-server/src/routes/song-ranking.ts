import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { db, songsTable, artistsTable } from "@workspace/db";
import {
  ensurePlaySchema,
  eligibleSong,
  recentPlays,
  rankSongs,
  playbackSecret,
  listenerKey,
  makeListenToken,
  verifyListenToken,
  recordQualifiedPlay,
} from "../lib/song-ranking";
export function createRankingRouter(
  deps = {
    initialize: ensurePlaySchema,
    eligible: eligibleSong,
    recent: recentPlays,
    record: recordQualifiedPlay,
    catalog: async () => {
      const [songs, artists] = await Promise.all([
        db.select().from(songsTable),
        db.select().from(artistsTable),
      ]);
      return { songs, artists };
    },
  },
): IRouter {
  const router: IRouter = Router();
  const limit = rateLimit({
    windowMs: 60_000,
    limit: 60,
    message: { error: "Aguarde antes de registrar mais reproduções." },
  });
  const idOf = (value: unknown) => {
    if (typeof value !== "string" || !/^\d+$/.test(value)) return 0;
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 && id <= 2147483647 ? id : 0;
  };
  const who = (req: any, secret: string) =>
    listenerKey(
      req.session?.artistId ? `artist:${req.session.artistId}` : `ip:${req.ip}`,
      secret,
    );
  router.get("/songs/trending", async (_req, res) => {
    try {
      await deps.initialize();
      const [{ songs, artists }, events] = await Promise.all([
        deps.catalog(),
        deps.recent(),
      ]);
      const artistMap = new Map(artists.map((a) => [String(a.id), a]));
      const visible = songs.filter((s) => !s.isPrivate && !!s.mp3Path);
      const ranked = rankSongs(visible, events);
      res.json(
        ranked.map((s) => {
          const a = artistMap.get(String(s.artistaId));
          return {
            id: s.id,
            titulo: s.titulo,
            genero: s.genero,
            subgenero: s.subgenero,
            compositor: s.compositor,
            capaUrl: s.capaPath,
            mp3Url: s.mp3Path,
            artistaId: s.artistaId,
            artistaNome: a?.name || s.compositor || "Artista do Portal",
            artistaSlug: a?.slug || null,
            artistaFoto: a?.capaUrl || null,
            plays: s.plays,
            weeklyPlays: s.weeklyPlays,
            likes: s.likes,
            status: s.status,
            precoX: s.precoX,
            precoY: s.precoY,
            isVip: s.isVip,
            isPrivate: false,
            tipoMidia: s.tipoMidia,
            youtubeUrl: s.youtubeUrl,
            createdAt: s.createdAt,
          };
        }),
      );
    } catch (e) {
      console.error("Ranking unavailable", e);
      res
        .status(503)
        .json({ error: "Não foi possível carregar as músicas em alta." });
    }
  });
  router.post("/songs/:id/listen", limit, async (req, res) => {
    try {
      const id = idOf(req.params.id);
      if (!id || !(await deps.eligible(id))) {
        res.sendStatus(404);
        return;
      }
      const secret = playbackSecret();
      res.json({
        token: makeListenToken(id, who(req, secret), secret),
        minimumSeconds: 30,
      });
    } catch (e) {
      console.error("Listen ticket failed", e);
      res
        .status(503)
        .json({ error: "Não foi possível iniciar o registro da reprodução." });
    }
  });
  router.post("/songs/:id/play", limit, async (req, res) => {
    try {
      const id = idOf(req.params.id),
        secret = playbackSecret(),
        listener = who(req, secret);
      const ticket = verifyListenToken(req.body?.token, id, listener, secret);
      if (!id || !ticket) {
        res.status(400).json({
          error: "Reprodução não qualificada. Ouça pelo menos 30 segundos.",
        });
        return;
      }
      await deps.initialize();
      const result = await deps.record(id, listener, ticket.nonce, Date.now());
      if (!result.found) {
        res.sendStatus(404);
        return;
      }
      res.json({ counted: result.counted });
    } catch (e) {
      console.error("Qualified play failed", e);
      res
        .status(503)
        .json({ error: "Não foi possível registrar a reprodução." });
    }
  });
  return router;
}
export default createRankingRouter();
