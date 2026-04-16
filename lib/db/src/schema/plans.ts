import { pgTable, text, serial, timestamp, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const plansTable = pgTable("plans", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull().unique(), // free, basico, intermediario, pro, premium
  label: text("label").notNull(), // Nome exibível
  preco: numeric("preco").notNull(),
  limiteMusicas: numeric("limite_musicas").notNull(),
  personalizaoPercent: numeric("personalizacao_percent").notNull(),
  descricao: text("descricao"),
  fraseEfeito: text("frase_efeito"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPlanSchema = createInsertSchema(plansTable).omit({ 
  id: true, 
  createdAt: true 
});

export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Plan = typeof plansTable.$inferSelect;
