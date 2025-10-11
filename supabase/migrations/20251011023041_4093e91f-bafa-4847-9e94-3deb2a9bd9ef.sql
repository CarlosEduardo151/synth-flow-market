-- Tabela para armazenar configurações Z-API dos usuários
CREATE TABLE IF NOT EXISTS public.zapi_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_id TEXT NOT NULL,
  token TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela para armazenar leads do WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  product_slug TEXT NOT NULL,
  product_title TEXT NOT NULL,
  status TEXT DEFAULT 'novo',
  first_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela para histórico de mensagens
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.whatsapp_leads(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  direction TEXT NOT NULL, -- 'sent' ou 'received'
  status TEXT DEFAULT 'delivered',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.zapi_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Policies para zapi_connections
CREATE POLICY "Users can manage their own Z-API connections"
  ON public.zapi_connections
  FOR ALL
  USING (auth.uid() = user_id);

-- Policies para whatsapp_leads (apenas admins)
CREATE POLICY "Admins can view all leads"
  ON public.whatsapp_leads
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update leads"
  ON public.whatsapp_leads
  FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "System can create leads"
  ON public.whatsapp_leads
  FOR INSERT
  WITH CHECK (true);

-- Policies para whatsapp_messages (apenas admins)
CREATE POLICY "Admins can view all messages"
  ON public.whatsapp_messages
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "System can create messages"
  ON public.whatsapp_messages
  FOR INSERT
  WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_zapi_connections_updated_at
  BEFORE UPDATE ON public.zapi_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_leads_updated_at
  BEFORE UPDATE ON public.whatsapp_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();