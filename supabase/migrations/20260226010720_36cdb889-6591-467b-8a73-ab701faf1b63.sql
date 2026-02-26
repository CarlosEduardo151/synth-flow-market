
-- Table to accumulate real bot usage metrics per customer_product
CREATE TABLE public.bot_usage_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'ai_call',
  tokens_input INT NOT NULL DEFAULT 0,
  tokens_output INT NOT NULL DEFAULT 0,
  tokens_total INT NOT NULL DEFAULT 0,
  data_bytes_in BIGINT NOT NULL DEFAULT 0,
  data_bytes_out BIGINT NOT NULL DEFAULT 0,
  provider TEXT,
  model TEXT,
  processing_ms INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by customer_product
CREATE INDEX idx_bot_usage_metrics_cp ON public.bot_usage_metrics(customer_product_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.bot_usage_metrics ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert (edge functions use service role)
-- Users can read their own metrics via customer_products ownership
CREATE POLICY "Users can view own metrics"
  ON public.bot_usage_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customer_products cp
      WHERE cp.id = bot_usage_metrics.customer_product_id
        AND cp.user_id = auth.uid()
    )
  );

-- Service role inserts (edge functions)
CREATE POLICY "Service role can insert metrics"
  ON public.bot_usage_metrics
  FOR INSERT
  WITH CHECK (true);

-- View for aggregated metrics per customer_product (last 24h)
CREATE OR REPLACE VIEW public.bot_usage_summary AS
SELECT
  customer_product_id,
  COUNT(*) AS total_requests,
  COALESCE(SUM(tokens_input), 0) AS total_tokens_input,
  COALESCE(SUM(tokens_output), 0) AS total_tokens_output,
  COALESCE(SUM(tokens_total), 0) AS total_tokens,
  COALESCE(SUM(data_bytes_in + data_bytes_out), 0) AS total_data_bytes,
  COALESCE(AVG(processing_ms), 0) AS avg_processing_ms,
  MAX(created_at) AS last_activity
FROM public.bot_usage_metrics
WHERE created_at > now() - interval '24 hours'
GROUP BY customer_product_id;
