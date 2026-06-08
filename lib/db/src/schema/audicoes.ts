import { pgTable, text, serial, timestamp, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const audicoesTable = pgTable("audicoes", {
  id: serial("id").primaryKey(),
  songId: integer("song_id").notNull(),
  artistaId: integer("artista_id").notNull(),
  data: date("data").notNull(),
  artistaNome: text("artista_nome").notNull(),
  status: text("status").notNull().default("em_analise"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAudicaoSchema = createInsertSchema(audicoesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAudicao = z.infer<typeof insertAudicaoSchema>;
export type Audicao = typeof audicoesTable.$inferSelect;
