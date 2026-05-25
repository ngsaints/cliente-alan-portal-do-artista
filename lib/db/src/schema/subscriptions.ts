import { pgTable, text, serial, timestamp, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  artistId: numeric("artist_id").notNull(),
  planNome: text("plan_nome").notNull(),
  asaasSubscriptionId: text("asaas_subscription_id"),
  asaasPaymentId: text("asaas_payment_id"),
  status: text("status").notNull().default("pending"),
  amount: numeric("amount").notNull(),
  billingType: text("billing_type"), // UNDEFINED, BOLETO, CREDIT_CARD, PIX
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  couponCode: text("coupon_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable).omit({
  id: true,
  createdAt: true
});

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptionsTable.$inferSelect;
