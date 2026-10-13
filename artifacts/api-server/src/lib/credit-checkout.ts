import type { CreditPackage } from "./ai-credits";

export class CreditCheckoutError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
  }
}
interface CheckoutArtist {
  id: number;
  name: string;
  email: string;
  documento?: string | null;
  contato?: string | null;
}
interface CheckoutDependencies {
  getCredentials: () => Promise<{ apiKey: string }>;
  findCustomer: (
    name: string,
    email: string,
    document?: string,
    phone?: string,
  ) => Promise<{ id: string }>;
  createPayment: (
    body: Record<string, unknown>,
  ) => Promise<{ id: string; invoiceUrl?: string }>;
  savePending: (paymentId: string) => Promise<void>;
  getQrCode: (
    paymentId: string,
  ) => Promise<{ encodedImage?: string; payload?: string }>;
}
/** A checkout creates a pending charge only. Credit delivery belongs to verified payment confirmation. */
export async function createCreditCheckout(
  artist: CheckoutArtist,
  pkg: CreditPackage,
  deps: CheckoutDependencies,
) {
  const credentials = await deps.getCredentials();
  if (!credentials.apiKey)
    throw new CreditCheckoutError(
      "A compra de créditos está temporariamente indisponível. Tente novamente mais tarde.",
      503,
    );
  const customer = await deps.findCustomer(
    artist.name,
    artist.email,
    artist.documento || undefined,
    artist.contato || undefined,
  );
  const dueDate = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  const payment = await deps.createPayment({
    customer: customer.id,
    billingType: "PIX",
    value: pkg.price,
    dueDate,
    description: `Portal do Artista - Créditos de Música IA (${pkg.name} - ${pkg.credits} Hits)`,
    externalReference: `credits-${artist.id}-${pkg.id}`,
  });
  if (!payment.id)
    throw new CreditCheckoutError(
      "Não foi possível gerar a cobrança. Nenhum crédito foi liberado.",
      502,
    );
  // Register the charge even when the subsequent QR-code request fails.
  try {
    await deps.savePending(payment.id);
  } catch {
    throw new CreditCheckoutError(
      "A cobrança foi criada, mas não foi possível registrar a compra. Nenhum crédito foi liberado. Entre em contato com o suporte antes de tentar outra compra.",
      503,
    );
  }
  const invoiceUrl = /^https:\/\//.test(payment.invoiceUrl || "")
    ? payment.invoiceUrl
    : undefined;
  let qr: { encodedImage?: string; payload?: string } = {};
  try {
    qr = (await deps.getQrCode(payment.id)) || {};
  } catch {
    /* The hosted invoice remains a valid payment option. Never grant credits here. */
  }
  if (!qr.payload && !invoiceUrl)
    throw new CreditCheckoutError(
      "A cobrança foi criada, mas não foi possível carregar o pagamento Pix. Nenhum crédito foi liberado. Entre em contato com o suporte antes de tentar outra compra.",
      502,
    );
  return {
    success: true,
    mode: "asaas_pix",
    paymentId: payment.id,
    pixQrCode: qr.encodedImage || "",
    pixCopiaECola: qr.payload || "",
    invoiceUrl,
    package: pkg,
  };
}
