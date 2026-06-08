import { pgTable, text, serial, timestamp, integer, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const receitasTable = pgTable("receitas", {
  id: serial("id").primaryKey(),
  artistaId: integer("artista_id").notNull(),
  categoria: text("categoria").notNull(),
  descricao: text("descricao").notNull(),
  valor: numeric("valor").notNull().default("0"),
  data: date("data").notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReceitaSchema = createInsertSchema(receitasTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReceita = z.infer<typeof insertReceitaSchema>;
export type Receita = typeof receitasTable.$inferSelect;
