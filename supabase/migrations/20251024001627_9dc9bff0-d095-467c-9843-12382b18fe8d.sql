-- Criar tabela de sessões de chat
CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Criar tabela de mensagens do chat
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'audio', 'file')),
  message_content TEXT,
  audio_data TEXT,
  files_data JSONB,
  webhook_sent BOOLEAN DEFAULT false,
  webhook_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar índices para melhor performance
CREATE INDEX idx_chat_sessions_email ON public.chat_sessions(email);
CREATE INDEX idx_chat_sessions_created_at ON public.chat_sessions(created_at DESC);
CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: permitir inserção pública (visitantes não autenticados)
CREATE POLICY "Anyone can create chat sessions"
  ON public.chat_sessions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view their own sessions by email"
  ON public.chat_sessions
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create chat messages"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view messages from their sessions"
  ON public.chat_messages
  FOR SELECT
  USING (true);

-- Admins podem ver tudo
CREATE POLICY "Admins can view all chat sessions"
  ON public.chat_sessions
  FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view all chat messages"
  ON public.chat_messages
  FOR ALL
  USING (is_admin(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();