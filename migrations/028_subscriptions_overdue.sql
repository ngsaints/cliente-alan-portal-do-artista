-- Migration: 028_subscriptions_overdue.sql
-- Rastreia cobranças em atraso (evento PAYMENT_OVERDUE do Asaas) e throttle de notificação

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS overdue_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS overdue_notified_at TIMESTAMPTZ;
