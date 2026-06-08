import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contatosTable = pgTable("contatos", {
  id: serial("id").primaryKey(),
  artistaId: integer("artista_id").notNull(),
  nome: text("nome").notNull(),
  categoria: text("categoria").notNull().default("Outro"),
  telefone: text("telefone"),
  email: text("email"),
  anotacoes: text("anotacoes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertContatoSchema = createInsertSchema(contatosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContato = z.infer<typeof insertContatoSchema>;
export type Contato = typeof contatosTable.$inferSelect;
