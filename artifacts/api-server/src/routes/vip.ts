import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/vip/status", (req, res): void => {
  res.json({ vipLogado: req.session.vipLogado === true });
});

router.post("/vip/login", async (req, res): Promise<void> => {
  const { senha } = req.body;
  if (!senha) {
    res.status(400).json({ error: "Senha obrigatória" });
    return;
  }

  const [row] = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "vip_password"));
  const correctPassword = row?.value ?? "alanvip";

  if (senha !== correctPassword) {
    res.status(401).json({ error: "Senha VIP inválida" });
    return;
  }

  req.session.vipLogado = true;
  res.json({ vipLogado: true });
});

router.post("/vip/logout", (req, res): void => {
  req.session.vipLogado = false;
  res.json({ vipLogado: false });
});

export default router;
