-- Migration: Migrate from MercadoPago to Asaas
-- Run this on your PostgreSQL database

-- 1. Add asaas_customer_id to artists table
ALTER TABLE artists ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

-- 2. Add new Asaas columns to subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_type TEXT;

-- 3. Migrate data from old MP columns to new Asaas columns (if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'mp_payment_id') THEN
    UPDATE subscriptions SET asaas_payment_id = mp_payment_id WHERE mp_payment_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'mp_preference_id') THEN
    UPDATE subscriptions SET asaas_subscription_id = mp_preference_id WHERE mp_preference_id IS NOT NULL;
  END IF;
END $$;

-- 4. Drop old MercadoPago columns from subscriptions (if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'mp_payment_id') THEN
    ALTER TABLE subscriptions DROP COLUMN mp_payment_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'mp_preference_id') THEN
    ALTER TABLE subscriptions DROP COLUMN mp_preference_id;
  END IF;
END $$;

-- 5. Update app_settings: remove MercadoPago keys, add Asaas keys
DELETE FROM app_settings WHERE key IN ('mp_access_token', 'mp_public_key', 'mp_webhook_secret', 'mp_sandbox', 'mp_webhook_url');

INSERT INTO app_settings (category, key, value, is_secret, description) VALUES
  ('asaas', 'asaas_api_key', '', 'true', 'Chave de API do Asaas (obtenha em: https://www.asaas.com/config/integrations)')
ON CONFLICT (key) DO UPDATE SET category = 'asaas', description = EXCLUDED.description;

INSERT INTO app_settings (category, key, value, is_secret, description) VALUES
  ('asaas', 'asaas_sandbox', 'false', 'false', 'true = modo sandbox/testes | false = modo produção')
ON CONFLICT (key) DO UPDATE SET category = 'asaas', value = 'false', description = EXCLUDED.description;

INSERT INTO app_settings (category, key, value, is_secret, description) VALUES
  ('asaas', 'asaas_webhook_token', '', 'true', 'Token de validação dos webhooks do Asaas (configure no painel Asaas > Webhooks)')
ON CONFLICT (key) DO UPDATE SET category = 'asaas', description = EXCLUDED.description;

INSERT INTO app_settings (category, key, value, is_secret, description) VALUES
  ('portal', 'portal_url', 'https://portaldosartista.com.br', 'false', 'URL base do portal (usada para links de retorno)')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;
