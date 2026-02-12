-- Enable realtime for financial_agent_chat_logs
ALTER TABLE public.financial_agent_chat_logs REPLICA IDENTITY FULL;

-- Add table to realtime publication (if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'financial_agent_chat_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_agent_chat_logs;
  END IF;
END $$;