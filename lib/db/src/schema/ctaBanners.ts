import { pgTable, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const ctaBannersTable = pgTable("cta_banners", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  texto: text("texto").notNull(),
  corFundo: text("cor_fundo").notNull().default("#1a1a2e"),
  corTexto: text("cor_texto").notNull().default("#ffffff"),
  botaoTexto: text("botao_texto"),
  botaoLink: text("botao_link"),
  imagemFundoUrl: text("imagem_fundo_url"),
  ordem: integer("ordem").notNull().default(0),
  ativo: boolean("ativo").notNull().default(true),
  intervaloSegundos: integer("intervalo_segundos").notNull().default(4),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type CtaBanner = typeof ctaBannersTable.$inferSelect;
