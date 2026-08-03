import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const exitFeedbacksTable = pgTable("exit_feedbacks", {
  id: serial("id").primaryKey(),
  selectedOption: text("selected_option").notNull(),
  customComment: text("custom_comment"),
  pageUrl: text("page_url").notNull().default("/"),
  userDevice: text("user_device").notNull().default("desktop"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertExitFeedbackSchema = createInsertSchema(exitFeedbacksTable).omit({ 
  id: true, 
  createdAt: true 
});

export type InsertExitFeedback = z.infer<typeof insertExitFeedbackSchema>;
export type ExitFeedback = typeof exitFeedbacksTable.$inferSelect;
