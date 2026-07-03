-- Add AI credits limit to plans table
ALTER TABLE plans ADD COLUMN IF NOT EXISTS ai_credits_limit INTEGER NOT NULL DEFAULT 10;

-- Add AI queries usage and reset date to artists table
ALTER TABLE artists ADD COLUMN IF NOT EXISTS ai_queries_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS ai_queries_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

-- Update existing plans with user specified credit limits
UPDATE plans SET ai_credits_limit = 10 WHERE nome = 'free';
UPDATE plans SET ai_credits_limit = 30 WHERE nome = 'basico';
UPDATE plans SET ai_credits_limit = 50 WHERE nome = 'intermediario';
UPDATE plans SET ai_credits_limit = 100 WHERE nome = 'pro';
UPDATE plans SET ai_credits_limit = 200 WHERE nome = 'premium';
