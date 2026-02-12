-- 1) Garantir upsert por customer_product_id na ai_control_config
-- (permite on_conflict=customer_product_id e evita erro 42P10)
ALTER TABLE public.ai_control_config
  ADD CONSTRAINT ai_control_config_customer_product_id_unique UNIQUE (customer_product_id);

-- 2) Preparar whatsapp_inbox_events para processamento idempotente
ALTER TABLE public.whatsapp_inbox_events
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS processing_error TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_inbox_events_customer_product_received
  ON public.whatsapp_inbox_events (customer_product_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_inbox_events_unprocessed
  ON public.whatsapp_inbox_events (customer_product_id, received_at DESC)
  WHERE processed_at IS NULL;

-- 3) Proteger eventos com RLS
ALTER TABLE public.whatsapp_inbox_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'whatsapp_inbox_events'
      AND policyname = 'Admins can manage whatsapp_inbox_events'
  ) THEN
    CREATE POLICY "Admins can manage whatsapp_inbox_events"
    ON public.whatsapp_inbox_events
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'::public.app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'whatsapp_inbox_events'
      AND policyname = 'Owners can manage whatsapp_inbox_events'
  ) THEN
    CREATE POLICY "Owners can manage whatsapp_inbox_events"
    ON public.whatsapp_inbox_events
    FOR ALL
    USING (public.owns_customer_product(customer_product_id))
    WITH CHECK (public.owns_customer_product(customer_product_id));
  END IF;
END$$;