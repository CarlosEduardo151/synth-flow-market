-- Remover jobs antigos com mesmo nome (idempotente)
DO $$
DECLARE jid bigint;
BEGIN
  FOR jid IN SELECT jobid FROM cron.job WHERE jobname IN (
    'financial-notify-daily',
    'financial-monthly-report',
    'financial-insights-scan-daily',
    'financial-kpi-aggregate-daily'
  ) LOOP
    PERFORM cron.unschedule(jid);
  END LOOP;
END $$;

-- 1) Notificações diárias 08h UTC
SELECT cron.schedule(
  'financial-notify-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lqduauyrwwlrbtnxkiev.supabase.co/functions/v1/financial-notify',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZHVhdXlyd3dscmJ0bnhraWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MjQ0NzYsImV4cCI6MjA4MzIwMDQ3Nn0.Xe0_Jd3NgckKBI7T9jszUXwIY0YtCbzWOLU00EBpQHA"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- 2) Relatório mensal: dia 1 às 06h UTC
SELECT cron.schedule(
  'financial-monthly-report',
  '0 6 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://lqduauyrwwlrbtnxkiev.supabase.co/functions/v1/financial-monthly-report',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZHVhdXlyd3dscmJ0bnhraWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MjQ0NzYsImV4cCI6MjA4MzIwMDQ3Nn0.Xe0_Jd3NgckKBI7T9jszUXwIY0YtCbzWOLU00EBpQHA"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- 3) Insights scan diário 03h UTC
SELECT cron.schedule(
  'financial-insights-scan-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lqduauyrwwlrbtnxkiev.supabase.co/functions/v1/financial-insights-scan',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZHVhdXlyd3dscmJ0bnhraWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MjQ0NzYsImV4cCI6MjA4MzIwMDQ3Nn0.Xe0_Jd3NgckKBI7T9jszUXwIY0YtCbzWOLU00EBpQHA"}'::jsonb,
    body := '{"all":true}'::jsonb
  );
  $$
);

-- 4) KPI aggregate diário 02h UTC
SELECT cron.schedule(
  'financial-kpi-aggregate-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lqduauyrwwlrbtnxkiev.supabase.co/functions/v1/financial-kpi-aggregate',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZHVhdXlyd3dscmJ0bnhraWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MjQ0NzYsImV4cCI6MjA4MzIwMDQ3Nn0.Xe0_Jd3NgckKBI7T9jszUXwIY0YtCbzWOLU00EBpQHA"}'::jsonb,
    body := '{"all":true}'::jsonb
  );
  $$
);