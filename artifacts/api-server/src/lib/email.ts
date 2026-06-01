import { db, appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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
