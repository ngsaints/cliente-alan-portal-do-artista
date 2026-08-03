import { db, appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const CREDENTIALS_CACHE: { data: AsaasCredentials; timestamp: number } | null = null;
const CACHE_TTL_MS = 60_000;

export interface AsaasCredentials {
  apiKey: string;
  sandbox: boolean;
  webhookToken: string;
  portalUrl: string;
}

export async function getAsaasCredentials(): Promise<AsaasCredentials> {
  const now = Date.now();
  if (CREDENTIALS_CACHE && (now - CREDENTIALS_CACHE.timestamp) < CACHE_TTL_MS) {
    return CREDENTIALS_CACHE.data;
  }

  const rows = await db.select().from(appSettingsTable);
  const map: Record<string, string> = {};
  rows.forEach((r) => { if (r.value) map[r.key] = r.value; });

  const result: AsaasCredentials = {
    apiKey: map["asaas_api_key"] ?? "",
    sandbox: map["asaas_sandbox"] === "true",
    webhookToken: map["asaas_webhook_token"] ?? "",
    portalUrl: (map["portal_url"] ?? "").replace(/\/$/, ""),
  };

  return result;
}

export function getAsaasBaseUrl(sandbox: boolean): string {
  return sandbox
    ? "https://api-sandbox.asaas.com"
    : "https://api.asaas.com";
}

export async function asaasFetch<T = any>(
  path: string,
  options: { method?: string; body?: any } = {}
): Promise<T> {
  const { apiKey, sandbox } = await getAsaasCredentials();
  if (!apiKey) {
    throw new Error("Asaas não configurado. Insira a API Key no painel admin.");
  }

  const base = getAsaasBaseUrl(sandbox);
  const url = `${base}/v3${path}`;

  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "access_token": apiKey,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json() as T;

  if (!res.ok) {
    const err = data as any;
    console.error(`Asaas API error [${options.method ?? "GET"} ${path}]:`, err);
    throw new Error(err.errors?.[0]?.description ?? err.message ?? `Asaas API error ${res.status}`);
  }

  return data;
}

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
  mobilePhone?: string;
}

function isValidCpfCnpj(val?: string): boolean {
  if (!val) return false;
  const digits = val.replace(/\D/g, "");
  if (digits.length !== 11 && digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  return true;
}

export async function findOrCreateCustomer(
  name: string,
  email: string,
  cpfCnpj?: string,
  phone?: string
): Promise<AsaasCustomer> {
  const searchRes = await asaasFetch<{ data: AsaasCustomer[] }>(
    `/customers?email=${encodeURIComponent(email)}`
  );

  if (searchRes.data && searchRes.data.length > 0) {
    return searchRes.data[0];
  }

  const cleanCpfCnpj = cpfCnpj?.replace(/\D/g, "");

  const body: Record<string, any> = {
    name,
    email,
  };
  if (cleanCpfCnpj && isValidCpfCnpj(cleanCpfCnpj)) {
    body.cpfCnpj = cleanCpfCnpj;
  }
  if (phone) body.mobilePhone = phone;

  return asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body,
  });
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  value: number;
  nextDueDate: string;
  cycle: string;
  billingType: string;
  status: string;
  description?: string;
  externalReference?: string;
  dateCreated: string;
}

export async function createSubscription(params: {
  customerId: string;
  value: number;
  billingType?: string;
  description?: string;
  externalReference?: string;
  callbackUrl?: string;
}): Promise<AsaasSubscription> {
  const body: Record<string, any> = {
    customer: params.customerId,
    value: params.value,
    nextDueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    cycle: "MONTHLY",
    billingType: params.billingType ?? "UNDEFINED",
  };

  if (params.description) body.description = params.description;
  if (params.externalReference) body.externalReference = params.externalReference;
  if (params.callbackUrl) {
    body.callback = {
      successUrl: params.callbackUrl,
    };
  }

  return asaasFetch<AsaasSubscription>("/subscriptions", {
    method: "POST",
    body,
  });
}

export interface AsaasPayment {
  id: string;
  customer: string;
  subscription?: string;
  value: number;
  netValue: number;
  status: string;
  billingType: string;
  dueDate: string;
  invoiceUrl: string;
  bankSlipUrl?: string;
  pixQrCodeId?: string;
  description?: string;
  externalReference?: string;
}

export async function getSubscriptionPayments(subscriptionId: string): Promise<{ data: AsaasPayment[] }> {
  return asaasFetch<{ data: AsaasPayment[] }>(
    `/subscriptions/${subscriptionId}/payments`
  );
}

export async function getPaymentById(paymentId: string): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>(`/payments/${paymentId}`);
}

export async function cancelSubscription(subscriptionId: string): Promise<{ deleted: boolean }> {
  return asaasFetch<{ deleted: boolean }>(`/subscriptions/${subscriptionId}`, {
    method: "DELETE",
  });
}

export interface AsaasPixQrCode {
  success: boolean;
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

export async function getPaymentPixQrCode(paymentId: string): Promise<AsaasPixQrCode> {
  return asaasFetch<AsaasPixQrCode>(`/payments/${paymentId}/pixQrCode`);
}
