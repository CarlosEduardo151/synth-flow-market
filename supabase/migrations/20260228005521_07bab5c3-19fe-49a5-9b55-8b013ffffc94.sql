
-- ═══════════════════════════════════════════════════════════
-- FLEET BUDGETS: Structured budget per service order
-- ═══════════════════════════════════════════════════════════

CREATE TABLE public.fleet_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES public.fleet_service_orders(id) ON DELETE CASCADE,
  customer_product_id UUID NOT NULL,
  laudo_tecnico TEXT,
  urgencia TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pendente',
  total_pecas NUMERIC NOT NULL DEFAULT 0,
  total_mao_de_obra NUMERIC NOT NULL DEFAULT 0,
  total_bruto NUMERIC NOT NULL DEFAULT 0,
  comissao_pct NUMERIC NOT NULL DEFAULT 15,
  total_liquido NUMERIC NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fleet_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fleet_budgets"
  ON public.fleet_budgets FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can manage fleet_budgets"
  ON public.fleet_budgets FOR ALL
  USING (owns_customer_product(customer_product_id))
  WITH CHECK (owns_customer_product(customer_product_id));

-- ═══════════════════════════════════════════════════════════
-- FLEET BUDGET ITEMS: Individual parts & labor lines
-- ═══════════════════════════════════════════════════════════

CREATE TABLE public.fleet_budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.fleet_budgets(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'peca',
  codigo TEXT,
  descricao TEXT NOT NULL,
  marca TEXT,
  tipo_peca TEXT,
  quantidade NUMERIC NOT NULL DEFAULT 1,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  horas NUMERIC,
  valor_hora NUMERIC,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fleet_budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fleet_budget_items"
  ON public.fleet_budget_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can manage fleet_budget_items via budget"
  ON public.fleet_budget_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.fleet_budgets b
    WHERE b.id = fleet_budget_items.budget_id
      AND owns_customer_product(b.customer_product_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.fleet_budgets b
    WHERE b.id = fleet_budget_items.budget_id
      AND owns_customer_product(b.customer_product_id)
  ));

-- Index for fast lookups
CREATE INDEX idx_fleet_budgets_service_order ON public.fleet_budgets(service_order_id);
CREATE INDEX idx_fleet_budget_items_budget ON public.fleet_budget_items(budget_id);
