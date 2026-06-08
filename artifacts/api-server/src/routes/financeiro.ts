import { Router, type IRouter } from "express";
import { db, custosTable, receitasTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/financeiro/resumo", async (req, res): Promise<void> => {
  if (!req.session.artistId) { res.status(401).json({ error: "Não autorizado" }); return; }

  const [custosResult] = await db
    .select({ total: sql`COALESCE(SUM(CAST(valor AS NUMERIC)), 0)` })
    .from(custosTable)
    .where(eq(custosTable.artistaId, req.session.artistId));

  const [receitasResult] = await db
    .select({ total: sql`COALESCE(SUM(CAST(valor AS NUMERIC)), 0)` })
    .from(receitasTable)
    .where(eq(receitasTable.artistaId, req.session.artistId));

  const totalCustos = parseFloat(String(custosResult.total));
  const totalReceitas = parseFloat(String(receitasResult.total));
  const lucroLiquido = totalReceitas - totalCustos;

  res.json({ totalCustos, totalReceitas, lucroLiquido });
});

export default router;
