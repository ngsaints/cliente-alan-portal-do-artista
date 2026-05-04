-- Migration: 010_subscriptions.sql
-- Create subscriptions table for MercadoPago payment tracking

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  artist_id NUMERIC NOT NULL,
  plan_nome TEXT NOT NULL,
  mp_payment_id TEXT,
  mp_preference_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  amount NUMERIC NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_artist_id ON subscriptions(artist_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_mp_payment_id ON subscriptions(mp_payment_id);