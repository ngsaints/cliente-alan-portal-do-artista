import { pgTable, text, serial, timestamp, boolean, numeric, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const artistsTable = pgTable("artists", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique(), // URL amigável
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  profissao: text("profissao"), // Cantor, Compositor, Banda, Grupo, Dupla
  contato: text("contato"),
  instagram: text("instagram"),
  tiktok: text("tiktok"),
  spotify: text("spotify"),
  capaUrl: text("capa_url"),
  bannerUrl: text("banner_url"),

  // Localização
  cidade: text("cidade"), // ex: Maricá, RJ
  genero: text("genero"), // Gênero musical principal

  // Personalização
  fonte: text("fonte").default("Arial"),
  cor: text("cor").default("#ffffff"),
  layout: text("layout"), // gradiente/background
  player: text("player").default("Padrão"),
  playerGradient: text("player_gradient"), // gradiente do player ex: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  playerCor: text("player_cor"), // cor sólida do player ex: "#667eea"
  vipSenha: text("vip_senha").default(""),
  
  // Plano
  plano: text("plano").notNull().default("free"), // free, basico, intermediario, pro, premium
  planoAtivo: boolean("plano_ativo").notNull().default(true),
  asaasCustomerId: text("asaas_customer_id"), // ID do customer no Asaas
  musicaCount: numeric("musica_count").notNull().default("0"),
  
  // Limites do plano
  limiteMusicas: numeric("limite_musicas").notNull().default("2"),
  personalizacaoPercent: numeric("personalizacao_percent").notNull().default("10"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertArtistSchema = createInsertSchema(artistsTable).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  musicaCount: true 
});

export type InsertArtist = z.infer<typeof insertArtistSchema>;
export type Artist = typeof artistsTable.$inferSelect;
