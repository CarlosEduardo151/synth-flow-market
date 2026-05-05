-- Claim atômico com FOR UPDATE SKIP LOCKED
CREATE OR REPLACE FUNCTION public.claim_message_buffers(_limit integer DEFAULT 10)
RETURNS SETOF public.whatsapp_message_buffer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT id
    FROM public.whatsapp_message_buffer
    WHERE processing = false
      AND flush_at <= now()
    ORDER BY flush_at ASC
    LIMIT _limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.whatsapp_message_buffer wmb
     SET processing = true,
         processing_started_at = now()
    FROM picked
   WHERE wmb.id = picked.id
  RETURNING wmb.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_message_buffers(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_message_buffers(integer) TO service_role;