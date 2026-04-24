import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const playlistsTable = pgTable("playlists", {
  id: serial("id").primaryKey(),
  artistaId: integer("artista_id").notNull(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  capaUrl: text("capa_url"),
  ordem: integer("ordem").default(0),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const playlistSongsTable = pgTable("playlist_songs", {
  id: serial("id").primaryKey(),
  playlistId: integer("playlist_id").notNull(),
  songId: integer("song_id").notNull(),
  ordem: integer("ordem").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
