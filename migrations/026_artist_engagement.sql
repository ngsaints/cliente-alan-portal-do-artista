CREATE TABLE IF NOT EXISTS artist_engagement (
  artist_id integer PRIMARY KEY REFERENCES artists(id) ON DELETE CASCADE,
  last_active_at timestamptz,
  shares integer NOT NULL DEFAULT 0,
  profile_views integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS artist_reactivation (
  artist_id integer REFERENCES artists(id) ON DELETE CASCADE,
  campaign_week date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (artist_id, campaign_week)
);
