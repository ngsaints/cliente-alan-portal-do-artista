-- Migration: 012_coupon_code_in_subscriptions.sql
-- Add coupon_code column to subscriptions table

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS coupon_code TEXT;
CREATE INDEX IF NOT EXISTS idx_subscriptions_coupon_code ON subscriptions(coupon_code);