import { db, appSettingsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { Resend } from "resend";

export async function getEmailConfig(): Promise<{ resend: Resend | null; from: string }> {
  try {
    const rows = await db
      .select({ key: appSettingsTable.key, value: appSettingsTable.value })
      .from(appSettingsTable)
      .where(eq(appSettingsTable.category, "email"));

    const config: Record<string, string> = {};
    for (const row of rows) {
      if (row.value) config[row.key] = row.value;
    }

    const apiKey = config["resend_api_key"];
    const from = config["email_from"] || "Portal do Artista <onboarding@resend.dev>";

    return {
      resend: apiKey ? new Resend(apiKey) : null,
      from,
    };
  } catch {
    return { resend: null, from: "Portal do Artista <onboarding@resend.dev>" };
  }
}

export async function getPortalUrl(): Promise<string> {
  try {
    const [row] = await db
      .select({ value: appSettingsTable.value })
      .from(appSettingsTable)
      .where(eq(appSettingsTable.key, "portal_url"));
    return row?.value || "https://portaldoartista.com";
  } catch {
    return "https://portaldoartista.com";
  }
}

/** Alerta operacional para o administrador do portal (nunca lança exceção). */
export async function sendAdminAlert(subject: string, text: string): Promise<boolean> {
  try {
    const { resend, from } = await getEmailConfig();
    if (!resend) return false;
    const rows = await db
      .select({ key: appSettingsTable.key, value: appSettingsTable.value })
      .from(appSettingsTable)
      .where(sql`${appSettingsTable.key} IN ('portal_email', 'suporte_email')`);
    const config: Record<string, string> = {};
    for (const row of rows) if (row.value) config[row.key] = row.value;
    const to = config["portal_email"] || config["suporte_email"];
    if (!to) return false;

    const result = await resend.emails.send({ from, to, subject, text });
    if (result.error) {
      console.warn(`[Alerta] Falha ao enviar "${subject}":`, result.error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[Alerta] Erro ao enviar alerta ao admin:`, err);
    return false;
  }
}
