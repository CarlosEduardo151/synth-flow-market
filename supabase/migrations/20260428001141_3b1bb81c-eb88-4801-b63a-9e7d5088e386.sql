-- Tabela honeypot blocklist
CREATE TABLE IF NOT EXISTS public.security_blocklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  trigger_route TEXT NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_security_blocklist_ip ON public.security_blocklist(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_blocklist_last_seen ON public.security_blocklist(last_seen_at DESC);

ALTER TABLE public.security_blocklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view blocklist" ON public.security_blocklist;
CREATE POLICY "Admins can view blocklist"
ON public.security_blocklist FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role manages blocklist" ON public.security_blocklist;
CREATE POLICY "Service role manages blocklist"
ON public.security_blocklist FOR ALL
TO service_role
USING (true) WITH CHECK (true);

GRANT ALL ON public.security_blocklist TO service_role;