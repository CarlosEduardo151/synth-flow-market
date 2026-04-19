-- Cron jobs para automação de Health Score, Anti-Churn e Win-back
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Health Score recorrente (a cada 6h)
DO $$
BEGIN
  PERFORM cron.unschedule('sa-health-scan-6h') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sa-health-scan-6h');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'sa-health-scan-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lqduauyrwwlrbtnxkiev.supabase.co/functions/v1/sa-health-scan-cron',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZHVhdXlyd3dscmJ0bnhraWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MjQ0NzYsImV4cCI6MjA4MzIwMDQ3Nn0.Xe0_Jd3NgckKBI7T9jszUXwIY0YtCbzWOLU00EBpQHA"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Anti-Churn scan + ações automáticas (a cada 12h)
DO $$
BEGIN
  PERFORM cron.unschedule('sa-antichurn-auto-12h') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sa-antichurn-auto-12h');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'sa-antichurn-auto-12h',
  '15 */12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lqduauyrwwlrbtnxkiev.supabase.co/functions/v1/sa-auto-runner',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZHVhdXlyd3dscmJ0bnhraWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MjQ0NzYsImV4cCI6MjA4MzIwMDQ3Nn0.Xe0_Jd3NgckKBI7T9jszUXwIY0YtCbzWOLU00EBpQHA"}'::jsonb,
    body := '{"task":"antichurn_winback"}'::jsonb
  ) AS request_id;
  $$
);

-- Configuração por customer_product de automação anti-churn / winback
CREATE TABLE IF NOT EXISTS public.sa_automation_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id uuid NOT NULL UNIQUE,
  health_scan_enabled boolean NOT NULL DEFAULT true,
  antichurn_auto_send boolean NOT NULL DEFAULT false,
  winback_auto_send boolean NOT NULL DEFAULT false,
  winback_min_probability integer NOT NULL DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sa_automation_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_select_automation" ON public.sa_automation_config;
CREATE POLICY "owner_select_automation" ON public.sa_automation_config
  FOR SELECT TO authenticated
  USING (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "owner_modify_automation" ON public.sa_automation_config;
CREATE POLICY "owner_modify_automation" ON public.sa_automation_config
  FOR ALL TO authenticated
  USING (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), 'admin'));

GRANT ALL ON public.sa_automation_config TO service_role;

DROP TRIGGER IF EXISTS update_sa_automation_config_updated_at ON public.sa_automation_config;
CREATE TRIGGER update_sa_automation_config_updated_at
  BEFORE UPDATE ON public.sa_automation_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela para rate limit persistente nas funções sa-*
CREATE TABLE IF NOT EXISTS public.sa_rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  UNIQUE (identifier, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_sa_rate_limit_window ON public.sa_rate_limit(window_start);

ALTER TABLE public.sa_rate_limit ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.sa_rate_limit TO service_role;

DROP POLICY IF EXISTS "noop_select_rl" ON public.sa_rate_limit;
CREATE POLICY "noop_select_rl" ON public.sa_rate_limit
  FOR SELECT TO authenticated USING (false);