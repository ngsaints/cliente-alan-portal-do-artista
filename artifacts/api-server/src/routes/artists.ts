import { Router, type IRouter } from "express";
import multer from "multer";
import { db, artistsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import { uploadToR2, generateR2Key, r2Enabled } from "../lib/r2-storage.js";

const router: IRouter = Router();

// Helper function to generate slug from name
function generateSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^\w\s-]/g, "") // remove special chars
    .replace(/\s+/g, "-") // replace spaces with -
    .replace(/-+/g, "-") // remove multiple -
    .trim();
  return slug;
}

// Helper to ensure unique slug
async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const existing = await db
      .select({ id: artistsTable.id })
      .from(artistsTable)
      .where(eq(artistsTable.slug, slug))
      .limit(1);
    
    if (existing.length === 0) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Register new artist
router.post(
  "/artists/register",
  upload.fields([
    { name: "capaFile", maxCount: 1 },
    { name: "bannerFile", maxCount: 1 },
  ]),
  async (req, res): Promise<void> => {
    try {
      const { name, email, contato, password, profissao, genero, cidade, instagram, tiktok, spotify, plano } = req.body;

      if (!name || !email || !password) {
        res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
        return;
      }

      // Check if artist already exists
      const existingArtist = await db.select().from(artistsTable).where(eq(artistsTable.email, email));
      if (existingArtist.length > 0) {
        res.status(409).json({ error: "Email já cadastrado" });
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Get plan limits
      let limiteMusicas = "2";
      let personalizacaoPercent = "10";
      const selectedPlano = plano || "free";
      
      // Buscar configurações do plano no banco
      const { plansTable } = await import("@workspace/db");
      const plans = await db.select().from(plansTable).where(eq(plansTable.nome, selectedPlano));
      if (plans.length > 0) {
        limiteMusicas = String(plans[0].limiteMusicas);
        personalizacaoPercent = String(plans[0].personalizaoPercent);
      }

      // Handle file uploads
      const files = req.files as Record<string, Express.Multer.File[]>;
      const capaFile = files?.["capaFile"]?.[0];
      const bannerFile = files?.["bannerFile"]?.[0];

      let capaUrl: string | null = null;
      let bannerUrl: string | null = null;

      if (capaFile) {
        if (r2Enabled) {
          const key = generateR2Key("photos", capaFile.originalname);
          capaUrl = await uploadToR2(capaFile.buffer, key, capaFile.mimetype);
        } else {
          const dir = path.join(process.cwd(), "uploads/photos");
          fs.mkdirSync(dir, { recursive: true });
          const filename = `${Date.now()}_${capaFile.originalname}`;
          fs.writeFileSync(path.join(dir, filename), capaFile.buffer);
          capaUrl = `/api/uploads/photos/${filename}`;
        }
      }

      if (bannerFile) {
        if (r2Enabled) {
          const key = generateR2Key("banners", bannerFile.originalname);
          bannerUrl = await uploadToR2(bannerFile.buffer, key, bannerFile.mimetype);
        } else {
          const dir = path.join(process.cwd(), "uploads/banners");
          fs.mkdirSync(dir, { recursive: true });
          const filename = `${Date.now()}_${bannerFile.originalname}`;
          fs.writeFileSync(path.join(dir, filename), bannerFile.buffer);
          bannerUrl = `/api/uploads/banners/${filename}`;
        }
      }

      // Create artist with unique slug
      const baseSlug = generateSlug(name);
      const slug = await ensureUniqueSlug(baseSlug);

      const [artist] = await db
        .insert(artistsTable)
        .values({
          name,
          slug,
          email,
          password: hashedPassword,
          profissao: profissao || "Cantor",
          genero: genero || null,
          cidade: cidade || null,
          contato: contato || null,
          instagram: instagram || null,
          tiktok: tiktok || null,
          spotify: spotify || null,
          capaUrl,
          bannerUrl,
          plano: selectedPlano,
          limiteMusicas,
          personalizacaoPercent,
          musicaCount: "0",
        })
        .returning();

      // Set session
      req.session.artistId = artist.id;
      req.session.artistEmail = artist.email;
      req.session.artistName = artist.name;

      res.status(201).json({
        id: artist.id,
        name: artist.name,
        email: artist.email,
        profissao: artist.profissao,
        plano: artist.plano,
      });
    } catch (error) {
      console.error("Error registering artist:", error);
      res.status(500).json({ error: "Erro ao registrar artista" });
    }
  }
);

// Login artist
router.post("/artists/login", async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email e senha são obrigatórios" });
      return;
    }

    // Find artist
    const artists = await db.select().from(artistsTable).where(eq(artistsTable.email, email));
    if (artists.length === 0) {
      res.status(401).json({ error: "Email ou senha inválidos" });
      return;
    }

    const artist = artists[0];

    // Check password
    const validPassword = await bcrypt.compare(password, artist.password);
    if (!validPassword) {
      res.status(401).json({ error: "Email ou senha inválidos" });
      return;
    }

    // Set session
    req.session.artistId = artist.id;
    req.session.artistEmail = artist.email;
    req.session.artistName = artist.name;

    res.json({
      id: artist.id,
      name: artist.name,
      email: artist.email,
      profissao: artist.profissao,
      plano: artist.plano,
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Erro ao fazer login" });
  }
});

// Logout artist
router.post("/artists/logout", async (req, res): Promise<void> => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Erro ao fazer logout" });
      return;
    }
    res.json({ message: "Logout realizado com sucesso" });
  });
});

// Get current artist status
router.get("/artists/status", async (req, res): Promise<void> => {
  if (!req.session.artistId) {
    res.json({ loggedIn: false });
    return;
  }

  try {
    const artists = await db.select().from(artistsTable).where(eq(artistsTable.id, req.session.artistId));
    if (artists.length === 0) {
      req.session.destroy(() => {});
      res.json({ loggedIn: false });
      return;
    }

    const artist = artists[0];
    res.json({
      loggedIn: true,
      artist: {
        id: artist.id,
        name: artist.name,
        email: artist.email,
        profissao: artist.profissao,
        cidade: artist.cidade,
        instagram: artist.instagram,
        tiktok: artist.tiktok,
        spotify: artist.spotify,
        contato: artist.contato,
        slug: artist.slug,
        capaUrl: artist.capaUrl,
        bannerUrl: artist.bannerUrl,
        fonte: artist.fonte,
        cor: artist.cor,
        layout: artist.layout,
        player: artist.player,
        plano: artist.plano,
        limiteMusicas: artist.limiteMusicas,
        musicaCount: artist.musicaCount,
      },
    });
  } catch (error) {
    console.error("Error getting artist status:", error);
    res.status(500).json({ error: "Erro ao obter status" });
  }
});

// Update artist profile
router.put(
  "/artists/profile",
  upload.fields([
    { name: "capaFile", maxCount: 1 },
    { name: "bannerFile", maxCount: 1 },
  ]),
  async (req, res): Promise<void> => {
    if (!req.session.artistId) {
      res.status(401).json({ error: "Não autorizado" });
      return;
    }

    try {
      const { name, profissao, cidade, instagram, tiktok, spotify, contato, fonte, cor, layout, player } = req.body;

      const artists = await db.select().from(artistsTable).where(eq(artistsTable.id, req.session.artistId));
      if (artists.length === 0) {
        res.status(404).json({ error: "Artista não encontrado" });
        return;
      }

      const current = artists[0];
      let capaUrl = current.capaUrl;
      let bannerUrl = current.bannerUrl;

      const files = req.files as Record<string, Express.Multer.File[]>;
      const capaFile = files?.["capaFile"]?.[0];
      const bannerFile = files?.["bannerFile"]?.[0];

      if (capaFile) {
        if (r2Enabled) {
          const key = generateR2Key("photos", capaFile.originalname);
          capaUrl = await uploadToR2(capaFile.buffer, key, capaFile.mimetype);
        } else {
          const dir = path.join(process.cwd(), "uploads/photos");
          fs.mkdirSync(dir, { recursive: true });
          const filename = `${Date.now()}_${capaFile.originalname}`;
          fs.writeFileSync(path.join(dir, filename), capaFile.buffer);
          capaUrl = `/api/uploads/photos/${filename}`;
        }
      }

      if (bannerFile) {
        if (r2Enabled) {
          const key = generateR2Key("banners", bannerFile.originalname);
          bannerUrl = await uploadToR2(bannerFile.buffer, key, bannerFile.mimetype);
        } else {
          const dir = path.join(process.cwd(), "uploads/banners");
          fs.mkdirSync(dir, { recursive: true });
          const filename = `${Date.now()}_${bannerFile.originalname}`;
          fs.writeFileSync(path.join(dir, filename), bannerFile.buffer);
          bannerUrl = `/api/uploads/banners/${filename}`;
        }
      }

      const [updated] = await db
        .update(artistsTable)
        .set({
          name: name ?? current.name,
          profissao: profissao ?? current.profissao,
          cidade: cidade ?? current.cidade,
          instagram: instagram ?? current.instagram,
          tiktok: tiktok ?? current.tiktok,
          spotify: spotify ?? current.spotify,
          contato: contato ?? current.contato,
          fonte: fonte ?? current.fonte,
          cor: cor ?? current.cor,
          layout: layout ?? current.layout,
          player: player ?? current.player,
          capaUrl,
          bannerUrl,
          updatedAt: new Date(),
        })
        .where(eq(artistsTable.id, req.session.artistId))
        .returning();

      res.json({
        id: updated.id,
        name: updated.name,
        profissao: updated.profissao,
        cidade: updated.cidade,
        instagram: updated.instagram,
        tiktok: updated.tiktok,
        spotify: updated.spotify,
        contato: updated.contato,
        slug: updated.slug,
        capaUrl: updated.capaUrl,
        bannerUrl: updated.bannerUrl,
        fonte: updated.fonte,
        cor: updated.cor,
        layout: updated.layout,
        player: updated.player,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Erro ao atualizar perfil" });
    }
  }
);

// Verify VIP code for an artist's content
router.post("/artists/vip-verify/:artistId", async (req, res): Promise<void> => {
  try {
    const { artistId } = req.params;
    const { code } = req.body;

    if (!code) {
      res.status(400).json({ error: "Código é obrigatório" });
      return;
    }

    // Find the artist
    const artists = await db.select().from(artistsTable).where(eq(artistsTable.id, parseInt(artistId)));
    
    if (artists.length === 0) {
      res.status(404).json({ error: "Artista não encontrado" });
      return;
    }

    // Check if any of the artist's VIP songs have this code
    const { songsTable } = await import("@workspace/db");
    const vipSongs = await db
      .select()
      .from(songsTable)
      .where(eq(songsTable.artistaId, artistId));

    // Check if code matches any VIP song's code
    const hasAccess = vipSongs.some(song => song.isVip && song.vipCode === code);

    if (hasAccess) {
      res.json({ valid: true, message: "Código válido" });
    } else {
      res.status(401).json({ error: "Código inválido" });
    }
  } catch (error) {
    console.error("Error verifying VIP code:", error);
    res.status(500).json({ error: "Erro ao verificar código" });
  }
});

// GET /artists/public - List public artists
router.get("/artists/public", async (req, res): Promise<void> => {
  try {
    const { genero, plano, search } = req.query;
    
    let artists = await db
      .select({
        id: artistsTable.id,
        name: artistsTable.name,
        slug: artistsTable.slug,
        profissao: artistsTable.profissao,
        cidade: artistsTable.cidade,
        genero: artistsTable.genero,
        instagram: artistsTable.instagram,
        tiktok: artistsTable.tiktok,
        capaUrl: artistsTable.capaUrl,
        plano: artistsTable.plano,
        planoAtivo: artistsTable.planoAtivo,
        musicaCount: artistsTable.musicaCount,
      })
      .from(artistsTable)
      .where(eq(artistsTable.planoAtivo, true));

    // Filter by search query (name, cidade, genero)
    if (search && typeof search === "string" && search.trim()) {
      const searchLower = search.toLowerCase().trim();
      artists = artists.filter(a => 
        a.name?.toLowerCase().includes(searchLower) ||
        a.cidade?.toLowerCase().includes(searchLower) ||
        a.genero?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by genre if provided
    if (genero && genero !== "todos") {
      artists = artists.filter(a => a.genero === genero);
    }

    // Sort by plan priority (premium > pro > intermediario > basico > free)
    const planoOrder: Record<string, number> = { premium: 5, pro: 4, intermediario: 3, basico: 2, free: 1 };
    artists.sort((a, b) => (planoOrder[b.plano] || 0) - (planoOrder[a.plano] || 0));

    res.json(artists);
  } catch (error) {
    console.error("Error fetching public artists:", error);
    res.status(500).json({ error: "Erro ao buscar artistas" });
  }
});

// GET /artists/:identifier - Get artist by ID or slug
router.get("/artists/:identifier", async (req, res): Promise<void> => {
  try {
    const { identifier } = req.params;
    
    // Try to find by ID (number) or slug
    let artist;
    if (/^\d+$/.test(identifier)) {
      // It's a number - search by ID
      const artists = await db
        .select()
        .from(artistsTable)
        .where(eq(artistsTable.id, parseInt(identifier)));
      artist = artists[0];
    } else {
      // It's a slug - search by slug
      const artists = await db
        .select()
        .from(artistsTable)
        .where(eq(artistsTable.slug, identifier));
      artist = artists[0];
    }
    
    if (!artist) {
      res.status(404).json({ error: "Artista não encontrado" });
      return;
    }
    
    res.json({
      id: artist.id,
      slug: artist.slug,
      name: artist.name,
      profissao: artist.profissao,
      email: artist.email,
      contato: artist.contato,
      cidade: artist.cidade,
      genero: artist.genero,
      instagram: artist.instagram,
      tiktok: artist.tiktok,
      spotify: artist.spotify,
      capaUrl: artist.capaUrl,
      bannerUrl: artist.bannerUrl,
      plano: artist.plano,
    });
  } catch (error) {
    console.error("Error fetching artist:", error);
    res.status(500).json({ error: "Erro ao buscar artista" });
  }
});

export default router;
