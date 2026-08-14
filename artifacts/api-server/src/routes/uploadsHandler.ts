import fs from "fs";
import path from "path";
import { type Request, type Response, type NextFunction } from "express";

export function uploadsHandler(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== "GET" && req.method !== "HEAD") {
    next();
    return;
  }

  let rawPath = req.path;
  if (rawPath.startsWith("/api/uploads/")) {
    rawPath = rawPath.replace("/api/uploads/", "");
  } else if (rawPath.startsWith("/uploads/")) {
    rawPath = rawPath.replace("/uploads/", "");
  } else if (rawPath.startsWith("/api/uploads")) {
    rawPath = rawPath.replace("/api/uploads", "");
  } else if (rawPath.startsWith("/uploads")) {
    rawPath = rawPath.replace("/uploads", "");
  }

  // URL-decode uma vez (nomes com espacos, acentos e mojibake) e, se ainda
  // nao bater com nenhum arquivo, tenta um segundo decode (duplo-encoded).
  const candidates = [rawPath];
  try {
    const once = decodeURIComponent(rawPath);
    if (once !== rawPath) candidates.push(once);
    const twice = decodeURIComponent(once);
    if (twice !== once) candidates.push(twice);
  } catch {
    // caminho com % invalido: mantem apenas o raw
  }

  const sanitizedPath = path.normalize(rawPath).replace(/^(\.\.[\/\\])+/, "");
  const fileName = path.basename(sanitizedPath);

  if (!fileName || fileName === "." || fileName === "/") {
    next();
    return;
  }

  const candidateNames = [sanitizedPath];
  for (const c of candidates) {
    const s = path.normalize(c).replace(/^(\.\.[\/\\])+/, "");
    if (s && s !== sanitizedPath) candidateNames.push(s);
  }

  const baseUploadDirs = [
    process.env.UPLOADS_DIR,
    path.join(process.cwd(), "uploads"),
    path.join(process.cwd(), "..", "uploads"),
    path.join(process.cwd(), "..", "..", "uploads"),
    path.join(process.cwd(), "artifacts", "api-server", "uploads"),
    "/var/www/portal-do-artista/uploads",
    "/root/portal-do-artista/uploads",
    "/root/uploads",
    "/var/uploads",
  ].filter(Boolean) as string[];

  const subFolders = ["", "covers", "photos", "demo", "gallery", "banners", "articles", "emails", "audio"];

  // 1. Check requested path directly in all candidate base directories
  for (const candidateName of candidateNames) {
    for (const baseDir of baseUploadDirs) {
      const fullPath = path.join(baseDir, candidateName);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        res.sendFile(fullPath);
        return;
      }
    }
  }

  // 2. Check filename in all subfolders in all candidate base directories
  for (const candidateName of candidateNames) {
    const candidateFile = path.basename(candidateName);
    for (const baseDir of baseUploadDirs) {
      for (const subFolder of subFolders) {
        const fullPath = path.join(baseDir, subFolder, candidateFile);
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          res.sendFile(fullPath);
          return;
        }
      }
    }
  }

  // 3. File not found anywhere on disk
  const isAudio = fileName.endsWith(".mp3") || fileName.endsWith(".wav") || fileName.endsWith(".m4a");
  if (isAudio) {
    res.status(404).json({ error: "Áudio não encontrado" });
    return;
  }

  // Serve default cover or fallback SVG for missing images
  const defaultCoverPath = path.join(process.cwd(), "..", "alan-ribeiro-catalog", "public", "images", "default-cover.png");
  const localDefaultCover = path.join(process.cwd(), "public", "images", "default-cover.png");

  if (fs.existsSync(defaultCoverPath)) {
    res.sendFile(defaultCoverPath);
    return;
  } else if (fs.existsSync(localDefaultCover)) {
    res.sendFile(localDefaultCover);
    return;
  }

  const svgFallback = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="#18181b"/>
    <circle cx="200" cy="160" r="60" fill="#f5c518" opacity="0.3"/>
    <path d="M120 320 c0 -50 40 -80 80 -80 s80 30 80 80" stroke="#f5c518" stroke-width="12" fill="none" opacity="0.3"/>
  </svg>`;

  res.setHeader("Content-Type", "image/svg+xml");
  res.send(svgFallback);
}
