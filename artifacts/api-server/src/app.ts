import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pgSession from "connect-pg-simple";
import router from "./routes";
import path from "path";

const app: Express = express();

app.set("trust proxy", 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for SPA
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: "Muitas tentativas. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to auth endpoints
app.use("/api/auth/login", authLimiter);
app.use("/api/artists/login", authLimiter);
app.use("/api/artists/forgot-password", authLimiter);
app.use("/api/artists/reset-password", authLimiter);

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PgStore = pgSession(session);

app.use(
  session({
    store: process.env["DATABASE_URL"] ? new PgStore({
      conString: process.env["DATABASE_URL"],
      tableName: "sessions",
      createTableIfMissing: true,
    }) : undefined,
    secret: process.env["SESSION_SECRET"] || "alan-ribeiro-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

import sitemapRouter from "./routes/sitemap";

// Serve local uploads
app.use("/api/uploads", express.static(path.join(process.cwd(), "uploads")));

// Serve root sitemap.xml and robots.txt
app.use(sitemapRouter);

app.use("/api", router);

export default app;
