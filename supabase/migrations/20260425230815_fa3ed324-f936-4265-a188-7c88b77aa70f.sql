-- Habilita extensões necessárias para agendamento
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove agendamento anterior se existir (idempotente)
DO $$
BEGIN
  PERFORM cron.unschedule('whatsapp-auto-reconnect-every-minute');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Agenda execução a cada minuto
SELECT cron.schedule(
  'whatsapp-auto-reconnect-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://lqduauyrwwlrbtnxkiev.supabase.co/functions/v1/whatsapp-auto-reconnect',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZHVhdXlyd3dscmJ0bnhraWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MjQ0NzYsImV4cCI6MjA4MzIwMDQ3Nn0.Xe0_Jd3NgckKBI7T9jszUXwIY0YtCbzWOLU00EBpQHA'
    ),
    body := jsonb_build_object('source', 'pg_cron', 'time', now())
  );
  $$
);