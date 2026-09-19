import { db, artistsTable, appSettingsTable, subscriptionsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

export type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  price: number;
  pricePerCredit: number;
  badge: string;
  description: string;
};

export const DEFAULT_CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "pack_5",
    name: "Pacote Start",
    credits: 5,
    price: 19.9,
    pricePerCredit: 3.98,
    badge: "Econômico",
    description: "5 demos musicais completas geradas por IA",
  },
  {
    id: "pack_15",
    name: "Pacote Pro Compositor",
    credits: 15,
    price: 49.9,
    pricePerCredit: 3.32,
    badge: "Mais Popular",
    description: "15 demos musicais com voz e instrumental completo",
  },
  {
    id: "pack_40",
    name: "Pacote Hitmaker",
    credits: 40,
    price: 99.9,
    pricePerCredit: 2.49,
    badge: "Melhor Custo-Benefício",
    description: "40 demos musicais para criar repertórios inteiros",
  },
];

function parseMoney(value: string | null | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = parseFloat(String(value).replace(",", "."));
  if (!Number.isFinite(n) || n < 1 || n > 9999.99) return fallback;
  return Math.round(n * 100) / 100;
}

function parseCount(value: string | null | undefined, fallback: number): number {
  const n = parseInt(String(value || ""), 10);
  if (!Number.isFinite(n) || n < 1 || n > 500) return fallback;
  return n;
}

export async function getCreditPackages(): Promise<CreditPackage[]> {
  const keys = DEFAULT_CREDIT_PACKAGES.flatMap((pkg) => [
    `ai_credit_${pkg.id}_price`,
    `ai_credit_${pkg.id}_credits`,
  ]);

  const rows = await db
    .select()
    .from(appSettingsTable)
    .where(eq(appSettingsTable.category, "ai"));

  const map = new Map(rows.filter((r) => keys.includes(r.key)).map((r) => [r.key, r.value]));

  return DEFAULT_CREDIT_PACKAGES.map((pkg) => {
    const credits = parseCount(map.get(`ai_credit_${pkg.id}_credits`), pkg.credits);
    const price = parseMoney(map.get(`ai_credit_${pkg.id}_price`), pkg.price);
    return {
      ...pkg,
      credits,
      price,
      pricePerCredit: Math.round((price / credits) * 100) / 100,
    };
  });
}

export function parseCreditExternalRef(ref: string | null | undefined): { artistId: string; packageId: string } | null {
  if (!ref || !ref.startsWith("credits-")) return null;
  const parts = ref.split("-");
  if (parts.length < 3) return null;
  const artistId = parts[1];
  const packageId = parts.slice(2).join("-");
  if (!artistId || !packageId) return null;
  return { artistId, packageId };
}

export async function fulfillAiCreditPurchase(params: {
  artistId: string | number;
  packageId: string;
  paymentId?: string | null;
  amount?: string | number | null;
}): Promise<{ ok: boolean; alreadyProcessed?: boolean; addedCredits?: number; extraCredits?: number; error?: string }> {
  const artistId = parseInt(String(params.artistId), 10);
  if (!Number.isFinite(artistId)) {
    return { ok: false, error: "Artista inválido" };
  }

  if (params.paymentId) {
    const existing = await db
      .select()
      .from(subscriptionsTable)
      .where(and(
        eq(subscriptionsTable.asaasPaymentId, params.paymentId),
        eq(subscriptionsTable.status, "active"),
      ));
    if (existing.length > 0) {
      return { ok: true, alreadyProcessed: true };
    }
  }

  const packages = await getCreditPackages();
  const pkg = packages.find((p) => p.id === params.packageId);
  if (!pkg) {
    return { ok: false, error: "Pacote inválido" };
  }

  const [artist] = await db.select().from(artistsTable).where(eq(artistsTable.id, artistId));
  if (!artist) {
    return { ok: false, error: "Artista não encontrado" };
  }

  const newExtra = (artist.aiMusicExtraCredits || 0) + pkg.credits;
  await db
    .update(artistsTable)
    .set({
      aiMusicExtraCredits: newExtra,
      updatedAt: new Date(),
    })
    .where(eq(artistsTable.id, artistId));

  if (params.paymentId) {
    const [pending] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.asaasPaymentId, params.paymentId));

    if (pending) {
      await db
        .update(subscriptionsTable)
        .set({
          status: "active",
          startedAt: new Date(),
        })
        .where(eq(subscriptionsTable.id, pending.id));
    } else {
      await db.insert(subscriptionsTable).values({
        artistId: String(artistId) as any,
        planNome: `ai_credits:${pkg.id}`,
        asaasPaymentId: params.paymentId,
        status: "active",
        amount: String(params.amount ?? pkg.price),
        billingType: "PIX",
        startedAt: new Date(),
      });
    }
  }

  return { ok: true, addedCredits: pkg.credits, extraCredits: newExtra };
}
