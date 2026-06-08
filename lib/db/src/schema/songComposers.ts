import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const songComposersTable = pgTable("song_composers", {
  id: serial("id").primaryKey(),
  songId: integer("song_id").notNull(),
  nome: text("nome").notNull(),
  percentual: numeric("percentual").notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSongComposerSchema = createInsertSchema(songComposersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSongComposer = z.infer<typeof insertSongComposerSchema>;
export type SongComposer = typeof songComposersTable.$inferSelect;
