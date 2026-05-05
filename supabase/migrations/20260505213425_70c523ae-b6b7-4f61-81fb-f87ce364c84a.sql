-- Remove agendamento antigo se existir
DO $$
BEGIN
  PERFORM cron.unschedule('flush-whatsapp-buffer');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'flush-whatsapp-buffer',
  '2 seconds',
  $$
  SELECT net.http_post(
    url := 'https://lqduauyrwwlrbtnxkiev.supabase.co/functions/v1/flush-message-buffer',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZHVhdXlyd3dscmJ0bnhraWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MjQ0NzYsImV4cCI6MjA4MzIwMDQ3Nn0.Xe0_Jd3NgckKBI7T9jszUXwIY0YtCbzWOLU00EBpQHA"}'::jsonb,
    body := jsonb_build_object('triggered_at', now())
  );
  $$
);