
ALTER TABLE public.sa_config ADD COLUMN IF NOT EXISTS icp_description text;

CREATE TABLE IF NOT EXISTS public.sa_prospect_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'running',
  sources_used text[] DEFAULT '{}',
  total_fetched int DEFAULT 0,
  total_scored int DEFAULT 0,
  total_hot int DEFAULT 0,
  icp_snapshot text,
  error_message text,
  results jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sa_prospect_scans_cp ON public.sa_prospect_scans(customer_product_id, created_at DESC);

ALTER TABLE public.sa_prospect_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners read scans" ON public.sa_prospect_scans
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.customer_products cp WHERE cp.id = customer_product_id AND cp.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "service role all scans" ON public.sa_prospect_scans
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

GRANT ALL ON public.sa_prospect_scans TO service_role;
