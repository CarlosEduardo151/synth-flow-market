-- Tabela para armazenar eventos recebidos via webhook (WhatsApp/Z-API)
CREATE TABLE IF NOT EXISTS public.whatsapp_inbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'whatsapp',
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_inbox_events_customer_product_id
  ON public.whatsapp_inbox_events(customer_product_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_inbox_events_received_at
  ON public.whatsapp_inbox_events(received_at DESC);

-- RLS
ALTER TABLE public.whatsapp_inbox_events ENABLE ROW LEVEL SECURITY;

-- Admins podem tudo
DO $$ BEGIN
  CREATE POLICY "Admins can manage whatsapp_inbox_events"
  ON public.whatsapp_inbox_events
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Donos do produto podem ler seus próprios eventos
DO $$ BEGIN
  CREATE POLICY "Owners can read whatsapp_inbox_events"
  ON public.whatsapp_inbox_events
  FOR SELECT
  USING (public.owns_customer_product(customer_product_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;