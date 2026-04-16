import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import songsRouter from "./songs";
import settingsRouter from "./settings";
import artistsRouter from "./artists";
import plansRouter from "./plans";
import interestsRouter from "./interests";
import profileRouter from "./profile";
import artistSongsRouter from "./artist-songs";
import adminRouter from "./admin";
import paymentsRouter from "./payments";
import genresRouter from "./genres";
import authPasswordRouter from "./auth-password";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(songsRouter);
router.use(settingsRouter);
router.use(artistsRouter);
router.use(plansRouter);
router.use(interestsRouter);
router.use(profileRouter);
router.use(artistSongsRouter);
router.use(adminRouter);
router.use(paymentsRouter);
router.use(genresRouter);
router.use(authPasswordRouter);

export default router;
