import process from "node:process";
import path from "node:path";
import fs from "node:fs";

// Carregar .env local se existir
try {
  const dotenv = await import("dotenv");
  dotenv.default.config({ path: "./.env" });
} catch {
  // Ignora se não houver dotenv
}

import app from "./artifacts/api-server/src/app.ts";
import { startReactivation } from "./artifacts/api-server/src/lib/reactivation.ts";

// Configuração de Porta adaptada para Deno Deploy e Node
const port = Number(process.env.PORT || (typeof (globalThis as any).Deno !== "undefined" ? "8000" : "3000"));

// Servir frontend compilado SPA se a pasta dist existir (ideal para deploy unificado no Deno Deploy)
const clientDistPath = path.join(process.cwd(), "artifacts/alan-ribeiro-catalog/dist");
if (fs.existsSync(clientDistPath)) {
  const express = (await import("express")).default;
  app.use(express.static(clientDistPath));

  // SPA fallback para rotas que não começam com /api ou /uploads
  app.get("*", (req: any, res: any, next: any) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
  console.log(`[Deno] Frontend estático SPA montado a partir de: ${clientDistPath}`);
}

// Iniciar servidor
app.listen(port, () => {
  try {
    startReactivation();
  } catch (err) {
    console.warn("Aviso ao iniciar rotina de reativação:", err);
  }

  const isDenoDeploy = typeof (globalThis as any).Deno !== "undefined" && Boolean((globalThis as any).Deno.env?.get("DENO_DEPLOYMENT_ID"));
  if (isDenoDeploy) {
    const region = (globalThis as any).Deno.env.get("DENO_REGION") || "Edge";
    console.log(`🚀 [Portal do Artista] Ativo no Deno Deploy! Região: ${region} | Porta: ${port}`);
  } else {
    console.log(`🚀 [Portal do Artista] Servidor rodando na porta ${port}`);
  }
});
