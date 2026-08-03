import { Router, type IRouter } from "express";
import multer from "multer";
import { db, artistsTable, plansTable, subscriptionsTable, couponsTable, appSettingsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { uploadToR2, generateR2Key, r2Enabled } from "../lib/r2-storage.js";
import { getEmailConfig, getPortalUrl } from "../lib/email.js";
import { findOrCreateCustomer, createSubscription, getAsaasCredentials, getSubscriptionPayments, getPaymentPixQrCode } from "../lib/asaas-client.js";

const router: IRouter = Router();

async function convertToJpg(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
}

async function saveImage(buffer: Buffer, folder: string, originalName: string): Promise<string> {
  const jpgBuffer = await convertToJpg(buffer);
  if (r2Enabled) {
    const key = generateR2Key(folder, originalName.replace(/\.\w+$/, ".jpg"));
    return uploadToR2(jpgBuffer, key, "image/jpeg");
  }
  const dir = path.join(process.cwd(), `uploads/${folder}`);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${Date.now()}_${originalName.replace(/\.\w+$/, ".jpg")}`;
  fs.writeFileSync(path.join(dir, filename), jpgBuffer);
  return `/api/uploads/${folder}/${filename}`;
}

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

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, fieldSize: 5 * 1024 * 1024 } });

// Register new artist
router.post(
  "/artists/register",
  upload.fields([
    { name: "capaFile", maxCount: 1 },
    { name: "bannerFile", maxCount: 1 },
  ]),
  async (req, res): Promise<void> => {
    try {
      const { name, email, documento, contato, password, profissao, genero, cidade, instagram, tiktok, spotify, plano, couponCode, billingType } = req.body;

      if (!name || !email || !password || (!documento && plano !== "free")) {
        res.status(400).json({ error: "Nome, email, senha (e CPF/CNPJ para planos pagos) são obrigatórios" });
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
      const plans = await db.select().from(plansTable).where(eq(plansTable.nome, selectedPlano));
      if (plans.length > 0) {
        limiteMusicas = String(plans[0].limiteMusicas);
        personalizacaoPercent = String(plans[0].personalizacaoPercent);
      }

      // Handle file uploads
      const files = req.files as Record<string, Express.Multer.File[]>;
      const capaFile = files?.["capaFile"]?.[0];
      const bannerFile = files?.["bannerFile"]?.[0];

      let capaUrl: string | null = null;
      let bannerUrl: string | null = null;

      if (capaFile) {
        capaUrl = await saveImage(capaFile.buffer, "photos", capaFile.originalname);
      }

      if (bannerFile) {
        bannerUrl = await saveImage(bannerFile.buffer, "banners", bannerFile.originalname);
      }

      // Create artist with unique slug
      const baseSlug = generateSlug(name);
      const slug = await ensureUniqueSlug(baseSlug);

      const plan = plans[0] || null;
      const isPaid = plan && parseFloat(String(plan.preco)) > 0;

      // Process coupon code if provided
      let couponDiscount = 0;
      let validatedCoupon: typeof couponsTable.$inferSelect | null = null;
      if (couponCode && isPaid) {
        try {
          const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, couponCode.toUpperCase()));
          if (coupon && coupon.isActive) {
            const now = new Date();
            const isValid = (!coupon.validFrom || new Date(coupon.validFrom) <= now) &&
              (!coupon.validUntil || new Date(coupon.validUntil) >= now) &&
              (!coupon.maxUses || parseInt(String(coupon.usedCount)) < parseInt(String(coupon.maxUses)));
            if (isValid) {
              const applicablePlans = coupon.applicablePlans;
              const planApplicable = !applicablePlans || applicablePlans.length === 0 || applicablePlans.includes(selectedPlano);
              if (planApplicable) {
                const planPrice = parseFloat(String(plan!.preco));
                if (coupon.discountType === "percentage") {
                  couponDiscount = (planPrice * parseFloat(String(coupon.discountValue))) / 100;
                } else {
                  couponDiscount = parseFloat(String(coupon.discountValue));
                }
                validatedCoupon = coupon;
              }
            }
          }
        } catch (e) {
          console.error("Error validating coupon during registration:", e);
        }
      }

      if (validatedCoupon) {
        await db.update(couponsTable).set({
          usedCount: sql`${couponsTable.usedCount} + 1`,
        }).where(eq(couponsTable.code, validatedCoupon.code));
      }

      const subscriptionAmount = isPaid ? Math.max(0, parseFloat(String(plan!.preco)) - couponDiscount) : 0;
      const paidPlanActivatedDirectly = isPaid && subscriptionAmount < 5.00;

      const [artist] = await db
        .insert(artistsTable)
        .values({
          name,
          slug,
          email,
          documento,
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
          planoAtivo: !isPaid || paidPlanActivatedDirectly,
          limiteMusicas: (isPaid && !paidPlanActivatedDirectly) ? "0" : limiteMusicas,
          personalizacaoPercent: (isPaid && !paidPlanActivatedDirectly) ? "0" : personalizacaoPercent,
          musicaCount: "0",
        })
        .returning();

      // Set session
      req.session.artistId = artist.id;
      req.session.artistEmail = artist.email;
      req.session.artistName = artist.name;

      req.session.save(async (err) => {
        if (err) {
          console.error("Error saving session:", err);
          res.status(500).json({ error: "Erro ao salvar sessão" });
          return;
        }

        let invoiceUrl: string | null = null;

        // Create Asaas subscription for paid plans
        if (isPaid) {
          try {
            if (paidPlanActivatedDirectly) {
              // Direct activation: plan already active from insert, just record subscription
              const expiresAt = new Date();
              expiresAt.setMonth(expiresAt.getMonth() + 1);
              await db.insert(subscriptionsTable).values({
                artistId: String(artist.id),
                planNome: selectedPlano,
                asaasSubscriptionId: "direct_activation_" + Date.now(),
                status: "active",
                amount: String(subscriptionAmount),
                startedAt: new Date(),
                expiresAt,
                couponCode: validatedCoupon?.code ?? null,
              });
            } else {
              const cleanDoc = (documento || "").replace(/\D/g, "");
              const customer = await findOrCreateCustomer(name, email, cleanDoc || undefined, contato || undefined);

              await db.update(artistsTable).set({ asaasCustomerId: customer.id }).where(eq(artistsTable.id, artist.id));

              const { portalUrl } = await getAsaasCredentials();
              const callbackUrl = portalUrl ? `${portalUrl}/artista/dashboard?pagamento=sucesso` : undefined;

              const finalBillingType = (billingType === "PIX") ? "PIX" : "CREDIT_CARD";
              const subscription = await createSubscription({
                customerId: customer.id,
                value: subscriptionAmount,
                billingType: finalBillingType,
                description: `Plano ${plan!.label} — Portal do Artista`,
                externalReference: `${artist.id}-${selectedPlano}`,
                callbackUrl,
              });

              await db.insert(subscriptionsTable).values({
                artistId: String(artist.id),
                planNome: selectedPlano,
                asaasSubscriptionId: subscription.id,
                status: "pending",
                amount: String(subscriptionAmount),
                billingType: finalBillingType,
                startedAt: new Date(),
                couponCode: validatedCoupon?.code ?? null,
              });

              const payments = await getSubscriptionPayments(subscription.id);
              const firstPayment = payments.data?.[0];
              invoiceUrl = firstPayment?.invoiceUrl ?? null;

              var pixDetails = null;
              if (finalBillingType === "PIX" && firstPayment) {
                try {
                  pixDetails = await getPaymentPixQrCode(firstPayment.id);
                } catch (err) {
                  console.warn("Erro ao buscar QR Code do PIX:", err);
                }
              }
            }
          } catch (paymentErr) {
            console.error("Error creating payment for new artist:", paymentErr);
          }
        }

        // Send welcome email
        const { resend, from } = await getEmailConfig();
        if (resend) {
          const portalUrl = await getPortalUrl();
          const profileUrl = `${portalUrl}/a/${artist.slug}`;
          try {
            await resend.emails.send({
              from,
              to: artist.email,
              subject: `Bem-vindo ao Portal do Artista, ${artist.name}!`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #7c3aed;">🎤 Bem-vindo ao Portal do Artista!</h2>
                  <p>Olá, <strong>${artist.name}</strong>!</p>
                  <p>Sua conta foi criada com sucesso. Agora você pode:</p>
                  <ul style="line-height: 1.8;">
                    <li>Cadastrar suas músicas</li>
                    <li>Personalizar seu perfil público</li>
                    <li>Receber interesses de contratantes</li>
                    <li>Gerenciar sua carreira musical</li>
                  </ul>
                  <a href="${profileUrl}" style="display: inline-block; background-color: #7c3aed; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
                    Ver Meu Perfil
                  </a>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                  <p style="color: #999; font-size: 12px;">Portal do Artista - Conectando cantores e compositores a ouvintes e contratantes</p>
                </div>
              `,
            });
          } catch (emailErr) {
            console.error("Error sending welcome email:", emailErr);
          }
        }

        res.status(201).json({
          id: artist.id,
          name: artist.name,
          email: artist.email,
          profissao: artist.profissao,
          plano: artist.plano,
          planoAtivo: artist.planoAtivo,
          invoiceUrl,
          pixDetails: (typeof pixDetails !== 'undefined' ? pixDetails : null),
        });
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

    req.session.save((err) => {
      if (err) {
        console.error("Error saving session:", err);
        res.status(500).json({ error: "Erro ao salvar sessão" });
        return;
      }
      res.json({
        id: artist.id,
        name: artist.name,
        email: artist.email,
        profissao: artist.profissao,
        plano: artist.plano,
      });
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

    const plans = await db.select().from(plansTable).where(eq(plansTable.nome, artist.plano));
    const plan = plans[0];

    const isPaidActive = artist.planoAtivo;

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
        documento: artist.documento,
        slug: artist.slug,
        capaUrl: artist.capaUrl,
        bannerUrl: artist.bannerUrl,
        biografia: artist.biografia,
        fonte: artist.fonte,
        cor: artist.cor,
        layout: artist.layout,
        player: artist.player,
        playerGradient: artist.playerGradient,
        playerCor: artist.playerCor,
        plano: artist.plano,
        planoAtivo: artist.planoAtivo,
        limiteMusicas: artist.limiteMusicas,
        musicaCount: artist.musicaCount,
        vipSenha: artist.vipSenha,
        cardStyle: (artist as any).cardStyle,
        personalizacaoPercent: isPaidActive ? (plan?.personalizacaoPercent ?? "10") : "10",
        canCustomizeFont: isPaidActive ? (plan?.canCustomizeFont ?? true) : false,
        canCustomizeBackground: isPaidActive ? (plan?.canCustomizeBackground ?? true) : false,
        canCustomizeTextColor: isPaidActive ? (plan?.canCustomizeTextColor ?? true) : false,
        canCustomizePlayerStyle: isPaidActive ? (plan?.canCustomizePlayerStyle ?? true) : false,
        canCustomizePlayerColor: isPaidActive ? (plan?.canCustomizePlayerColor ?? true) : false,
        canUploadBanner: isPaidActive ? (plan?.canUploadBanner ?? false) : false,
        canUploadProfilePhoto: isPaidActive ? (plan?.canUploadProfilePhoto ?? false) : false,
        aiQueriesCount: artist.aiQueriesCount,
        aiCreditsLimit: isPaidActive ? (plan?.aiCreditsLimit ?? 10) : 10,
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
      const { name, profissao, cidade, instagram, tiktok, spotify, contato, documento, biografia, fonte, cor, layout, player, vipSenha, playerGradient, playerCor, cardStyle } = req.body;

      const artists = await db.select().from(artistsTable).where(eq(artistsTable.id, req.session.artistId));
      if (artists.length === 0) {
        res.status(404).json({ error: "Artista não encontrado" });
        return;
      }

      const current = artists[0];

      // Check plan permissions
      const planRows = await db.select().from(plansTable).where(eq(plansTable.nome, current.plano));
      const plan = current.planoAtivo 
        ? (planRows[0] || { canUploadBanner: false, canUploadProfilePhoto: false, canCustomizeFont: false, canCustomizeBackground: false, canCustomizeTextColor: false, canCustomizePlayerStyle: false, canCustomizePlayerColor: false })
        : { canUploadBanner: false, canUploadProfilePhoto: false, canCustomizeFont: false, canCustomizeBackground: false, canCustomizeTextColor: false, canCustomizePlayerStyle: false, canCustomizePlayerColor: false };

      let capaUrl = current.capaUrl;
      let bannerUrl = current.bannerUrl;

      const files = req.files as Record<string, Express.Multer.File[]>;
      const capaFile = files?.["capaFile"]?.[0];
      const bannerFile = files?.["bannerFile"]?.[0];

      if (capaFile) {
        if (!plan.canUploadProfilePhoto) {
          res.status(403).json({ error: "Seu plano não permite upload de foto de perfil." });
          return;
        }
        capaUrl = await saveImage(capaFile.buffer, "photos", capaFile.originalname);
      }

      if (bannerFile) {
        if (!plan.canUploadBanner) {
          res.status(403).json({ error: "Seu plano não permite upload de banner." });
          return;
        }
        bannerUrl = await saveImage(bannerFile.buffer, "banners", bannerFile.originalname);
      }

      // Enforce plan permission checks for customization fields
      const finalFonte = fonte !== undefined ? (plan.canCustomizeFont ? fonte : current.fonte) : current.fonte;
      const finalCor = cor !== undefined ? (plan.canCustomizeBackground ? cor : current.cor) : current.cor;
      const finalLayout = layout !== undefined ? (plan.canCustomizeBackground ? layout : current.layout) : current.layout;
      const finalPlayer = player !== undefined ? (plan.canCustomizePlayerStyle ? player : current.player) : current.player;
      const finalPlayerGradient = playerGradient !== undefined ? (plan.canCustomizePlayerColor ? playerGradient : current.playerGradient) : current.playerGradient;
      const finalPlayerCor = playerCor !== undefined ? (plan.canCustomizePlayerColor ? playerCor : current.playerCor) : current.playerCor;
      const finalCardStyle = cardStyle !== undefined ? (plan.canCustomizeBackground ? cardStyle : (current as any).cardStyle) : (current as any).cardStyle;

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
          documento: documento !== undefined ? documento : current.documento,
          biografia: biografia !== undefined ? biografia : current.biografia,
          fonte: finalFonte,
          cor: finalCor,
          layout: finalLayout,
          player: finalPlayer,
          playerGradient: finalPlayerGradient,
          playerCor: finalPlayerCor,
          vipSenha: vipSenha !== undefined ? vipSenha : current.vipSenha,
          cardStyle: finalCardStyle,
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
        documento: updated.documento,
        biografia: updated.biografia,
        slug: updated.slug,
        capaUrl: updated.capaUrl,
        bannerUrl: updated.bannerUrl,
        fonte: updated.fonte,
        cor: updated.cor,
        layout: updated.layout,
        player: updated.player,
        playerGradient: updated.playerGradient,
        playerCor: updated.playerCor,
        cardStyle: (updated as any).cardStyle,
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

    const artist = artists[0];

    if (artist.vipSenha && artist.vipSenha === code) {
      res.json({ valid: true, message: "Código válido" });
      return;
    }

    const { songsTable } = await import("@workspace/db");
    const vipSongs = await db
      .select()
      .from(songsTable)
      .where(eq(songsTable.artistaId, artistId));

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
const getPublicArtists = async (req: any, res: any): Promise<void> => {
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

    // Shuffle helper (Fisher-Yates)
    function shuffleArray<T>(array: T[]): T[] {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    // Sort: prioritizes profiles with photo, then by plan tier, and randomizes/shuffles within each tier.
    const planoOrder: Record<string, number> = { premium: 5, pro: 4, intermediario: 3, basico: 2, free: 1 };
    
    const artistsWithScores = artists.map(a => {
      // Check if they uploaded a custom profile photo (capaUrl is present and is not empty or default)
      const hasPhoto = a.capaUrl && a.capaUrl !== "" && !a.capaUrl.includes("default-cover");
      const score = (planoOrder[a.plano] || 0) + (hasPhoto ? 100 : 0);
      return { artist: a, score };
    });

    // Group by final score
    const groups: Record<number, any[]> = {};
    artistsWithScores.forEach(item => {
      if (!groups[item.score]) {
        groups[item.score] = [];
      }
      groups[item.score].push(item.artist);
    });

    // Sort scores descending, shuffle each group, and merge
    const sortedScores = Object.keys(groups)
      .map(Number)
      .sort((a, b) => b - a);

    let sortedArtists: any[] = [];
    sortedScores.forEach(score => {
      const shuffledGroup = shuffleArray(groups[score]);
      sortedArtists = sortedArtists.concat(shuffledGroup);
    });

    res.json(sortedArtists);
  } catch (error) {
    console.error("Error fetching public artists:", error);
    res.status(500).json({ error: "Erro ao buscar artistas" });
  }
};

router.get("/artists", getPublicArtists);
router.get("/artists/public", getPublicArtists);

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
      biografia: artist.biografia,
      instagram: artist.instagram,
      tiktok: artist.tiktok,
      spotify: artist.spotify,
      capaUrl: artist.capaUrl,
      bannerUrl: artist.bannerUrl,
      plano: artist.plano,
      fonte: artist.fonte,
      cor: artist.cor,
      layout: artist.layout,
      playerGradient: artist.playerGradient,
      playerCor: artist.playerCor,
      cardStyle: (artist as any).cardStyle,
    });
  } catch (error) {
    console.error("Error fetching artist:", error);
    res.status(500).json({ error: "Erro ao buscar artista" });
  }
});

// POST /artists/mentor - Conversa com a Vivi (Mentora IA)
router.post("/artists/mentor", async (req, res): Promise<void> => {
  if (!req.session.artistId) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const { messages, tool } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "Parâmetro 'messages' é obrigatório e deve ser um array." });
      return;
    }

    // 1. Obter configurações da OpenAI no appSettingsTable
    const settings = await db
      .select({ key: appSettingsTable.key, value: appSettingsTable.value })
      .from(appSettingsTable)
      .where(eq(appSettingsTable.category, "portal"));

    const openaiEnabledSetting = settings.find(s => s.key === "openai_enabled")?.value;
    const openaiApiKey = settings.find(s => s.key === "openai_api_key")?.value;

    if (openaiEnabledSetting !== "true") {
      res.status(400).json({ error: "A mentora virtual Vivi está desativada temporariamente pelo administrador." });
      return;
    }

    if (!openaiApiKey) {
      res.status(500).json({ error: "A chave de API da OpenAI não foi configurada no painel administrativo." });
      return;
    }

    // 2. Obter artista e seu plano atual para verificar os créditos
    const artists = await db.select().from(artistsTable).where(eq(artistsTable.id, req.session.artistId));
    if (artists.length === 0) {
      res.status(404).json({ error: "Artista não encontrado" });
      return;
    }
    const artist = artists[0];

    const plans = await db.select().from(plansTable).where(eq(plansTable.nome, artist.plano));
    const plan = plans[0];
    const aiLimit = plan?.aiCreditsLimit ?? 10;

    // 3. Verificar reset mensal dos créditos (30 dias)
    const resetDate = new Date(artist.aiQueriesResetAt);
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    const now = new Date();

    let currentUsage = artist.aiQueriesCount;
    if (now.getTime() - resetDate.getTime() >= thirtyDaysInMs) {
      // Reseta contagem
      currentUsage = 0;
      await db
        .update(artistsTable)
        .set({
          aiQueriesCount: 0,
          aiQueriesResetAt: now
        })
        .where(eq(artistsTable.id, artist.id));
    }

    // 4. Verificar se tem saldo
    if (currentUsage >= aiLimit) {
      res.status(403).json({
        error: `Você atingiu o limite de consultas de Inteligência Artificial do seu plano (${aiLimit} por mês). Faça um upgrade para continuar conversando com a Vivi!`
      });
      return;
    }

    // 5. Definir o contexto do plano do artista
    let planContext = "";
    if (artist.plano === "free") {
      planContext = `O artista ${artist.name} está no plano GRATUITO (Free). Esse plano possui limite de até 2 músicas e 10 consultas de IA. Incentive-o de forma amigável e motivadora a conhecer as vantagens de fazer upgrade para o plano Básico (20 músicas) ou Premium (200 músicas) para ter personalização de cores/fontes do catálogo e mais espaço.`;
    } else if (artist.plano === "basico") {
      planContext = `O artista ${artist.name} está no plano BÁSICO. Esse plano permite até 20 músicas no catálogo e 30 consultas de IA. Dê os parabéns por ter dado esse passo profissional e ajude-o a divulgar.`;
    } else if (artist.plano === "intermediario" || artist.plano === "pro") {
      planContext = `O artista ${artist.name} está no plano PRO/INTERMEDIÁRIO. Dê dicas mais completas e avançadas sobre divulgação e engajamento.`;
    } else if (artist.plano === "premium") {
      planContext = `O artista ${artist.name} está no plano PREMIUM. Esse plano é o máximo completo com até 200 músicas, 100% de personalização e 200 consultas de IA. Trate-o como um artista VIP com recursos totais.`;
    }

    const planHeader = `[INFORMAÇÃO DO ARTISTA]
Nome do artista: ${artist.name}
Plano atual: ${artist.plano.toUpperCase()}
${planContext}

`;

    // 6. Definir o system prompt baseado na ferramenta selecionada
    let systemPrompt = `Você é a Vivi, a mentora virtual do PORTALDOARTISTA.COM. Você é uma parceira ideal para impulsionar a carreira, organizar metas, sugerir estratégias de marketing musical e ajudar cantores, compositores e bandas a alcançarem mais fãs.
Fale de forma simples, motivadora, orientada a resultados e forneça dicas extremamente práticas e acionáveis, não respostas genéricas. Nunca responda com termos vagos. Mantenha as respostas focadas e evite textos excessivamente longos.`;

    if (tool === "biografia") {
      systemPrompt = `Você é a Vivi, mentora virtual oficial da plataforma Portal do Artista (PORTALDOARTISTA.COM). Sua missão é ajudar este artista a aprimorar, reescrever ou expandir sua biografia/perfil profissional de forma a chamar a atenção de contratantes, produtores e fãs. Dê sugestões de melhoria práticas, organizadas e estruturadas em parágrafos claros.`;
    } else if (tool === "comercial") {
      systemPrompt = `Você é a Vivi, mentora virtual oficial do Portal do Artista. Analise o potencial comercial da letra, tema ou prévia da música enviada pelo artista. Dê um feedback honesto, amigável e profissional sobre o apelo ao público, possíveis nichos e sugestões de ganchos (hooks) ou ajustes de rima/ritmo para tornar a música ainda mais vendável.`;
    } else if (tool === "legenda") {
      systemPrompt = `Você é a Vivi, mentora virtual oficial do Portal do Artista. Escreva legendas cativantes e estruturadas com emojis e hashtags ideais para que o artista publique no Instagram, TikTok e Facebook. Dê duas ou três opções com tons ligeiramente diferentes (ex: um focado em contar a história da música, outro focado em engajamento).`;
    } else if (tool === "reels") {
      systemPrompt = `Você é a Vivi, mentora virtual oficial do Portal do Artista. Escreva um roteiro estruturado passo a passo para um vídeo curto de Reels/TikTok (de até 60 segundos). Forneça indicações de imagem, legenda visual e o roteiro exato do que o artista deve falar para engajar o público e promover sua música.`;
    } else if (tool === "hashtags") {
      systemPrompt = `Você é a Vivi, mentora virtual oficial do Portal do Artista. Crie uma lista excelente de hashtags para posts de divulgação do artista, organizadas por categorias (nicho musical, gerais, engajamento) e explique brevemente como usá-las para aumentar o alcance.`;
    } else if (tool === "release") {
      systemPrompt = `Você é a Vivi, mentora virtual oficial do Portal do Artista. Crie um press-release (comunicado de imprensa) profissional que o artista possa enviar para rádios, blogs e jornais locais promovendo seu novo trabalho. Inclua título atraente, data de embargo, narrativa instigante e local para contatos de assessoria.`;
    } else if (tool === "titulos") {
      systemPrompt = `Você é a Vivi, mentora virtual oficial do Portal do Artista. Gere 5 sugestões de títulos criativos, marcantes e vendáveis para a música do artista com base nas palavras-chave, tema ou trecho de letra compartilhado por ele.`;
    }

    // 7. Fazer a requisição à OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: planHeader + systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI API error response:", errText);
      res.status(502).json({ error: "Erro na resposta da inteligência artificial. Tente novamente mais tarde." });
      return;
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "";

    // 7. Incrementar o saldo consumido de IA do artista
    const newUsageCount = currentUsage + 1;
    await db
      .update(artistsTable)
      .set({ aiQueriesCount: newUsageCount })
      .where(eq(artistsTable.id, artist.id));

    res.json({
      reply,
      aiQueriesCount: newUsageCount,
      aiCreditsLimit: aiLimit
    });

  } catch (error) {
    console.error("Error running AI mentor query:", error);
    res.status(500).json({ error: "Erro ao processar consulta com o mentor." });
  }
});

// GET /showcase/artists-vitrine - Vitrine dinâmica de artistas (apenas com foto de capa)
router.get("/showcase/artists-vitrine", async (_req, res): Promise<void> => {
  try {
    const allPublic = await db
      .select({
        id: artistsTable.id,
        name: artistsTable.name,
        slug: artistsTable.slug,
        profissao: artistsTable.profissao,
        cidade: artistsTable.cidade,
        genero: artistsTable.genero,
        capaUrl: artistsTable.capaUrl,
        bannerUrl: artistsTable.bannerUrl,
        biografia: artistsTable.biografia,
        plano: artistsTable.plano,
      })
      .from(artistsTable)
      .where(sql`${artistsTable.capaUrl} IS NOT NULL AND ${artistsTable.capaUrl} != '' AND ${artistsTable.planoAtivo} = true`);

    // Embaralhamento dinâmico baseado no dia/hora para distribuição justa
    const shuffled = [...allPublic].sort(() => Math.random() - 0.5);

    res.json(shuffled);
  } catch (error) {
    console.error("Error fetching vitrine artists:", error);
    res.status(500).json({ error: "Erro ao buscar vitrine" });
  }
});

// GET /activity-feed - Feed de atividades recentes
router.get("/activity-feed", async (_req, res): Promise<void> => {
  try {
    const { songsTable } = await import("@workspace/db");

    const recentArtists = await db
      .select({
        id: artistsTable.id,
        name: artistsTable.name,
        slug: artistsTable.slug,
        capaUrl: artistsTable.capaUrl,
        createdAt: artistsTable.createdAt,
      })
      .from(artistsTable)
      .where(eq(artistsTable.planoAtivo, true))
      .orderBy(sql`${artistsTable.createdAt} DESC`)
      .limit(5);

    const recentSongs = await db
      .select({
        id: songsTable.id,
        titulo: songsTable.titulo,
        capaUrl: songsTable.capaUrl,
        artistaId: songsTable.artistaId,
        createdAt: songsTable.createdAt,
      })
      .from(songsTable)
      .orderBy(sql`${songsTable.createdAt} DESC`)
      .limit(5);

    const feed = [
      ...recentArtists.map(a => ({
        type: "ARTIST_JOINED",
        title: `${a.name} criou perfil no portal`,
        subtitle: a.slug ? `portaldoartista.com/a/${a.slug}` : "Novo artista",
        time: a.createdAt,
        avatar: a.capaUrl,
        slug: a.slug,
      })),
      ...recentSongs.map(s => ({
        type: "SONG_PUBLISHED",
        title: `Nova música: "${s.titulo}"`,
        subtitle: "Lançamento recente",
        time: s.createdAt,
        avatar: s.capaUrl,
      }))
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);

    res.json(feed);
  } catch (error) {
    console.error("Error fetching activity feed:", error);
    res.status(500).json({ error: "Erro ao buscar feed" });
  }
});

export default router;
