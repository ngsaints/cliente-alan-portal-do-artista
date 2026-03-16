import { pgTable, text } from "drizzle-orm/pg-core";

export const settingsTable = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"),
});

export type Setting = typeof settingsTable.$inferSelect;
