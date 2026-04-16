import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const interestsTable = pgTable("interests", {
  id: serial("id").primaryKey(),
  songId: text("song_id").notNull(),
  artistaId: integer("artista_id"),         // ID do artista dono da música
  nome: text("nome").notNull(),
  email: text("email").notNull(),
  telefone: text("telefone"),
  mensagem: text("mensagem"),
  contratarShow: boolean("contratar_show").notNull().default(false),
  reservarMusica: boolean("reservar_musica").notNull().default(false),
  agendarReuniao: boolean("agendar_reuniao").notNull().default(false),
  lido: boolean("lido").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInterestSchema = createInsertSchema(interestsTable).omit({ 
  id: true, 
  createdAt: true 
});

export type InsertInterest = z.infer<typeof insertInterestSchema>;
export type Interest = typeof interestsTable.$inferSelect;
