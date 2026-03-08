
-- Table to store price audit results per budget
CREATE TABLE public.fleet_budget_audit_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.fleet_budgets(id) ON DELETE CASCADE,
  customer_product_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, error
  total_orcamento NUMERIC NOT NULL DEFAULT 0,
  total_mercado NUMERIC NOT NULL DEFAULT 0,
  economia_potencial NUMERIC NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fleet_budget_audit_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit results"
  ON public.fleet_budget_audit_results
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fleet_budgets fb
      JOIN public.fleet_service_orders fso ON fso.id = fb.service_order_id
      WHERE fb.id = fleet_budget_audit_results.budget_id
      AND public.owns_customer_product(fso.customer_product_id::uuid)
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Service role full access audit results"
  ON public.fleet_budget_audit_results
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions for edge functions
GRANT SELECT, INSERT, UPDATE ON public.fleet_budget_audit_results TO authenticated, anon, service_role;
