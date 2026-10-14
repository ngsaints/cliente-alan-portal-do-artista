import { pool, getTursoClient } from "@workspace/db";
export const COMMUNITY_ROOMS = [
  {
    id: "encontro",
    name: "Encontro dos Artistas",
    description: "Apresente-se, troque experiências e conheça outros artistas.",
    prompt:
      "Seja bem-vindo! Conte seu nome, seu estilo musical e o que você está criando.",
  },
  {
    id: "parcerias",
    name: "Parcerias de Composição",
    description: "Conecte letras, melodias, vozes e produção.",
    prompt:
      "Conte o que você faz, o que procura e o estilo musical. Compartilhe o link do seu perfil ou da sua música.",
  },
];
export const COMMUNITY_DDL = [
  `CREATE TABLE IF NOT EXISTS community_messages (id TEXT PRIMARY KEY, room TEXT NOT NULL, artist_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE, body TEXT NOT NULL, reply_to TEXT, created_at BIGINT NOT NULL, removed_at BIGINT)`,
  `CREATE INDEX IF NOT EXISTS community_messages_room_date ON community_messages(room, created_at)`,
  `CREATE TABLE IF NOT EXISTS community_presence (room TEXT NOT NULL, artist_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE, last_seen BIGINT NOT NULL, PRIMARY KEY(room, artist_id))`,
  `CREATE TABLE IF NOT EXISTS community_reports (id TEXT PRIMARY KEY, message_id TEXT NOT NULL REFERENCES community_messages(id) ON DELETE CASCADE, artist_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE, reason TEXT NOT NULL, created_at BIGINT NOT NULL, reviewed_at BIGINT, UNIQUE(message_id, artist_id))`,
  `CREATE TABLE IF NOT EXISTS community_bans (artist_id INTEGER PRIMARY KEY REFERENCES artists(id) ON DELETE CASCADE, reason TEXT NOT NULL, created_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS community_blocks (artist_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE, blocked_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE, PRIMARY KEY(artist_id, blocked_id))`,
];
export async function communityQuery(
  statement: string,
  args: unknown[] = [],
): Promise<any[]> {
  if (pool) return (await pool.query(statement, args)).rows;
  const params: any[] = [];
  const sqlite = statement.replace(/\$(\d+)/g, (_, n) => {
    params.push(args[Number(n) - 1]);
    return "?";
  });
  return (await getTursoClient().execute({ sql: sqlite, args: params }))
    .rows as any[];
}
let ready: Promise<void> | undefined;
export function ensureCommunitySchema() {
  return (ready ||= (async () => {
    for (const statement of COMMUNITY_DDL) await communityQuery(statement);
  })().catch((error) => {
    ready = undefined;
    throw error;
  }));
}
