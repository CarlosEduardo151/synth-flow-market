-- Criar tabela de configuração de controle de IA
CREATE TABLE IF NOT EXISTS public.ai_control_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  n8n_webhook_url TEXT,
  auto_restart BOOLEAN DEFAULT false,
  max_requests_per_day INTEGER,
  current_requests_count INTEGER DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE,
  configuration JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(customer_product_id)
);

-- Criar tabela de logs de eventos
CREATE TABLE IF NOT EXISTS public.ai_control_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  webhook_sent BOOLEAN DEFAULT false,
  webhook_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_ai_control_config_product ON public.ai_control_config(customer_product_id);
CREATE INDEX IF NOT EXISTS idx_ai_control_logs_product ON public.ai_control_logs(customer_product_id);
CREATE INDEX IF NOT EXISTS idx_ai_control_logs_created ON public.ai_control_logs(created_at DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_ai_control_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_control_config_updated_at
  BEFORE UPDATE ON public.ai_control_config
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_control_config_updated_at();

-- Habilitar RLS
ALTER TABLE public.ai_control_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_control_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para ai_control_config
CREATE POLICY "Users can view their own AI control config"
  ON public.ai_control_config
  FOR SELECT
  USING (
    customer_product_id IN (
      SELECT id FROM public.customer_products WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own AI control config"
  ON public.ai_control_config
  FOR UPDATE
  USING (
    customer_product_id IN (
      SELECT id FROM public.customer_products WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own AI control config"
  ON public.ai_control_config
  FOR INSERT
  WITH CHECK (
    customer_product_id IN (
      SELECT id FROM public.customer_products WHERE user_id = auth.uid()
    )
  );

-- Políticas RLS para ai_control_logs
CREATE POLICY "Users can view their own AI control logs"
  ON public.ai_control_logs
  FOR SELECT
  USING (
    customer_product_id IN (
      SELECT id FROM public.customer_products WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own AI control logs"
  ON public.ai_control_logs
  FOR INSERT
  WITH CHECK (
    customer_product_id IN (
      SELECT id FROM public.customer_products WHERE user_id = auth.uid()
    )
  );
