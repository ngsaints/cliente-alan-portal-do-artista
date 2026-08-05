import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { artistsTable } from "./artists";

export const articlesTable = pgTable("articles", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt"), // Resumo / Meta Description SEO
  content: text("content").notNull(), // Conteúdo HTML / Markdown
  coverUrl: text("cover_url"), // Imagem de capa
  category: text("category").default("Carreira"), // Categoria (ex: Direitos Autorais, Marketing, etc)
  keywords: text("keywords"), // Palavras-chave SEO
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  views: integer("views").notNull().default(0),
  status: text("status").notNull().default("published"), // 'published' | 'draft'
  isFeatured: boolean("is_featured").notNull().default(false),
  authorType: text("author_type").notNull().default("admin"), // 'admin' | 'artist'
  artistId: integer("artist_id").references(() => artistsTable.id, { onDelete: "set null" }),
  authorName: text("author_name").default("Redação Portal do Artista"),
  readingTimeMinutes: integer("reading_time_minutes").default(4),

  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertArticleSchema = createInsertSchema(articlesTable).omit({
  id: true,
  views: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articlesTable.$inferSelect;
