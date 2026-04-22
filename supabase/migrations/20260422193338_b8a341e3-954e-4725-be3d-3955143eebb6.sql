
CREATE TABLE public.financial_whatsapp_authorized_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Normalize phone: digits only, stored uniformly
CREATE OR REPLACE FUNCTION public.normalize_phone(p TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(COALESCE(p, ''), '\D', '', 'g');
$$;

CREATE UNIQUE INDEX idx_fwa_cp_phone
  ON public.financial_whatsapp_authorized_numbers (customer_product_id, public.normalize_phone(phone));

CREATE INDEX idx_fwa_cp_active
  ON public.financial_whatsapp_authorized_numbers (customer_product_id, is_active);

ALTER TABLE public.financial_whatsapp_authorized_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage authorized numbers"
  ON public.financial_whatsapp_authorized_numbers
  FOR ALL
  USING (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Service role full access authorized numbers"
  ON public.financial_whatsapp_authorized_numbers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER trg_fwa_updated_at
  BEFORE UPDATE ON public.financial_whatsapp_authorized_numbers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
