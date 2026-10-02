import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const portalTvEpisodesTable = pgTable("portal_tv_episodes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").default("video").notNull(), // "video" | "text"
  videoUrl: text("video_url"), // URL do YouTube, Vimeo ou MP4
  contentText: text("content_text"), // Texto do comunicado / novidade / tutorial escrito
  ctaText: text("cta_text"), // Botão de ação (ex: "Ver no Estúdio", "Atualizar Perfil")
  ctaUrl: text("cta_url"), // Link do botão de ação
  thumbnailUrl: text("thumbnail_url"),
  badge: text("badge").default("Novidade"), // "Tutorial", "Novidade", "Comunicado", "Dica"
  active: boolean("active").default(true).notNull(),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PortalTvEpisode = typeof portalTvEpisodesTable.$inferSelect;
export type InsertPortalTvEpisode = typeof portalTvEpisodesTable.$inferInsert;
