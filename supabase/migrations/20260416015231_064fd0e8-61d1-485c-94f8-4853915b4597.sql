
-- Create crm_opportunities table
CREATE TABLE public.crm_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.crm_customers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'novo_lead',
  priority TEXT DEFAULT 'media',
  probability INTEGER DEFAULT 50,
  source TEXT,
  expected_close_date DATE,
  notes TEXT,
  lost_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own opportunities"
  ON public.crm_opportunities FOR SELECT
  USING (public.owns_customer_product(customer_product_id));

CREATE POLICY "Owner can create own opportunities"
  ON public.crm_opportunities FOR INSERT
  WITH CHECK (public.owns_customer_product(customer_product_id));

CREATE POLICY "Owner can update own opportunities"
  ON public.crm_opportunities FOR UPDATE
  USING (public.owns_customer_product(customer_product_id));

CREATE POLICY "Owner can delete own opportunities"
  ON public.crm_opportunities FOR DELETE
  USING (public.owns_customer_product(customer_product_id));

CREATE POLICY "Admin full access to crm_opportunities"
  ON public.crm_opportunities FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_crm_opportunities_updated_at
  BEFORE UPDATE ON public.crm_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_crm_opportunities_cp ON public.crm_opportunities(customer_product_id);
CREATE INDEX idx_crm_opportunities_stage ON public.crm_opportunities(stage);

-- Create crm_interactions table
CREATE TABLE public.crm_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.crm_customers(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'note',
  subject TEXT,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own interactions"
  ON public.crm_interactions FOR SELECT
  USING (public.owns_customer_product(customer_product_id));

CREATE POLICY "Owner can create own interactions"
  ON public.crm_interactions FOR INSERT
  WITH CHECK (public.owns_customer_product(customer_product_id));

CREATE POLICY "Owner can update own interactions"
  ON public.crm_interactions FOR UPDATE
  USING (public.owns_customer_product(customer_product_id));

CREATE POLICY "Owner can delete own interactions"
  ON public.crm_interactions FOR DELETE
  USING (public.owns_customer_product(customer_product_id));

CREATE POLICY "Admin full access to crm_interactions"
  ON public.crm_interactions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_crm_interactions_cp ON public.crm_interactions(customer_product_id);
CREATE INDEX idx_crm_interactions_customer ON public.crm_interactions(customer_id);

-- Grant service_role access
GRANT ALL ON public.crm_opportunities TO service_role;
GRANT ALL ON public.crm_interactions TO service_role;
