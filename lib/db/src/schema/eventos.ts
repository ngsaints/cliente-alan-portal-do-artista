import { pgTable, text, serial, timestamp, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventosTable = pgTable("eventos", {
  id: serial("id").primaryKey(),
  artistaId: integer("artista_id").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  data: date("data").notNull(),
  horarioInicial: text("horario_inicial"),
  horarioFinal: text("horario_final"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEventoSchema = createInsertSchema(eventosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEvento = z.infer<typeof insertEventoSchema>;
export type Evento = typeof eventosTable.$inferSelect;
