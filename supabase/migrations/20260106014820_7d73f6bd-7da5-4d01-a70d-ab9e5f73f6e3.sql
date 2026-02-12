-- Tabela para configurações de IA do CRM
CREATE TABLE public.crm_ai_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engine TEXT NOT NULL DEFAULT 'gemini' CHECK (engine IN ('openai', 'gemini')),
  model TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
  temperature NUMERIC NOT NULL DEFAULT 0.7,
  max_tokens INTEGER NOT NULL DEFAULT 2000,
  system_prompt TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para ações pendentes da IA (requer aprovação)
CREATE TABLE public.crm_ai_pending_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  action_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  executed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Tabela para relatórios gerados pela IA
CREATE TABLE public.crm_ai_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  report_type TEXT NOT NULL,
  content TEXT NOT NULL,
  insights JSONB,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  engine TEXT,
  model TEXT
);

-- Enable RLS
ALTER TABLE public.crm_ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_ai_pending_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_ai_reports ENABLE ROW LEVEL SECURITY;

-- Policies para admins
CREATE POLICY "Admins can manage AI config" ON public.crm_ai_config
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage pending actions" ON public.crm_ai_pending_actions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage AI reports" ON public.crm_ai_reports
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Inserir configuração padrão
INSERT INTO public.crm_ai_config (engine, model, system_prompt)
VALUES ('gemini', 'gemini-2.0-flash', 'Você é um assistente de CRM inteligente. Você pode analisar dados de clientes, sugerir ações e gerar relatórios. Para QUALQUER alteração nos dados, você DEVE solicitar aprovação primeiro.');

-- Trigger para updated_at
CREATE TRIGGER update_crm_ai_config_updated_at
  BEFORE UPDATE ON public.crm_ai_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();