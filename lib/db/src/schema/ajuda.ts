import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ajudaTable = pgTable("ajuda", {
  id: serial("id").primaryKey(),
  artistaId: integer("artista_id").notNull(),
  tipo: text("tipo").notNull(),
  mensagem: text("mensagem").notNull(),
  lido: boolean("lido").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAjudaSchema = createInsertSchema(ajudaTable).omit({ id: true, createdAt: true });
export type InsertAjuda = z.infer<typeof insertAjudaSchema>;
export type Ajuda = typeof ajudaTable.$inferSelect;
