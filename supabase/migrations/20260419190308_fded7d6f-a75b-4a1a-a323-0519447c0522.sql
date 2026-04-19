-- Enable extensions if not already
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule existing jobs if they exist (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('crm-notifications-scan-5min') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'crm-notifications-scan-5min');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('sa-meeting-reminders-15min') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sa-meeting-reminders-15min');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Schedule notifications scan every 5 minutes
SELECT cron.schedule(
  'crm-notifications-scan-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://lqduauyrwwlrbtnxkiev.supabase.co/functions/v1/crm-notifications-scan',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZHVhdXlyd3dscmJ0bnhraWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MjQ0NzYsImV4cCI6MjA4MzIwMDQ3Nn0.Xe0_Jd3NgckKBI7T9jszUXwIY0YtCbzWOLU00EBpQHA"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Schedule meeting reminders every 15 minutes
SELECT cron.schedule(
  'sa-meeting-reminders-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://lqduauyrwwlrbtnxkiev.supabase.co/functions/v1/sa-meeting-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZHVhdXlyd3dscmJ0bnhraWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MjQ0NzYsImV4cCI6MjA4MzIwMDQ3Nn0.Xe0_Jd3NgckKBI7T9jszUXwIY0YtCbzWOLU00EBpQHA"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);