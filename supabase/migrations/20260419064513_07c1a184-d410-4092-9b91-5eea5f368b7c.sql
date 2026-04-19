
-- Configurações de captura automática de leads para o CRM
CREATE TABLE public.crm_capture_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  -- horário (formato HH:MM, fuso configurado)
  business_hours_start TIME NOT NULL DEFAULT '09:00',
  business_hours_end TIME NOT NULL DEFAULT '18:00',
  -- dias da semana ativos: 0=domingo .. 6=sábado
  active_weekdays INT[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  -- enriquecimento por IA
  ai_enrichment_enabled BOOLEAN NOT NULL DEFAULT true,
  -- comportamento fora do horário
  ignore_outside_hours BOOLEAN NOT NULL DEFAULT true,
  -- status inicial do lead
  default_status TEXT NOT NULL DEFAULT 'lead',
  default_source TEXT NOT NULL DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_capture_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view their capture settings"
ON public.crm_capture_settings FOR SELECT
USING (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners manage their capture settings"
ON public.crm_capture_settings FOR ALL
USING (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_crm_capture_settings_updated_at
BEFORE UPDATE ON public.crm_capture_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT ALL ON public.crm_capture_settings TO service_role;

-- Índice para busca rápida de duplicados na captura (telefone + produto)
CREATE INDEX IF NOT EXISTS idx_crm_customers_phone_product
ON public.crm_customers (customer_product_id, phone);
