-- Adicionar coluna display_order na tabela customer_reviews
ALTER TABLE public.customer_reviews ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Criar tabela n8n_agent_messages para o chat do agente
CREATE TABLE IF NOT EXISTS public.n8n_agent_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL DEFAULT 'default',
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.n8n_agent_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies para n8n_agent_messages (admins podem tudo)
CREATE POLICY "Admins can view all messages" ON public.n8n_agent_messages
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert messages" ON public.n8n_agent_messages
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete messages" ON public.n8n_agent_messages
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.n8n_agent_messages;