-- Criar tabela de leads de vendas
CREATE TABLE public.sales_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  position TEXT,
  source TEXT DEFAULT 'manual',
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  estimated_value NUMERIC DEFAULT 0,
  notes TEXT,
  tags TEXT[],
  last_contact_at TIMESTAMP WITH TIME ZONE,
  next_follow_up_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de follow-ups
CREATE TABLE public.sales_follow_ups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.sales_leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('call', 'email', 'whatsapp', 'meeting', 'linkedin', 'other')),
  subject TEXT,
  content TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'rescheduled')),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  outcome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de reuniões
CREATE TABLE public.sales_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.sales_leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  meeting_type TEXT DEFAULT 'online' CHECK (meeting_type IN ('online', 'presencial', 'call')),
  location TEXT,
  meeting_link TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de pipeline de vendas
CREATE TABLE public.sales_pipeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.sales_leads(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('prospecting', 'qualification', 'proposal', 'negotiation', 'closing', 'won', 'lost')),
  entered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  exited_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Criar tabela de metas de vendas
CREATE TABLE public.sales_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_leads INTEGER DEFAULT 0,
  target_meetings INTEGER DEFAULT 0,
  target_proposals INTEGER DEFAULT 0,
  target_revenue NUMERIC DEFAULT 0,
  achieved_leads INTEGER DEFAULT 0,
  achieved_meetings INTEGER DEFAULT 0,
  achieved_proposals INTEGER DEFAULT 0,
  achieved_revenue NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de configurações do assistente de vendas
CREATE TABLE public.sales_assistant_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL UNIQUE REFERENCES public.customer_products(id) ON DELETE CASCADE,
  auto_follow_up_enabled BOOLEAN DEFAULT true,
  follow_up_delay_hours INTEGER DEFAULT 24,
  lead_scoring_enabled BOOLEAN DEFAULT true,
  auto_prioritization_enabled BOOLEAN DEFAULT true,
  webhook_url TEXT,
  crm_integration_enabled BOOLEAN DEFAULT false,
  crm_api_key TEXT,
  ai_prospecting_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_assistant_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para sales_leads
CREATE POLICY "Users can view their own leads" ON public.sales_leads
  FOR SELECT USING (
    customer_product_id IN (
      SELECT id FROM public.customer_products WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own leads" ON public.sales_leads
  FOR INSERT WITH CHECK (
    customer_product_id IN (
      SELECT id FROM public.customer_products WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own leads" ON public.sales_leads
  FOR UPDATE USING (
    customer_product_id IN (
      SELECT id FROM public.customer_products WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own leads" ON public.sales_leads
  FOR DELETE USING (
    customer_product_id IN (
      SELECT id FROM public.customer_products WHERE user_id = auth.uid()
    )
  );

-- Políticas RLS para sales_follow_ups
CREATE POLICY "Users can manage follow_ups via leads" ON public.sales_follow_ups
  FOR ALL USING (
    lead_id IN (
      SELECT sl.id FROM public.sales_leads sl
      JOIN public.customer_products cp ON sl.customer_product_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );

-- Políticas RLS para sales_meetings
CREATE POLICY "Users can manage meetings via leads" ON public.sales_meetings
  FOR ALL USING (
    lead_id IN (
      SELECT sl.id FROM public.sales_leads sl
      JOIN public.customer_products cp ON sl.customer_product_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );

-- Políticas RLS para sales_pipeline
CREATE POLICY "Users can manage pipeline" ON public.sales_pipeline
  FOR ALL USING (
    customer_product_id IN (
      SELECT id FROM public.customer_products WHERE user_id = auth.uid()
    )
  );

-- Políticas RLS para sales_goals
CREATE POLICY "Users can manage goals" ON public.sales_goals
  FOR ALL USING (
    customer_product_id IN (
      SELECT id FROM public.customer_products WHERE user_id = auth.uid()
    )
  );

-- Políticas RLS para sales_assistant_config
CREATE POLICY "Users can manage config" ON public.sales_assistant_config
  FOR ALL USING (
    customer_product_id IN (
      SELECT id FROM public.customer_products WHERE user_id = auth.uid()
    )
  );

-- Triggers para updated_at
CREATE TRIGGER update_sales_leads_updated_at
  BEFORE UPDATE ON public.sales_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_meetings_updated_at
  BEFORE UPDATE ON public.sales_meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_goals_updated_at
  BEFORE UPDATE ON public.sales_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_assistant_config_updated_at
  BEFORE UPDATE ON public.sales_assistant_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_sales_leads_customer_product ON public.sales_leads(customer_product_id);
CREATE INDEX idx_sales_leads_status ON public.sales_leads(status);
CREATE INDEX idx_sales_leads_priority ON public.sales_leads(priority);
CREATE INDEX idx_sales_follow_ups_lead ON public.sales_follow_ups(lead_id);
CREATE INDEX idx_sales_follow_ups_scheduled ON public.sales_follow_ups(scheduled_at);
CREATE INDEX idx_sales_meetings_lead ON public.sales_meetings(lead_id);
CREATE INDEX idx_sales_meetings_scheduled ON public.sales_meetings(scheduled_at);
CREATE INDEX idx_sales_pipeline_customer_product ON public.sales_pipeline(customer_product_id);
CREATE INDEX idx_sales_goals_customer_product ON public.sales_goals(customer_product_id);