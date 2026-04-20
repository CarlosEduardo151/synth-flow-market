-- Calendar events table
CREATE TABLE public.financial_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  event_type TEXT NOT NULL CHECK (event_type IN ('income','expense','salary','tax','other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','cancelled')),
  category TEXT,
  recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_interval TEXT CHECK (recurring_interval IN ('weekly','monthly','quarterly','yearly')),
  recurring_until DATE,
  paid_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fce_cp ON public.financial_calendar_events(customer_product_id);
CREATE INDEX idx_fce_date ON public.financial_calendar_events(event_date);
CREATE INDEX idx_fce_status ON public.financial_calendar_events(status);

ALTER TABLE public.financial_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their calendar events"
ON public.financial_calendar_events FOR ALL
USING (EXISTS (SELECT 1 FROM public.customer_products cp WHERE cp.id = customer_product_id AND cp.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.customer_products cp WHERE cp.id = customer_product_id AND cp.user_id = auth.uid()));

CREATE POLICY "Admins manage all calendar events"
ON public.financial_calendar_events FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access calendar events"
ON public.financial_calendar_events FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_fce_updated BEFORE UPDATE ON public.financial_calendar_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tax config table
CREATE TABLE public.financial_tax_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL UNIQUE REFERENCES public.customer_products(id) ON DELETE CASCADE,
  regime TEXT NOT NULL DEFAULT 'simples' CHECK (regime IN ('mei','simples','presumido','real')),
  mei_activity TEXT CHECK (mei_activity IN ('comercio','servicos','transporte')),
  simples_anexo TEXT DEFAULT 'I' CHECK (simples_anexo IN ('I','II','III','IV','V')),
  revenue_12m NUMERIC(14,2) NOT NULL DEFAULT 0,
  cnpj TEXT,
  company_name TEXT,
  notify_days_before INTEGER NOT NULL DEFAULT 5,
  notify_email TEXT,
  notify_whatsapp TEXT,
  auto_calculate BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_tax_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their tax config"
ON public.financial_tax_config FOR ALL
USING (EXISTS (SELECT 1 FROM public.customer_products cp WHERE cp.id = customer_product_id AND cp.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.customer_products cp WHERE cp.id = customer_product_id AND cp.user_id = auth.uid()));

CREATE POLICY "Admins manage all tax config"
ON public.financial_tax_config FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access tax config"
ON public.financial_tax_config FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_ftc_updated BEFORE UPDATE ON public.financial_tax_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tax calculations history
CREATE TABLE public.financial_tax_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  reference_month DATE NOT NULL,
  regime TEXT NOT NULL,
  revenue_month NUMERIC(14,2) NOT NULL DEFAULT 0,
  revenue_12m NUMERIC(14,2) NOT NULL DEFAULT 0,
  effective_rate NUMERIC(7,4) NOT NULL DEFAULT 0,
  nominal_rate NUMERIC(7,4) NOT NULL DEFAULT 0,
  deduction NUMERIC(14,2) NOT NULL DEFAULT 0,
  das_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','overdue','cancelled')),
  paid_at TIMESTAMPTZ,
  breakdown JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_product_id, reference_month)
);

CREATE INDEX idx_ftcalc_cp ON public.financial_tax_calculations(customer_product_id);
CREATE INDEX idx_ftcalc_due ON public.financial_tax_calculations(due_date);

ALTER TABLE public.financial_tax_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their tax calculations"
ON public.financial_tax_calculations FOR ALL
USING (EXISTS (SELECT 1 FROM public.customer_products cp WHERE cp.id = customer_product_id AND cp.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.customer_products cp WHERE cp.id = customer_product_id AND cp.user_id = auth.uid()));

CREATE POLICY "Admins manage all tax calculations"
ON public.financial_tax_calculations FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access tax calculations"
ON public.financial_tax_calculations FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_ftcalc_updated BEFORE UPDATE ON public.financial_tax_calculations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();