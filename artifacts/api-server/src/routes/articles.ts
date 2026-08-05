import { Router, type IRouter } from "express";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { db, articlesTable, artistsTable } from "@workspace/db";
import { eq, desc, and, like, or, sql } from "drizzle-orm";
import { uploadToR2, generateR2Key, r2Enabled } from "../lib/r2-storage.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

async function saveArticleCover(buffer: Buffer, originalName: string): Promise<string> {
  const jpgBuffer = await sharp(buffer).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
  if (r2Enabled) {
    const key = generateR2Key("articles", originalName.replace(/\.\w+$/, ".jpg"));
    return uploadToR2(jpgBuffer, key, "image/jpeg");
  }
  const dir = path.join(process.cwd(), "uploads/articles");
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${Date.now()}_${originalName.replace(/[^a-zA-Z0-9.-]/g, "_").replace(/\.\w+$/, ".jpg")}`;
  fs.writeFileSync(path.join(dir, filename), jpgBuffer);
  return `/api/uploads/articles/${filename}`;
}

const router: IRouter = Router();

// Helper to calculate reading time
function calculateReadingTime(text: string): number {
  if (!text) return 3;
  const words = text.replace(/<[^>]*>/g, " ").trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

// 0. POST /api/articles/upload-cover - Upload Cover Image (R2 / Local Disk)
router.post("/articles/upload-cover", upload.single("cover"), async (req, res): Promise<void> => {
  if (!req.session?.isAdmin && !req.session?.artistId) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "Nenhuma imagem enviada" });
    return;
  }

  try {
    const coverUrl = await saveArticleCover(req.file.buffer, req.file.originalname);
    res.json({ url: coverUrl });
  } catch (error) {
    console.error("Error uploading article cover image:", error);
    res.status(500).json({ error: "Erro ao fazer upload da imagem de capa" });
  }
});

// 1. GET /api/articles - List published articles
router.get("/articles", async (req, res): Promise<void> => {
  try {
    const { category, search } = req.query;

    let conditions = [eq(articlesTable.status, "published")];

    if (category && typeof category === "string" && category.trim() !== "" && category !== "Todos") {
      conditions.push(eq(articlesTable.category, category.trim()));
    }

    if (search && typeof search === "string" && search.trim() !== "") {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        or(
          like(articlesTable.title, searchTerm),
          like(articlesTable.excerpt, searchTerm),
          like(articlesTable.keywords, searchTerm)
        )!
      );
    }

    const articles = await db
      .select()
      .from(articlesTable)
      .where(and(...conditions))
      .orderBy(desc(articlesTable.publishedAt));

    res.json(articles);
  } catch (error) {
    console.error("Error fetching articles:", error);
    res.status(500).json({ error: "Erro ao buscar artigos" });
  }
});

// 2. GET /api/articles/featured - Get featured article
router.get("/articles/featured", async (_req, res): Promise<void> => {
  try {
    const [featured] = await db
      .select()
      .from(articlesTable)
      .where(and(eq(articlesTable.status, "published"), eq(articlesTable.isFeatured, true)))
      .orderBy(desc(articlesTable.publishedAt))
      .limit(1);

    if (featured) {
      res.json(featured);
      return;
    }

    // Fallback to most recent published article
    const [latest] = await db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.status, "published"))
      .orderBy(desc(articlesTable.publishedAt))
      .limit(1);

    res.json(latest || null);
  } catch (error) {
    console.error("Error fetching featured article:", error);
    res.status(500).json({ error: "Erro ao buscar artigo em destaque" });
  }
});

// 3. GET /api/articles/admin/all - Get all articles (Admin)
router.get("/articles/admin/all", async (req, res): Promise<void> => {
  if (!req.session?.isAdmin) {
    res.status(401).json({ error: "Acesso não autorizado" });
    return;
  }

  try {
    const articles = await db
      .select()
      .from(articlesTable)
      .orderBy(desc(articlesTable.createdAt));

    res.json(articles);
  } catch (error) {
    console.error("Error fetching admin articles:", error);
    res.status(500).json({ error: "Erro ao buscar todos os artigos" });
  }
});

// 4. GET /api/articles/:slug - Get article details & increment view count
router.get("/articles/:slug", async (req, res): Promise<void> => {
  try {
    const { slug } = req.params;

    const [article] = await db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.slug, slug))
      .limit(1);

    if (!article) {
      res.status(404).json({ error: "Artigo não encontrado" });
      return;
    }

    // Increment views asynchronously
    db.update(articlesTable)
      .set({ views: sql`${articlesTable.views} + 1` })
      .where(eq(articlesTable.id, article.id))
      .catch((err) => console.error("Error incrementing article views:", err));

    res.json(article);
  } catch (error) {
    console.error("Error fetching article by slug:", error);
    res.status(500).json({ error: "Erro ao carregar artigo" });
  }
});

// 5. POST /api/articles - Create article (Admin or Artist with permission)
router.post("/articles", async (req, res): Promise<void> => {
  const isAdmin = req.session?.isAdmin === true;
  const artistId = req.session?.artistId;

  let canPost = isAdmin;
  let authorType: "admin" | "artist" = isAdmin ? "admin" : "artist";
  let authorName = isAdmin ? "Redação Portal do Artista" : "Artista";

  if (!isAdmin && artistId) {
    const [artist] = await db
      .select()
      .from(artistsTable)
      .where(eq(artistsTable.id, artistId))
      .limit(1);

    if (artist && artist.canPostArticles) {
      canPost = true;
      authorName = artist.name;
    }
  }

  if (!canPost) {
    res.status(403).json({ error: "Você não possui permissão para publicar artigos" });
    return;
  }

  try {
    const {
      title,
      slug: customSlug,
      excerpt,
      content,
      coverUrl,
      category,
      keywords,
      metaTitle,
      metaDescription,
      status,
      isFeatured,
      authorName: customAuthorName,
    } = req.body;

    if (!title || !content) {
      res.status(400).json({ error: "Título e conteúdo são obrigatórios" });
      return;
    }

    // Generate slug from title if not provided
    const baseSlug = customSlug || title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const slug = baseSlug || `artigo-${Date.now()}`;

    const readingTimeMinutes = calculateReadingTime(content);

    const [newArticle] = await db
      .insert(articlesTable)
      .values({
        title,
        slug,
        excerpt: excerpt || metaDescription || title,
        content,
        coverUrl: coverUrl || "/images/default-cover.png",
        category: category || "Carreira",
        keywords: keywords || "",
        metaTitle: metaTitle || title,
        metaDescription: metaDescription || excerpt || title,
        status: status || "published",
        isFeatured: isFeatured === true,
        authorType,
        artistId: artistId || null,
        authorName: customAuthorName || authorName,
        readingTimeMinutes,
      })
      .returning();

    res.status(201).json(newArticle);
  } catch (error: any) {
    console.error("Error creating article:", error);
    if (error.code === "23505" || error.message?.includes("unique")) {
      res.status(400).json({ error: "Já existe um artigo com esse slug / URL" });
      return;
    }
    res.status(500).json({ error: "Erro ao salvar artigo" });
  }
});

// 6. PUT /api/articles/:id - Update article
router.put("/articles/:id", async (req, res): Promise<void> => {
  const isAdmin = req.session?.isAdmin === true;
  const artistId = req.session?.artistId;

  if (!isAdmin && !artistId) {
    res.status(401).json({ error: "Acesso não autorizado" });
    return;
  }

  try {
    const articleId = parseInt(req.params.id, 10);
    if (isNaN(articleId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const [existing] = await db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.id, articleId))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Artigo não encontrado" });
      return;
    }

    // Permission check for artists
    if (!isAdmin) {
      if (existing.artistId !== artistId) {
        res.status(403).json({ error: "Você só pode editar seus próprios artigos" });
        return;
      }
    }

    const {
      title,
      slug,
      excerpt,
      content,
      coverUrl,
      category,
      keywords,
      metaTitle,
      metaDescription,
      status,
      isFeatured,
      authorName,
    } = req.body;

    const readingTimeMinutes = content ? calculateReadingTime(content) : existing.readingTimeMinutes;

    const [updated] = await db
      .update(articlesTable)
      .set({
        ...(title ? { title } : {}),
        ...(slug ? { slug } : {}),
        ...(excerpt !== undefined ? { excerpt } : {}),
        ...(content ? { content, readingTimeMinutes } : {}),
        ...(coverUrl !== undefined ? { coverUrl } : {}),
        ...(category ? { category } : {}),
        ...(keywords !== undefined ? { keywords } : {}),
        ...(metaTitle !== undefined ? { metaTitle } : {}),
        ...(metaDescription !== undefined ? { metaDescription } : {}),
        ...(status ? { status } : {}),
        ...(isFeatured !== undefined ? { isFeatured } : {}),
        ...(authorName ? { authorName } : {}),
        updatedAt: new Date(),
      })
      .where(eq(articlesTable.id, articleId))
      .returning();

    res.json(updated);
  } catch (error: any) {
    console.error("Error updating article:", error);
    res.status(500).json({ error: "Erro ao atualizar artigo" });
  }
});

// 7. DELETE /api/articles/:id - Delete article
router.delete("/articles/:id", async (req, res): Promise<void> => {
  if (!req.session?.isAdmin) {
    res.status(401).json({ error: "Acesso não autorizado" });
    return;
  }

  try {
    const articleId = parseInt(req.params.id, 10);
    if (isNaN(articleId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    await db.delete(articlesTable).where(eq(articlesTable.id, articleId));
    res.json({ message: "Artigo excluído com sucesso" });
  } catch (error) {
    console.error("Error deleting article:", error);
    res.status(500).json({ error: "Erro ao excluir artigo" });
  }
});

// 8. PUT /api/artists/:id/article-permission - Admin toggle artist article publishing permission
router.put("/artists/:id/article-permission", async (req, res): Promise<void> => {
  if (!req.session?.isAdmin) {
    res.status(401).json({ error: "Acesso não autorizado" });
    return;
  }

  try {
    const targetArtistId = parseInt(req.params.id, 10);
    const { canPostArticles } = req.body;

    if (isNaN(targetArtistId) || typeof canPostArticles !== "boolean") {
      res.status(400).json({ error: "Parâmetros inválidos" });
      return;
    }

    const [updatedArtist] = await db
      .update(artistsTable)
      .set({ canPostArticles, updatedAt: new Date() })
      .where(eq(artistsTable.id, targetArtistId))
      .returning();

    res.json(updatedArtist);
  } catch (error) {
    console.error("Error updating artist article permission:", error);
    res.status(500).json({ error: "Erro ao atualizar permissão do artista" });
  }
});

export default router;
