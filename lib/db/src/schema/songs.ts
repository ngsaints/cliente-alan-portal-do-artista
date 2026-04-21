import { pgTable, text, serial, timestamp, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const songsTable = pgTable("songs", {
  id: serial("id").primaryKey(),
  artistaId: text("artista_id"), // link to artist (null = catalog songs)
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
  youtubeUrl: text("youtube_url"), // link do YouTube
  tipoMidia: text("tipo_midia").notNull().default("audio"), // 'audio' ou 'video'
  isVip: boolean("is_vip").notNull().default(false),
  vipCode: text("vip_code"), // código de acesso para conteúdo VIP
  isPrivate: boolean("is_private").notNull().default(false), // música privada (só o artista vê)
  destaque: boolean("destaque").notNull().default(false), // appears on home highlights
  likes: numeric("likes").notNull().default("0"), // contador de curtidas
  plays: numeric("plays").notNull().default("0"), // contador de reproduções
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSongSchema = createInsertSchema(songsTable).omit({ id: true, createdAt: true });
export type InsertSong = z.infer<typeof insertSongSchema>;
export type Song = typeof songsTable.$inferSelect;
