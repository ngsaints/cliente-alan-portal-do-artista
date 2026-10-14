import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import express from "express";
import { COMMUNITY_DDL } from "./src/lib/community-store";
import { createCommunityRouter } from "./src/routes/community";
const db = new DatabaseSync(":memory:");
db.exec(
  "PRAGMA foreign_keys=ON; CREATE TABLE artists(id INTEGER PRIMARY KEY,name TEXT,slug TEXT,capa_url TEXT); INSERT INTO artists VALUES(1,'Ana','ana',NULL),(2,'João','joao',NULL);",
);
for (const sql of COMMUNITY_DDL) db.exec(sql);
const query = async (sql: string, args: unknown[] = []) => {
  const params: any[] = [];
  const s = db.prepare(
    sql.replace(/\$(\d+)/g, (_, n) => {
      params.push(args[Number(n) - 1]);
      return "?";
    }),
  );
  if (s.columns().length) return s.all(...params);
  s.run(...params);
  return [];
};
const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.session = {
    artistId: req.headers["x-artist"]
      ? Number(req.headers["x-artist"])
      : undefined,
    logado: req.headers["x-admin"] === "yes",
  } as any;
  next();
});
app.use(createCommunityRouter(query, async () => {}));
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((r) => server.once("listening", r));
const base = `http://127.0.0.1:${(server.address() as any).port}`;
const call = (
  path: string,
  artist?: number,
  method = "GET",
  body?: any,
  admin = false,
) =>
  fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(artist ? { "x-artist": String(artist) } : {}),
      ...(admin ? { "x-admin": "yes" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
try {
  assert.equal((await call("/community/rooms")).status, 401);
  assert.equal((await call("/admin/community", 1)).status, 403);
  assert.equal(
    (await call("/community/rooms/unknown/messages", 1)).status,
    404,
  );
  assert.equal(
    (await call("/community/rooms/encontro/messages", 1, "POST", { body: "" }))
      .status,
    400,
  );
  assert.equal(
    (
      await call("/community/rooms/encontro/messages", 1, "POST", {
        body: "x".repeat(2001),
      })
    ).status,
    400,
  );
  let response = await call("/community/rooms/encontro/messages", 1, "POST", {
    body: "Olá <script>alert(1)</script>",
    artistId: 2,
  });
  assert.equal(response.status, 201);
  const id = (await response.json()).id;
  let data = await (await call("/community/rooms/encontro/messages", 2)).json();
  assert.equal(data.messages[0].artistId, 1);
  assert.equal(data.messages[0].body, "Olá <script>alert(1)</script>");
  assert.equal(
    (
      await call("/community/rooms/parcerias/messages", 2, "POST", {
        body: "Resposta",
        replyTo: id,
      })
    ).status,
    400,
  );
  await call("/community/rooms/encontro/messages", 2, "POST", {
    body: "Vamos compor?",
    replyTo: id,
  });
  await call("/community/rooms/encontro/presence", 1, "POST", {});
  data = await (await call("/community/rooms/encontro/messages", 2)).json();
  assert.equal(data.people[0].name, "Ana");
  await call("/community/blocks/1", 2, "POST", {});
  data = await (await call("/community/rooms/encontro/messages", 2)).json();
  assert.equal(data.messages.length, 1);
  assert.equal(data.people.length, 0);
  await call("/community/blocks/1", 2, "DELETE");
  assert.equal(
    (await (await call("/community/rooms/encontro/messages", 2)).json())
      .messages.length,
    2,
  );
  await call(`/community/messages/${id}/report`, 2, "POST", {
    reason: "Mensagem ofensiva",
  });
  await call(`/community/messages/${id}/report`, 2, "POST", {
    reason: "Duplicada",
  });
  data = await (
    await call("/admin/community", 1, "GET", undefined, true)
  ).json();
  assert.equal(data.reports.length, 1);
  assert.equal(
    (await call(`/admin/community/messages/${id}`, 2, "DELETE")).status,
    403,
  );
  await call(
    "/admin/community/bans/1",
    2,
    "POST",
    { reason: "Spam repetitivo" },
    true,
  );
  assert.equal(
    (
      await call("/community/rooms/encontro/messages", 1, "POST", {
        body: "Não deve entrar",
      })
    ).status,
    403,
  );
  await call("/admin/community/bans/1", 2, "DELETE", undefined, true);
  assert.equal(
    (
      await call("/community/rooms/encontro/messages", 1, "POST", {
        body: "Pode participar",
      })
    ).status,
    201,
  );
  await call(`/admin/community/messages/${id}`, 2, "DELETE", undefined, true);
  data = await (await call("/community/rooms/encontro/messages", 2)).json();
  assert.equal(data.messages.find((m: any) => m.id === id).body, "");
  assert.equal(data.messages.find((m: any) => m.replyTo === id).replyBody, "");
  assert.equal(
    (await (await call("/admin/community", 1, "GET", undefined, true)).json())
      .reports.length,
    0,
  );
  const controller = new AbortController();
  const stream = await fetch(base + "/community/events?room=encontro", {
    headers: { "x-artist": "1" },
    signal: controller.signal,
  });
  assert.equal(stream.status, 200);
  assert.match(stream.headers.get("content-type") || "", /^text\/event-stream/);
  const reader = stream.body!.getReader();
  assert.ok(
    new TextDecoder().decode((await reader.read()).value).includes("refresh"),
  );
  await call("/community/rooms/encontro/messages", 1, "POST", {
    body: "Evento ao vivo",
  });
  assert.ok(
    new TextDecoder().decode((await reader.read()).value).includes("refresh"),
  );
  controller.abort();
  let limitReached = false;
  for (let i = 0; i < 22; i++) {
    const result = await call("/community/rooms/encontro/messages", 2, "POST", {
      body: "Verificar limite",
    });
    if (result.status === 429) {
      limitReached = true;
      break;
    }
  }
  assert.ok(limitReached, "Limit message spam per artist");
  console.log(
    "PASS: SQL schema, auth/admin isolation, ownership, rooms/replies, presence, blocks, reports, bans and moderated content",
  );
} finally {
  server.close();
  server.closeAllConnections();
  db.close();
}
