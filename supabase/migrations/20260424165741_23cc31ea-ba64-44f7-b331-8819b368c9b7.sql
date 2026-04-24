
CREATE TABLE IF NOT EXISTS public.whatsapp_message_dedup (
  dedup_key text PRIMARY KEY,
  scope text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_message_dedup_expires ON public.whatsapp_message_dedup(expires_at);

ALTER TABLE public.whatsapp_message_dedup ENABLE ROW LEVEL SECURITY;

-- Only service role accesses this table; no public policies needed.

GRANT ALL ON public.whatsapp_message_dedup TO service_role;
