// Script de Migração Automática de Banco de Dados
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
      console.log(`⏳ Aplicando migração: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, "utf-8");

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        
        // Executa as queries do arquivo SQL
        if (sqlContent.trim()) {
          await client.query(sqlContent);
        }
        
        // Registra o arquivo no histórico de migrações
        await client.query(
          "INSERT INTO _migrations_history (name) VALUES ($1)",
          [file]
        );
        
        await client.query("COMMIT");
        console.log(`✅ Migração ${file} aplicada com sucesso!`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`❌ Erro ao aplicar migração ${file}:`, err);
        client.release();
        process.exit(1);
      } finally {
        client.release();
      }
    }
  }

  console.log("🎉 Todas as migrações foram verificadas e aplicadas!");
  process.exit(0);
}

runMigrations().catch(err => {
  console.error("Migration execution failed:", err);
  process.exit(1);
});
