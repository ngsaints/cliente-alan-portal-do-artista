import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import {
  COMMUNITY_ROOMS,
  communityQuery,
  ensureCommunitySchema,
} from "../lib/community-store";
const events = new EventEmitter();
events.setMaxListeners(0);
const connections = new Map<number, number>();
const roomValid = (room: unknown): room is string =>
  COMMUNITY_ROOMS.some((r) => r.id === room);
export function createCommunityRouter(
  query = communityQuery,
  initialize = ensureCommunitySchema,
): IRouter {
  const router: IRouter = Router();
  router.use(["/community", "/admin/community"], async (req, res, next) => {
    if (!req.session?.artistId && !req.session?.logado) {
      res.status(401).json({
        error: "Entre na sua conta de artista para participar da comunidade.",
      });
      return;
    }
    if (req.baseUrl.endsWith("/admin/community") && !req.session.logado) {
      res.status(403).json({ error: "Acesso restrito ao administrador." });
      return;
    }
    try {
      await initialize();
      next();
    } catch (error) {
      console.error("Community initialization failed", error);
      res
        .status(503)
        .json({ error: "A comunidade está temporariamente indisponível." });
    }
  });
  const protect = rateLimit({
    windowMs: 60_000,
    limit: 20,
    keyGenerator: (req) => `artist:${req.session.artistId || "admin"}`,
    message: {
      error: "Você está enviando mensagens muito rápido. Aguarde um instante.",
    },
  });
  router.get("/community/rooms", async (req, res) => {
    const counts = await query(
      "SELECT room, COUNT(*) AS count FROM community_presence WHERE last_seen > $1 GROUP BY room",
      [Date.now() - 90_000],
    );
    const bans = await query(
      "SELECT reason FROM community_bans WHERE artist_id=$1",
      [req.session.artistId || 0],
    );
    res.json({
      rooms: COMMUNITY_ROOMS.map((room) => ({
        ...room,
        online: Number(counts.find((c) => c.room === room.id)?.count || 0),
      })),
      artistId: req.session.artistId || null,
      isAdmin: !!req.session.logado,
      banned: bans[0]?.reason || null,
    });
  });
  router.get("/community/rooms/:room/messages", async (req, res) => {
    const room = req.params.room;
    if (!roomValid(room)) {
      res.status(404).json({ error: "Sala não encontrada." });
      return;
    }
    const messages = await query(
      `SELECT m.id,m.room,m.artist_id AS "artistId",m.created_at AS "createdAt",m.removed_at AS "removedAt",CASE WHEN m.removed_at IS NULL THEN m.body ELSE '' END AS body,a.name,a.slug,a.capa_url AS photo,m.reply_to AS "replyTo",p.name AS "replyName",CASE WHEN parent.removed_at IS NULL AND NOT EXISTS (SELECT 1 FROM community_blocks quote_block WHERE quote_block.artist_id=$2 AND quote_block.blocked_id=parent.artist_id) THEN parent.body ELSE '' END AS "replyBody" FROM community_messages m JOIN artists a ON a.id=m.artist_id LEFT JOIN community_messages parent ON parent.id=m.reply_to LEFT JOIN artists p ON p.id=parent.artist_id WHERE m.room=$1 AND NOT EXISTS (SELECT 1 FROM community_blocks b WHERE b.artist_id=$2 AND b.blocked_id=m.artist_id) ORDER BY m.created_at DESC,m.id DESC LIMIT 100`,
      [room, req.session.artistId || 0],
    );
    const people = await query(
      `SELECT a.id,a.name,a.slug,a.capa_url AS photo FROM community_presence p JOIN artists a ON a.id=p.artist_id WHERE p.room=$1 AND p.last_seen>$2 AND NOT EXISTS (SELECT 1 FROM community_blocks b WHERE b.artist_id=$3 AND b.blocked_id=a.id) ORDER BY a.name LIMIT 100`,
      [room, Date.now() - 90_000, req.session.artistId || 0],
    );
    res.json({ messages: messages.reverse(), people });
  });
  router.post("/community/rooms/:room/presence", async (req, res) => {
    if (!roomValid(req.params.room) || !req.session.artistId) {
      res.sendStatus(400);
      return;
    }
    await query(
      "INSERT INTO community_presence(room,artist_id,last_seen) VALUES($1,$2,$3) ON CONFLICT(room,artist_id) DO UPDATE SET last_seen=EXCLUDED.last_seen",
      [req.params.room, req.session.artistId, Date.now()],
    );
    res.sendStatus(204);
  });
  router.post("/community/rooms/:room/messages", protect, async (req, res) => {
    const artistId = req.session.artistId,
      room = req.params.room,
      body = req.body?.body,
      replyTo = req.body?.replyTo;
    if (!artistId) {
      res.sendStatus(401);
      return;
    }
    if (
      !roomValid(room) ||
      typeof body !== "string" ||
      !body.trim() ||
      body.trim().length > 2000 ||
      (replyTo != null && typeof replyTo !== "string")
    ) {
      res.status(400).json({
        error:
          "Escreva uma mensagem de até 2.000 caracteres em uma sala válida.",
      });
      return;
    }
    if (
      (
        await query("SELECT artist_id FROM community_bans WHERE artist_id=$1", [
          artistId,
        ])
      ).length
    ) {
      res.status(403).json({
        error: "Sua participação na comunidade foi suspensa pela moderação.",
      });
      return;
    }
    if (
      replyTo &&
      !(
        await query(
          "SELECT id FROM community_messages WHERE id=$1 AND room=$2 AND removed_at IS NULL",
          [replyTo, room],
        )
      ).length
    ) {
      res.status(400).json({
        error: "A mensagem respondida não está disponível nesta sala.",
      });
      return;
    }
    const id = randomUUID();
    await query(
      "INSERT INTO community_messages(id,room,artist_id,body,reply_to,created_at) VALUES($1,$2,$3,$4,$5,$6)",
      [id, room, artistId, body.trim(), replyTo || null, Date.now()],
    );
    events.emit("refresh", room);
    res.status(201).json({ id });
  });
  router.get("/community/events", (req, res) => {
    const room = req.query.room,
      artistId = req.session.artistId || 0;
    if (!roomValid(room)) {
      res.sendStatus(400);
      return;
    }
    if ((connections.get(artistId) || 0) >= 3) {
      res.sendStatus(429);
      return;
    }
    connections.set(artistId, (connections.get(artistId) || 0) + 1);
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    res.write("data: refresh\n\n");
    const listener = (changed: string) => {
      if (changed === room) res.write("data: refresh\n\n");
    };
    events.on("refresh", listener);
    const keepAlive = setInterval(() => res.write(": keepalive\n\n"), 25000);
    res.on("close", () => {
      clearInterval(keepAlive);
      events.off("refresh", listener);
      connections.set(
        artistId,
        Math.max(0, (connections.get(artistId) || 1) - 1),
      );
    });
  });
  router.post("/community/messages/:id/report", protect, async (req, res) => {
    const reason = req.body?.reason;
    if (
      !req.session.artistId ||
      typeof reason !== "string" ||
      reason.trim().length < 3 ||
      reason.length > 500
    ) {
      res
        .status(400)
        .json({ error: "Informe o motivo da denúncia (3 a 500 caracteres)." });
      return;
    }
    if (
      !(
        await query("SELECT id FROM community_messages WHERE id=$1", [
          req.params.id,
        ])
      ).length
    ) {
      res.sendStatus(404);
      return;
    }
    await query(
      "INSERT INTO community_reports(id,message_id,artist_id,reason,created_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(message_id,artist_id) DO NOTHING",
      [
        randomUUID(),
        req.params.id,
        req.session.artistId,
        reason.trim(),
        Date.now(),
      ],
    );
    res.sendStatus(204);
  });
  router.get("/community/blocks", async (req, res) =>
    res.json(
      await query(
        "SELECT a.id,a.name FROM community_blocks b JOIN artists a ON a.id=b.blocked_id WHERE b.artist_id=$1",
        [req.session.artistId || 0],
      ),
    ),
  );
  router.post("/community/blocks/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (
      !req.session.artistId ||
      !Number.isInteger(id) ||
      id <= 0 ||
      id === req.session.artistId
    ) {
      res.sendStatus(400);
      return;
    }
    if (!(await query("SELECT id FROM artists WHERE id=$1", [id])).length) {
      res.sendStatus(404);
      return;
    }
    await query(
      "INSERT INTO community_blocks(artist_id,blocked_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [req.session.artistId, id],
    );
    res.sendStatus(204);
  });
  router.delete("/community/blocks/:id", async (req, res) => {
    await query(
      "DELETE FROM community_blocks WHERE artist_id=$1 AND blocked_id=$2",
      [req.session.artistId || 0, Number(req.params.id) || 0],
    );
    res.sendStatus(204);
  });
  router.get("/admin/community", async (_req, res) => {
    const reports = await query(
      `SELECT r.id,r.reason,r.created_at AS "createdAt",r.message_id AS "messageId",m.body,m.room,m.artist_id AS "artistId",m.removed_at AS "removedAt",a.name,u.name AS "reporterName" FROM community_reports r JOIN community_messages m ON m.id=r.message_id JOIN artists a ON a.id=m.artist_id JOIN artists u ON u.id=r.artist_id WHERE r.reviewed_at IS NULL ORDER BY r.created_at DESC LIMIT 100`,
    );
    const bans = await query(
      "SELECT b.artist_id AS id,b.reason,a.name FROM community_bans b JOIN artists a ON a.id=b.artist_id ORDER BY b.created_at DESC",
    );
    res.json({ reports, bans });
  });
  router.delete("/admin/community/messages/:id", async (req, res) => {
    const messages = await query(
      "SELECT room FROM community_messages WHERE id=$1",
      [req.params.id],
    );
    if (!messages.length) {
      res.sendStatus(404);
      return;
    }
    await query("UPDATE community_messages SET removed_at=$1 WHERE id=$2", [
      Date.now(),
      req.params.id,
    ]);
    await query(
      "UPDATE community_reports SET reviewed_at=$1 WHERE message_id=$2",
      [Date.now(), req.params.id],
    );
    events.emit("refresh", messages[0].room);
    res.sendStatus(204);
  });
  router.post("/admin/community/reports/:id/review", async (req, res) => {
    await query("UPDATE community_reports SET reviewed_at=$1 WHERE id=$2", [
      Date.now(),
      req.params.id,
    ]);
    res.sendStatus(204);
  });
  router.post("/admin/community/bans/:id", async (req, res) => {
    const id = Number(req.params.id),
      reason = req.body?.reason;
    if (
      !Number.isInteger(id) ||
      id <= 0 ||
      typeof reason !== "string" ||
      reason.trim().length < 3 ||
      reason.length > 500
    ) {
      res.sendStatus(400);
      return;
    }
    if (!(await query("SELECT id FROM artists WHERE id=$1", [id])).length) {
      res.sendStatus(404);
      return;
    }
    await query(
      "INSERT INTO community_bans(artist_id,reason,created_at) VALUES($1,$2,$3) ON CONFLICT(artist_id) DO UPDATE SET reason=EXCLUDED.reason,created_at=EXCLUDED.created_at",
      [id, reason.trim(), Date.now()],
    );
    res.sendStatus(204);
  });
  router.delete("/admin/community/bans/:id", async (req, res) => {
    await query("DELETE FROM community_bans WHERE artist_id=$1", [
      Number(req.params.id) || 0,
    ]);
    res.sendStatus(204);
  });
  router.use((error: any, _req: any, res: any, _next: any) => {
    console.error("Community request failed", error);
    if (!res.headersSent)
      res.status(503).json({
        error:
          "Não foi possível concluir a ação na comunidade. Tente novamente.",
      });
  });
  return router;
}
export default createCommunityRouter();
