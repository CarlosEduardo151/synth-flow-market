-- Criar tabela de oportunidades para pipeline de vendas
CREATE TABLE IF NOT EXISTS public.crm_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  value NUMERIC DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'novo_lead',
  probability INTEGER DEFAULT 50,
  expected_close_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de templates de mensagens automáticas
CREATE TABLE IF NOT EXISTS public.crm_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'whatsapp',
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de configuração do webhook
CREATE TABLE IF NOT EXISTS public.crm_webhook_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(customer_product_id)
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_webhook_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para oportunidades
CREATE POLICY "Users can manage their CRM opportunities"
ON public.crm_opportunities
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.crm_customers cc
    JOIN public.customer_products cp ON cc.customer_product_id = cp.id
    WHERE cc.id = crm_opportunities.customer_id
    AND cp.user_id = auth.uid()
  )
);

-- Políticas RLS para templates de mensagens
CREATE POLICY "Users can manage their message templates"
ON public.crm_message_templates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.customer_products
    WHERE customer_products.id = crm_message_templates.customer_product_id
    AND customer_products.user_id = auth.uid()
  )
);

-- Políticas RLS para webhook config
CREATE POLICY "Users can manage their webhook config"
ON public.crm_webhook_config
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.customer_products
    WHERE customer_products.id = crm_webhook_config.customer_product_id
    AND customer_products.user_id = auth.uid()
  )
);

-- Triggers para atualizar updated_at
CREATE TRIGGER update_crm_opportunities_updated_at
BEFORE UPDATE ON public.crm_opportunities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_message_templates_updated_at
BEFORE UPDATE ON public.crm_message_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_webhook_config_updated_at
BEFORE UPDATE ON public.crm_webhook_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();