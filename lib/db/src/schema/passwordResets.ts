import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const passwordResetsTable = pgTable("password_resets", {
  id: serial("id").primaryKey(),
  artistId: integer("artist_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
