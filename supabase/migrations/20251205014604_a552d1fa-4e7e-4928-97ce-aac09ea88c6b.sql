-- Create table for n8n agent chat messages
CREATE TABLE public.n8n_agent_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL DEFAULT 'default',
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.n8n_agent_messages ENABLE ROW LEVEL SECURITY;

-- Policy for admins to read all messages
CREATE POLICY "Admins can read all n8n messages" 
ON public.n8n_agent_messages 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Policy for admins to insert messages
CREATE POLICY "Admins can insert n8n messages" 
ON public.n8n_agent_messages 
FOR INSERT 
WITH CHECK (public.is_admin(auth.uid()));

-- Policy for service role (edge functions) to insert
CREATE POLICY "Service role can insert n8n messages" 
ON public.n8n_agent_messages 
FOR INSERT 
WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.n8n_agent_messages;