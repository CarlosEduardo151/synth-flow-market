
-- Table to store conversation logs (both WhatsApp and internal test chat)
CREATE TABLE public.bot_conversation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL,
  source TEXT NOT NULL DEFAULT 'test_chat', -- 'whatsapp' or 'test_chat'
  phone TEXT, -- phone number for WhatsApp messages
  direction TEXT NOT NULL, -- 'inbound' or 'outbound'
  message_text TEXT NOT NULL,
  tokens_used INT DEFAULT 0,
  processing_ms INT DEFAULT 0,
  provider TEXT,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bot_conv_logs_cp ON public.bot_conversation_logs(customer_product_id, created_at DESC);

ALTER TABLE public.bot_conversation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversation logs"
  ON public.bot_conversation_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customer_products cp
      WHERE cp.id = bot_conversation_logs.customer_product_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Service can insert conversation logs"
  ON public.bot_conversation_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customer_products cp
      WHERE cp.id = bot_conversation_logs.customer_product_id
    )
  );
