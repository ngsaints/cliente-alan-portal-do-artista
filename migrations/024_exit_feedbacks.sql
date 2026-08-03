CREATE TABLE IF NOT EXISTS exit_feedbacks (
  id SERIAL PRIMARY KEY,
  selected_option TEXT NOT NULL,
  custom_comment TEXT,
  page_url TEXT NOT NULL DEFAULT '/',
  user_device TEXT NOT NULL DEFAULT 'desktop',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
