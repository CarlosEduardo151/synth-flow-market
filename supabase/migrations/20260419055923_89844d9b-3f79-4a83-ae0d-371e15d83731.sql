CREATE TABLE IF NOT EXISTS public.sa_deal_health_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id uuid NOT NULL,
  opportunity_id uuid,
  customer_id uuid,
  deal_name text NOT NULL,
  contact_name text,
  monthly_value numeric DEFAULT 0,
  health_score integer NOT NULL DEFAULT 50,
  previous_score integer,
  trend text,
  factors jsonb DEFAULT '[]'::jsonb,
  signals jsonb DEFAULT '[]'::jsonb,
  ai_analysis jsonb DEFAULT '{}'::jsonb,
  next_action text,
  risk_level text DEFAULT 'medium',
  last_calculated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (customer_product_id, opportunity_id)
);

CREATE INDEX IF NOT EXISTS idx_sa_health_cp ON public.sa_deal_health_scores(customer_product_id);
CREATE INDEX IF NOT EXISTS idx_sa_health_score ON public.sa_deal_health_scores(health_score);

ALTER TABLE public.sa_deal_health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners view health" ON public.sa_deal_health_scores
  FOR SELECT USING (public.owns_customer_product(customer_product_id));
CREATE POLICY "owners insert health" ON public.sa_deal_health_scores
  FOR INSERT WITH CHECK (public.owns_customer_product(customer_product_id));
CREATE POLICY "owners update health" ON public.sa_deal_health_scores
  FOR UPDATE USING (public.owns_customer_product(customer_product_id));
CREATE POLICY "owners delete health" ON public.sa_deal_health_scores
  FOR DELETE USING (public.owns_customer_product(customer_product_id));

GRANT ALL ON public.sa_deal_health_scores TO service_role;

CREATE TRIGGER update_sa_health_updated
  BEFORE UPDATE ON public.sa_deal_health_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();