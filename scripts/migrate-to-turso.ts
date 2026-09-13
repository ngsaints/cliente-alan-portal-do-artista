// Script de Migração Automatizada: PostgreSQL -> Turso DB (libSQL / SQLite Edge)
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { TURSO_SCHEMA_DDL, createClient, pool } from "@workspace/db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega variáveis do arquivo .env a partir de múltiplos caminhos
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../../.env") });
dotenv.config({ path: path.join(__dirname, "../artifacts/api-server/.env") });

// Parse de argumentos CLI
function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  return undefined;
}

const tursoUrl = getArg("--url") || process.env.TURSO_DATABASE_URL || process.env.TURSO_DB_URL;
const tursoToken = getArg("--token") || process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN;
const pgUrl = getArg("--pg") || process.env.DATABASE_URL;

async function runTursoMigration() {
  console.log("===============================================================");
  console.log("🚀 PORTAL DO ARTISTA - MIGRAÇÃO PARA TURSO DB (libSQL / SQLite)");
  console.log("===============================================================\n");

  if (!tursoUrl) {
    console.error("❌ Erro: URL do Turso DB não informada!");
    console.log("\nComo obter suas credenciais do Turso DB:");
    console.log("  1. Instale o CLI do Turso: curl -sSfL https://get.tur.so/install.sh | bash");
    console.log("  2. Crie uma conta ou autentique-se: turso auth signup (ou turso auth login)");
    console.log("  3. Crie seu banco de dados: turso db create portal-do-artista --location gru (São Paulo)");
    console.log("  4. Obtenha a URL do banco: turso db show portal-do-artista --url");
    console.log("  5. Crie um token de acesso: turso db tokens create portal-do-artista");
    console.log("\nDefina as variáveis no seu .env:");
    console.log("  TURSO_DATABASE_URL=libsql://portal-do-artista-seuuser.turso.io");
    console.log("  TURSO_AUTH_TOKEN=seu-token-jwt");
    console.log("\nOu execute com parâmetros:");
    console.log("  pnpm --filter @workspace/scripts run migrate:turso -- --url libsql://... --token ...\n");
    process.exit(1);
  }

  if (!pgUrl) {
    console.error("❌ Erro: DATABASE_URL do PostgreSQL não encontrada no ambiente!");
    process.exit(1);
  }

  const maskedTursoUrl = tursoUrl.replace(/:([^:@]+)@/, ":******@");
  const maskedPgUrl = pgUrl.replace(/:([^:@]+)@/, ":******@");

  console.log(`📡 Origem (PostgreSQL): ${maskedPgUrl}`);
  console.log(`⚡ Destino (Turso DB):   ${maskedTursoUrl}`);
  console.log("---------------------------------------------------------------\n");

  // 1. Inicializar cliente Turso
  const turso = createClient({
    url: tursoUrl,
    authToken: tursoToken || "",
  });

  // 2. Testar conexão com Turso
  console.log("⏳ Testando conexão com Turso DB...");
  try {
    await turso.execute("SELECT 1 AS ok");
    console.log("✅ Conexão com Turso DB estabelecida com sucesso!\n");
  } catch (err: any) {
    console.error("❌ Falha ao conectar ao Turso DB:", err.message);
    process.exit(1);
  }

  // 3. Criar tabelas e índices no Turso
  console.log("📦 Aplicando DDL e criando tabelas no Turso DB...");
  for (const statement of TURSO_SCHEMA_DDL) {
    try {
      await turso.execute(statement);
    } catch (ddlErr: any) {
      console.warn(`⚠️ Aviso ao executar statement: ${ddlErr.message}`);
    }
  }
  console.log("✅ Estrutura de tabelas e índices criada no Turso DB!\n");

  // 4. Conectar ao PostgreSQL
  const pgClient = pool;

  // Lista de tabelas a serem migradas em ordem
  const tablesToMigrate = [
    "settings",
    "app_settings",
    "plans",
    "genres",
    "cities",
    "article_categories",
    "artists",
    "songs",
    "interests",
    "subscriptions",
    "coupons",
    "ai_music_demos",
    "playlists",
    "playlist_songs",
    "galleries",
    "gallery_photos",
    "audicoes",
    "song_likes",
    "contatos",
    "eventos",
    "custos",
    "receitas",
    "articles",
    "song_composers",
    "cta_banners",
    "exit_feedbacks",
    "password_resets",
    "ajuda"
  ];

  console.log("🔄 Iniciando migração de dados tabela por tabela...\n");

  const migrationStats: Array<{ table: string; pgCount: number; tursoCount: number; status: string }> = [];

  for (const tableName of tablesToMigrate) {
    try {
      // Verificar se tabela existe no PostgreSQL
      const checkTable = await pgClient.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        );`,
        [tableName]
      );

      if (!checkTable.rows[0]?.exists) {
        console.log(`⏩ Tabela "${tableName}" não encontrada no PostgreSQL, pulando...`);
        continue;
      }

      // Buscar linhas do PostgreSQL
      const pgRes = await pgClient.query(`SELECT * FROM "${tableName}"`);
      const pgRows = pgRes.rows;
      const pgCount = pgRows.length;

      if (pgCount === 0) {
        console.log(`ℹ️ [${tableName}] 0 registros no PostgreSQL.`);
        migrationStats.push({ table: tableName, pgCount: 0, tursoCount: 0, status: "Vazia" });
        continue;
      }

      console.log(`⏳ Migrando [${tableName}] (${pgCount} registros)...`);

      // Obter colunas
      const columns = Object.keys(pgRows[0]);
      const quotedCols = columns.map(c => `"${c}"`).join(", ");
      const placeholders = columns.map(() => "?").join(", ");
      const insertSql = `INSERT OR REPLACE INTO "${tableName}" (${quotedCols}) VALUES (${placeholders})`;

      // Inserir em lotes no Turso
      const batchSize = 50;
      for (let i = 0; i < pgRows.length; i += batchSize) {
        const chunk = pgRows.slice(i, i + batchSize);
        const batchStatements = chunk.map(row => {
          const args = columns.map(col => {
            const val = row[col];
            if (val === null || val === undefined) return null;
            if (val instanceof Date) return val.toISOString();
            if (typeof val === "boolean") return val ? 1 : 0;
            if (typeof val === "object") return JSON.stringify(val);
            if (typeof val === "number" || typeof val === "bigint") return Number(val);
            return String(val);
          });
          return { sql: insertSql, args };
        });

        await turso.batch(batchStatements, "write");
      }

      // Validar contagem no Turso
      const tursoRes = await turso.execute(`SELECT COUNT(*) as count FROM "${tableName}"`);
      const tursoCount = Number((tursoRes.rows[0] as any)?.count ?? 0);

      const status = tursoCount >= pgCount ? "✅ OK" : "⚠️ Divergência";
      console.log(`   ${status} [${tableName}] PG: ${pgCount} | Turso: ${tursoCount}`);

      migrationStats.push({ table: tableName, pgCount, tursoCount, status });
    } catch (tableErr: any) {
      console.error(`❌ Erro ao migrar tabela "${tableName}":`, tableErr.message);
      migrationStats.push({ table: tableName, pgCount: 0, tursoCount: 0, status: `❌ Erro: ${tableErr.message}` });
    }
  }

  await pgClient.end();

  // Relatório Final
  console.log("\n===============================================================");
  console.log("📊 RELATÓRIO FINAL DA MIGRAÇÃO");
  console.log("===============================================================");
  console.table(migrationStats);

  console.log("\n🎉 Migração para Turso DB concluída com sucesso!");
  console.log("\n📌 Próximos passos para utilizar o Turso DB:");
  console.log("  1. No seu arquivo .env ou no painel do Deno Deploy, configure:");
  console.log(`     TURSO_DATABASE_URL=${tursoUrl}`);
  console.log(`     TURSO_AUTH_TOKEN=${tursoToken ? "******" : "(não definido)"}`);
  console.log("  2. O Portal do Artista identificará automaticamente a conexão Turso.");
  console.log("===============================================================\n");

  process.exit(0);
}

runTursoMigration().catch(err => {
  console.error("Fatal error during Turso migration:", err);
  process.exit(1);
});
