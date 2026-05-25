import { pgTable, text, serial, timestamp, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const plansTable = pgTable("plans", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull().unique(), // free, basico, intermediario, pro, premium
  label: text("label").notNull(), // Nome exibível
  preco: numeric("preco").notNull(),
  limiteMusicas: numeric("limite_musicas").notNull(),
  personalizacaoPercent: numeric("personalizacao_percent").notNull(),
  descricao: text("descricao"),
  fraseEfeito: text("frase_efeito"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // Permission flags for personalization features
  canCustomizeFont: boolean("can_customize_font").notNull().default(true),
  canCustomizeBackground: boolean("can_customize_background").notNull().default(true),
  canCustomizeTextColor: boolean("can_customize_text_color").notNull().default(true),
  canCustomizePlayerStyle: boolean("can_customize_player_style").notNull().default(true),
  canCustomizePlayerColor: boolean("can_customize_player_color").notNull().default(true),
  canUploadBanner: boolean("can_upload_banner").notNull().default(false),
  canUploadProfilePhoto: boolean("can_upload_profile_photo").notNull().default(false),
});

export const insertPlanSchema = createInsertSchema(plansTable).omit({ 
  id: true, 
  createdAt: true 
});

export type Plan = typeof plansTable.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;

// Permission flags type for personalization features
export interface PlanPermissions {
  canCustomizeFont: boolean;
  canCustomizeBackground: boolean;
  canCustomizeTextColor: boolean;
  canCustomizePlayerStyle: boolean;
  canCustomizePlayerColor: boolean;
  canUploadBanner: boolean;
  canUploadProfilePhoto: boolean;
}
