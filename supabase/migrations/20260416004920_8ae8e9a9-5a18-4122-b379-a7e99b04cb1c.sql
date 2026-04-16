
-- Handoff config table
CREATE TABLE public.bot_handoff_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  trigger_keywords TEXT[] NOT NULL DEFAULT ARRAY['atendente', 'humano', 'pessoa', 'atendimento humano', 'falar com alguém', 'falar com humano']::TEXT[],
  pause_minutes INTEGER NOT NULL DEFAULT 30,
  notification_phone TEXT,
  notification_message TEXT DEFAULT 'Um cliente solicitou atendimento humano.',
  auto_message TEXT DEFAULT '✅ Entendi! Estou transferindo você para um atendente humano. Aguarde um momento, por favor.',
  return_message TEXT DEFAULT '🤖 O atendimento humano foi encerrado. Estou de volta! Como posso ajudar?',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_product_id)
);

ALTER TABLE public.bot_handoff_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own handoff config"
  ON public.bot_handoff_config FOR ALL
  USING (public.owns_customer_product(customer_product_id))
  WITH CHECK (public.owns_customer_product(customer_product_id));

CREATE POLICY "Admins can manage all handoff config"
  ON public.bot_handoff_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Active handoff sessions table
CREATE TABLE public.bot_handoff_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL,
  phone TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bot_handoff_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own handoff sessions"
  ON public.bot_handoff_sessions FOR ALL
  USING (public.owns_customer_product(customer_product_id))
  WITH CHECK (public.owns_customer_product(customer_product_id));

CREATE POLICY "Admins can manage all handoff sessions"
  ON public.bot_handoff_sessions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Index for fast lookups
CREATE INDEX idx_handoff_sessions_active ON public.bot_handoff_sessions(customer_product_id, phone, status) WHERE status = 'active';

-- Trigger for updated_at on config
CREATE TRIGGER update_bot_handoff_config_updated_at
  BEFORE UPDATE ON public.bot_handoff_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
