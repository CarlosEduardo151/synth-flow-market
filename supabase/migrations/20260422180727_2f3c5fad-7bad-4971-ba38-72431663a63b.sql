-- Tabela de logs do WhatsApp do Agente Financeiro
CREATE TABLE IF NOT EXISTS public.financial_whatsapp_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL,
  user_id UUID NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  phone TEXT,
  message_text TEXT,
  attachment_type TEXT,     -- 'image' | 'pdf' | 'audio' | null
  attachment_url TEXT,
  processing_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'ok',   -- 'ok' | 'error' | 'ignored'
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_wa_logs_cp ON public.financial_whatsapp_logs (customer_product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fin_wa_logs_user ON public.financial_whatsapp_logs (user_id, created_at DESC);

ALTER TABLE public.financial_whatsapp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own financial whatsapp logs"
  ON public.financial_whatsapp_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financial whatsapp logs"
  ON public.financial_whatsapp_logs
  FOR DELETE
  USING (auth.uid() = user_id);

GRANT ALL ON public.financial_whatsapp_logs TO service_role;