import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const aiMusicDemosTable = pgTable("ai_music_demos", {
  id: serial("id").primaryKey(),
  artistaId: integer("artista_id").notNull(),
  titulo: text("titulo").notNull(),
  letra: text("letra"),
  estilo: text("estilo").notNull().default("Sertanejo"),
  voz: text("voz").notNull().default("Masculina"),
  bpm: integer("bpm").default(120),
  clima: text("clima"),
  prompt: text("prompt"),
  audioUrl: text("audio_url"),
  predictionId: text("prediction_id"),
  status: text("status").notNull().default("completed"), // pending, processing, completed, failed
  error: text("error"),
  duracao: numeric("duracao"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAiMusicDemoSchema = createInsertSchema(aiMusicDemosTable).omit({ id: true, createdAt: true });
export type InsertAiMusicDemo = z.infer<typeof insertAiMusicDemoSchema>;
export type AiMusicDemo = typeof aiMusicDemosTable.$inferSelect;
