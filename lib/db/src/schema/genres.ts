import { pgTable, text, serial, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const genresTable = pgTable("genres", {
  id:     serial("id").primaryKey(),
  nome:   text("nome").notNull().unique(),
  ativo:  boolean("ativo").notNull().default(true),
  ordem:  integer("ordem").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Genre = typeof genresTable.$inferSelect;
