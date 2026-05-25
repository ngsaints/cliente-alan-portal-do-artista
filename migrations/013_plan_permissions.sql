-- Migration: 013_plan_permissions.sql
-- Add permission flags for personalization features in plans table

ALTER TABLE plans ADD COLUMN IF NOT EXISTS can_customize_font BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS can_customize_background BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS can_customize_text_color BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS can_customize_player_style BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS can_customize_player_color BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS can_upload_banner BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS can_upload_profile_photo BOOLEAN NOT NULL DEFAULT false;

-- Update existing plans with default permissions based on their tier
UPDATE plans SET
  can_customize_font = true,
  can_customize_background = true,
  can_customize_text_color = true,
  can_customize_player_style = true,
  can_customize_player_color = true,
  can_upload_banner = CASE WHEN nome IN ('intermediario', 'pro', 'premium') THEN true ELSE false END,
  can_upload_profile_photo = true
WHERE nome = 'free';

UPDATE plans SET
  can_customize_font = true,
  can_customize_background = true,
  can_customize_text_color = true,
  can_customize_player_style = true,
  can_customize_player_color = true,
  can_upload_banner = true,
  can_upload_profile_photo = true
WHERE nome = 'basico';

UPDATE plans SET
  can_customize_font = true,
  can_customize_background = true,
  can_customize_text_color = true,
  can_customize_player_style = true,
  can_customize_player_color = true,
  can_upload_banner = true,
  can_upload_profile_photo = true
WHERE nome = 'intermediario';

UPDATE plans SET
  can_customize_font = true,
  can_customize_background = true,
  can_customize_text_color = true,
  can_customize_player_style = true,
  can_customize_player_color = true,
  can_upload_banner = true,
  can_upload_profile_photo = true
WHERE nome = 'pro';

UPDATE plans SET
  can_customize_font = true,
  can_customize_background = true,
  can_customize_text_color = true,
  can_customize_player_style = true,
  can_customize_player_color = true,
  can_upload_banner = true,
  can_upload_profile_photo = true
WHERE nome = 'premium';