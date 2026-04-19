
-- Toggle 2FA por produto financeiro
CREATE TABLE IF NOT EXISTS public.financial_agent_security (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id uuid NOT NULL UNIQUE,
  require_2fa boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_agent_security ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view 2fa config"
  ON public.financial_agent_security FOR SELECT
  USING (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner can manage 2fa config"
  ON public.financial_agent_security FOR ALL
  USING (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_fas_updated_at
  BEFORE UPDATE ON public.financial_agent_security
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Log de importações de extratos
CREATE TABLE IF NOT EXISTS public.financial_agent_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id uuid NOT NULL,
  source_format text NOT NULL,
  file_name text,
  total_rows integer NOT NULL DEFAULT 0,
  imported_rows integer NOT NULL DEFAULT 0,
  skipped_rows integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_agent_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view imports"
  ON public.financial_agent_imports FOR SELECT
  USING (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner can insert imports"
  ON public.financial_agent_imports FOR INSERT
  WITH CHECK (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_fai_cpid ON public.financial_agent_imports(customer_product_id, created_at DESC);
