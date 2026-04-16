import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    logado: boolean;
  }
}

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { usuario, senha } = req.body;

  try {
    const adminUserSetting = await db.select().from(settingsTable).where(eq(settingsTable.key, "admin_user")).limit(1);
    const adminPassSetting = await db.select().from(settingsTable).where(eq(settingsTable.key, "admin_pass")).limit(1);

    const adminUser = adminUserSetting[0]?.value || "admin";
    const adminPass = adminPassSetting[0]?.value || "admin1234";

    if (usuario === adminUser && senha === adminPass) {
      req.session.logado = true;
      res.json({ logado: true });
      return;
    }
  } catch (error) {
    console.error("Error checking admin credentials:", error);
  }

  res.status(401).json({ error: "Usuário ou senha incorretos!" });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session.destroy(() => {
    res.json({ logado: false });
  });
});

router.get("/auth/status", async (req, res): Promise<void> => {
  res.json({ logado: req.session.logado === true });
});

export default router;
