import { pgTable, text, serial, timestamp, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const songsTable = pgTable("songs", {
  id: serial("id").primaryKey(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao").notNull(),
  genero: text("genero").notNull(),
  subgenero: text("subgenero"),
  compositor: text("compositor"),
  status: text("status").notNull().default("Disponível"),
  precoX: numeric("preco_x"),
  precoY: numeric("preco_y"),
  capaPath: text("capa_path"),
  mp3Path: text("mp3_path"),
  isVip: boolean("is_vip").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSongSchema = createInsertSchema(songsTable).omit({ id: true, createdAt: true });
export type InsertSong = z.infer<typeof insertSongSchema>;
export type Song = typeof songsTable.$inferSelect;
