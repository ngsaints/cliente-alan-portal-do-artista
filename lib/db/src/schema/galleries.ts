import { pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const galleriesTable = pgTable("galleries", {
  id: serial("id").primaryKey(),
  artistaId: text("artista_id").notNull(),
  titulo: text("titulo").default("Galeria"),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const galleryPhotosTable = pgTable("gallery_photos", {
  id: serial("id").primaryKey(),
  galleryId: integer("gallery_id").notNull(),
  fotoUrl: text("foto_url").notNull(),
  legenda: text("legenda"),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
