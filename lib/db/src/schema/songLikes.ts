import { pgTable, text, serial, timestamp, unique } from "drizzle-orm/pg-core";

export const songLikesTable = pgTable("song_likes", {
  id: serial("id").primaryKey(),
  songId: text("song_id").notNull(),
  ipAddress: text("ip_address").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("song_likes_song_id_ip_address_unique").on(table.songId, table.ipAddress),
]);

export type SongLike = typeof songLikesTable.$inferSelect;
