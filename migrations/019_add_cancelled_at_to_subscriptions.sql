-- Migration: 019_add_cancelled_at_to_subscriptions.sql
-- Garante que todas as colunas necessárias na tabela de assinaturas existem fisicamente na VPS

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_type TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS coupon_code TEXT;
