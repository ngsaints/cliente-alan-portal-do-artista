import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import router from "./routes";
import path from "path";

const app: Express = express();

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

app.use(
  session({
    secret: process.env["SESSION_SECRET"] || "alan-ribeiro-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 },
  })
);

// Serve local uploads
app.use("/api/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api", router);

export default app;
