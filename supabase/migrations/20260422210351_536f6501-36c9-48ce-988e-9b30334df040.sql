
-- 1) Restringir INSERT em logs/metrics ao service_role apenas
DROP POLICY IF EXISTS "Service can insert conversation logs" ON public.bot_conversation_logs;
CREATE POLICY "Service role inserts conversation logs"
ON public.bot_conversation_logs FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role inserts only" ON public.bot_usage_metrics;
CREATE POLICY "Service role inserts metrics"
ON public.bot_usage_metrics FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Service can insert platform_logs" ON public.platform_logs;
CREATE POLICY "Service role inserts platform_logs"
ON public.platform_logs FOR INSERT
TO service_role
WITH CHECK (true);

-- 2) Realtime: RLS em realtime.messages restringindo a tópicos do próprio user
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users subscribe to own crm topics" ON realtime.messages;
CREATE POLICY "Users subscribe to own crm topics"
ON realtime.messages FOR SELECT
TO authenticated
USING (
  -- Tópico deve começar com 'crm:<customer_product_id>' de um produto que o usuário possui
  EXISTS (
    SELECT 1 FROM public.customer_products cp
    WHERE cp.user_id = auth.uid()
      AND realtime.topic() = 'crm:' || cp.id::text
  )
  OR realtime.topic() LIKE 'user:' || auth.uid()::text || ':%'
);

-- 3) Proteger tokens OAuth: revogar acesso direto às colunas sensíveis
REVOKE SELECT (access_token, refresh_token) ON public.sa_calendar_connections FROM authenticated, anon;
GRANT SELECT (access_token, refresh_token) ON public.sa_calendar_connections TO service_role;

-- 4) Fixar search_path da função normalize_phone (linter warn)
CREATE OR REPLACE FUNCTION public.normalize_phone(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT regexp_replace(COALESCE(p, ''), '\D', '', 'g');
$$;
