import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const appSettingsTable = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(), // "mercadopago", "r2", "portal", "smtp"
  key: text("key").notNull().unique(),  // ex: "mp_access_token", "r2_account_id"
  value: text("value"),                 // valor (pode ser sensível)
  isSecret: text("is_secret").notNull().default("true"), // "true" ou "false"
  description: text("description"),     // descrição do campo
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
