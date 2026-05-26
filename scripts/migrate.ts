// Script de Migração Automática de Banco de Dados (Tolerante a Tabelas Existentes)
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega variáveis do arquivo .env a partir da raiz
dotenv.config({ path: path.join(__dirname, "../.env") });

import { pool } from "@workspace/db";

async function runMigrations() {
  console.log("🚀 Iniciando migrações automáticas do banco de dados...");
  
  // Cria tabela de histórico de migrações se não existir
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations_history (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  const migrationsDir = path.join(__dirname, "../migrations");
  if (!fs.existsSync(migrationsDir)) {
    console.error(`⚠️ Pasta de migrações não encontrada em: ${migrationsDir}`);
    process.exit(1);
  }

  // Lê e ordena alfabeticamente os arquivos SQL na pasta /migrations
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const check = await pool.query(
      "SELECT 1 FROM _migrations_history WHERE name = $1",
      [file]
    );

    if (check.rows.length === 0) {
      console.log(`⏳ Analisando/Aplicando migração: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, "utf-8");

      // Separa as queries por ponto e vírgula para execução granular
      const queries = sqlContent
        .split(";")
        .map(q => q.trim())
        .filter(q => q.length > 0);

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        
        for (const query of queries) {
          try {
            await client.query(query);
          } catch (err: any) {
            // Códigos de erro do PostgreSQL para ignorar caso o objeto já exista:
            // 42P07: relation already exists (tabela ou índice)
            // 42701: duplicate column (coluna já existe)
            // 42710: duplicate object (objeto já existe)
            const ignoredCodes = ["42P07", "42701", "42710"];
            if (ignoredCodes.includes(err.code)) {
              // console.log(`  -> Ignorado objeto já existente (código ${err.code})`);
            } else {
              throw err; // Lança qualquer outro tipo de erro real
            }
          }
        }
        
        // Registra o arquivo no histórico de migrações
        await client.query(
          "INSERT INTO _migrations_history (name) VALUES ($1) ON CONFLICT DO NOTHING",
          [file]
        );
        
        await client.query("COMMIT");
        console.log(`✅ Migração ${file} aplicada/sincronizada com sucesso!`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`❌ Erro fatal ao aplicar migração ${file}:`, err);
        client.release();
        process.exit(1);
      } finally {
        client.release();
      }
    }
  }

  console.log("🎉 Todas as migrações foram sincronizadas no banco de dados!");
  process.exit(0);
}

runMigrations().catch(err => {
  console.error("Migration execution failed:", err);
  process.exit(1);
});
