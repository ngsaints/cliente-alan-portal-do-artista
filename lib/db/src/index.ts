import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });
dotenv.config({ path: "../../../.env" });
dotenv.config({ path: "../.env" });

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { isTursoConfigured, getTursoDb } from "./turso";

const { Pool } = pg;

const hasPostgres = Boolean(
  process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith("libsql://")
);

if (!hasPostgres && !isTursoConfigured()) {
  console.warn(
    "⚠️ Aviso: Nem DATABASE_URL (PostgreSQL) nem TURSO_DATABASE_URL foram encontradas. Configure ao menos um banco de dados no .env."
  );
}

export const pool = hasPostgres
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : (null as unknown as pg.Pool);

export const db: NodePgDatabase<typeof schema> = (
  hasPostgres
    ? drizzle(pool, { schema })
    : (isTursoConfigured() ? getTursoDb() : null)
) as NodePgDatabase<typeof schema>;

export * from "./schema";
export * from "./turso";


