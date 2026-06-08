import { pgTable, text, serial, timestamp, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const liberacoesTable = pgTable("liberacoes", {
  id: serial("id").primaryKey(),
  songId: integer("song_id").notNull(),
  artistaId: integer("artista_id").notNull(),
  artistaNome: text("artista_nome").notNull(),
  dataInicio: date("data_inicio").notNull(),
  dataLiberacao: date("data_liberacao"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLiberacaoSchema = createInsertSchema(liberacoesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLiberacao = z.infer<typeof insertLiberacaoSchema>;
export type Liberacao = typeof liberacoesTable.$inferSelect;
