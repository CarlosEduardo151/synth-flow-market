-- Tabela de leads de vendas
CREATE TABLE public.sales_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  position TEXT,
  source TEXT DEFAULT 'manual',
  status TEXT DEFAULT 'new',
  ai_score INTEGER DEFAULT 0,
  ai_sentiment TEXT,
  ai_analysis TEXT,
  notes TEXT,
  tags TEXT[],
  last_contact_at TIMESTAMP WITH TIME ZONE,
  next_follow_up_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de pipeline de vendas
CREATE TABLE public.sales_pipeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID REFERENCES public.sales_leads(id) ON DELETE CASCADE,
  stage TEXT DEFAULT 'prospecting',
  deal_value NUMERIC DEFAULT 0,
  probability INTEGER DEFAULT 0,
  expected_close_date DATE,
  ai_prediction TEXT,
  ai_close_probability INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de follow-ups
CREATE TABLE public.sales_follow_ups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID REFERENCES public.sales_leads(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'email',
  subject TEXT,
  content TEXT,
  ai_generated BOOLEAN DEFAULT false,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de reuniões
CREATE TABLE public.sales_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID REFERENCES public.sales_leads(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  meeting_link TEXT,
  location TEXT,
  ai_summary TEXT,
  ai_action_items TEXT[],
  notes TEXT,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de insights de IA
CREATE TABLE public.sales_ai_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  is_read BOOLEAN DEFAULT false,
  action_taken BOOLEAN DEFAULT false,
  related_lead_id UUID REFERENCES public.sales_leads(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_ai_insights ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can manage their own leads" ON public.sales_leads FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own pipeline" ON public.sales_pipeline FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own follow-ups" ON public.sales_follow_ups FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own meetings" ON public.sales_meetings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own insights" ON public.sales_ai_insights FOR ALL USING (auth.uid() = user_id);

-- Triggers para updated_at
CREATE TRIGGER update_sales_leads_updated_at BEFORE UPDATE ON public.sales_leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_sales_pipeline_updated_at BEFORE UPDATE ON public.sales_pipeline FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_sales_meetings_updated_at BEFORE UPDATE ON public.sales_meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();