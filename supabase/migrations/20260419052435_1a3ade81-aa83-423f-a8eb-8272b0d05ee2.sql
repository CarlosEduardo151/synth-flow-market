
ALTER TABLE public.sa_antichurn_alerts
  ADD COLUMN IF NOT EXISTS health_score integer,
  ADD COLUMN IF NOT EXISTS sentiment_score numeric,
  ADD COLUMN IF NOT EXISTS sentiment_label text,
  ADD COLUMN IF NOT EXISTS emotional_markers text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS churn_keywords text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS engagement_drop_pct integer,
  ADD COLUMN IF NOT EXISTS silent_negative boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS executive_summary text,
  ADD COLUMN IF NOT EXISTS messages_analyzed integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_sa_antichurn_health_score ON public.sa_antichurn_alerts(health_score);
