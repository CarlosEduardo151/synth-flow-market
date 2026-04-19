ALTER TABLE public.sa_winback_campaigns
  ADD COLUMN IF NOT EXISTS opportunity_id uuid,
  ADD COLUMN IF NOT EXISTS customer_id uuid,
  ADD COLUMN IF NOT EXISTS lead_name text,
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS lead_phone text,
  ADD COLUMN IF NOT EXISTS lead_email text,
  ADD COLUMN IF NOT EXISTS lost_reason text,
  ADD COLUMN IF NOT EXISTS days_since_lost integer,
  ADD COLUMN IF NOT EXISTS monthly_value numeric,
  ADD COLUMN IF NOT EXISTS trigger_type text,
  ADD COLUMN IF NOT EXISTS suggested_message text,
  ADD COLUMN IF NOT EXISTS success_probability integer,
  ADD COLUMN IF NOT EXISTS ai_analysis jsonb,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

CREATE INDEX IF NOT EXISTS idx_sa_winback_cp_status ON public.sa_winback_campaigns(customer_product_id, status);
CREATE INDEX IF NOT EXISTS idx_sa_winback_opportunity ON public.sa_winback_campaigns(opportunity_id);

ALTER TABLE public.sa_winback_campaigns ALTER COLUMN status SET DEFAULT 'pending';

GRANT ALL ON public.sa_winback_campaigns TO service_role;