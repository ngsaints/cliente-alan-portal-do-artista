import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import router from "./routes";
import path from "path";

const app: Express = express();

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
