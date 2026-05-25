-- Migration: Add MercadoPago webhook secret and update settings with instructions
-- Run this on your PostgreSQL VPS database

-- Insert or update mp_webhook_secret (needed for webhook signature validation)
INSERT INTO app_settings (category, key, value, is_secret, description) VALUES
  ('mercadopago', 'mp_webhook_secret', '', 'true',
   'Webhook Secret do MercadoPago (encontrado em: MercadoPago Developers > Minha App > Webhooks)')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

-- Update existing settings with helpful descriptions
UPDATE app_settings SET description = 'Access Token do MercadoPago (obtenha em: https://www.mercadopago.com.br/developers > Minha App > Credenciais de produção)' WHERE key = 'mp_access_token';
UPDATE app_settings SET description = 'Public Key do MercadoPago (para frontend)' WHERE key = 'mp_public_key';
UPDATE app_settings SET description = 'true = modo sandbox/testes | false = modo produção' WHERE key = 'mp_sandbox';
UPDATE app_settings SET description = 'URL do webhook: https://SEU_DOMINIO/api/webhooks/mercadopago (configure no painel do MP)' WHERE key = 'mp_webhook_url';