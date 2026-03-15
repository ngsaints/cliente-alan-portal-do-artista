import { Router, type IRouter } from "express";

declare module "express-session" {
  interface SessionData {
    logado: boolean;
  }
}

const USUARIO_ADMIN = "admin";
const SENHA_ADMIN = "1234";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { usuario, senha } = req.body;

  if (usuario === USUARIO_ADMIN && senha === SENHA_ADMIN) {
    req.session.logado = true;
    res.json({ logado: true });
    return;
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
