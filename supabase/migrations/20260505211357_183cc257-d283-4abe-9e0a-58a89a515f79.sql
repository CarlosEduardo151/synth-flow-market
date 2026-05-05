-- Tabela de buffer
CREATE TABLE IF NOT EXISTS public.whatsapp_message_buffer (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id uuid NOT NULL,
  user_id uuid NOT NULL,
  phone text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  flush_at timestamptz NOT NULL DEFAULT (now() + interval '3 seconds'),
  processing boolean NOT NULL DEFAULT false,
  processing_started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Garante 1 buffer ATIVO (não em processamento) por conversa
CREATE UNIQUE INDEX IF NOT EXISTS idx_wmb_active_unique
  ON public.whatsapp_message_buffer (customer_product_id, phone)
  WHERE processing = false;

CREATE INDEX IF NOT EXISTS idx_wmb_flush_at
  ON public.whatsapp_message_buffer (flush_at)
  WHERE processing = false;

CREATE INDEX IF NOT EXISTS idx_wmb_processing_started
  ON public.whatsapp_message_buffer (processing_started_at)
  WHERE processing = true;

-- RLS: apenas service_role
ALTER TABLE public.whatsapp_message_buffer ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.whatsapp_message_buffer TO service_role;

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_wmb_updated_at ON public.whatsapp_message_buffer;
CREATE TRIGGER trg_wmb_updated_at
  BEFORE UPDATE ON public.whatsapp_message_buffer
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Extensões para cron HTTP
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;