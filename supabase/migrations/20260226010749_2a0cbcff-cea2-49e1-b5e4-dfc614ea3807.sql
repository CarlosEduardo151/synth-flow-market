
-- Fix: restrict INSERT to service role only (edge functions)
DROP POLICY "Service role can insert metrics" ON public.bot_usage_metrics;

CREATE POLICY "Service role inserts only"
  ON public.bot_usage_metrics
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customer_products cp
      WHERE cp.id = bot_usage_metrics.customer_product_id
    )
  );

-- Fix: make view SECURITY INVOKER
DROP VIEW IF EXISTS public.bot_usage_summary;
CREATE VIEW public.bot_usage_summary WITH (security_invoker = true) AS
SELECT
  customer_product_id,
  COUNT(*) AS total_requests,
  COALESCE(SUM(tokens_input), 0) AS total_tokens_input,
  COALESCE(SUM(tokens_output), 0) AS total_tokens_output,
  COALESCE(SUM(tokens_total), 0) AS total_tokens,
  COALESCE(SUM(data_bytes_in + data_bytes_out), 0) AS total_data_bytes,
  COALESCE(AVG(processing_ms), 0)::int AS avg_processing_ms,
  MAX(created_at) AS last_activity
FROM public.bot_usage_metrics
WHERE created_at > now() - interval '24 hours'
GROUP BY customer_product_id;
