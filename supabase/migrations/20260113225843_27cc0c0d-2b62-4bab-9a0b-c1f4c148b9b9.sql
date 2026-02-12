
-- =====================================================
-- MIGRAÇÃO COMPLETA: Adicionar colunas e tabelas faltantes
-- =====================================================

-- =====================================================
-- 1. CUSTOMER_PRODUCTS: Adicionar colunas faltantes
-- =====================================================
ALTER TABLE public.customer_products
ADD COLUMN IF NOT EXISTS product_title TEXT,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_downloads INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rental_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rental_payment_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS monthly_rental_price NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS webhook_token TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS n8n_workflow_id TEXT DEFAULT NULL;

-- =====================================================
-- 2. SALES_LEADS: Adicionar colunas de IA e extra
-- =====================================================
ALTER TABLE public.sales_leads
ADD COLUMN IF NOT EXISTS position TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_sentiment TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_analysis TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT NULL;

-- =====================================================
-- 3. LOYALTY_CLIENTS: Adicionar colunas faltantes
-- =====================================================
ALTER TABLE public.loyalty_clients
ADD COLUMN IF NOT EXISTS points_balance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_points_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_points_redeemed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- =====================================================
-- 4. LOYALTY_TRANSACTIONS: Adicionar colunas faltantes
-- =====================================================
ALTER TABLE public.loyalty_transactions
ADD COLUMN IF NOT EXISTS transaction_type TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS points_amount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS reward_id UUID DEFAULT NULL;

-- =====================================================
-- 5. AI_CONTROL_CONFIG: Adicionar colunas faltantes
-- =====================================================
ALTER TABLE public.ai_control_config
ADD COLUMN IF NOT EXISTS customer_product_id UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'gpt-4o',
ADD COLUMN IF NOT EXISTS personality TEXT DEFAULT 'amigavel',
ADD COLUMN IF NOT EXISTS action_instructions TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS memory_session_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS n8n_webhook_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tools_enabled TEXT[] DEFAULT ARRAY['httpRequestTool', 'calculatorTool'],
ADD COLUMN IF NOT EXISTS ai_credentials JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS configuration JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS business_name TEXT DEFAULT NULL;

-- =====================================================
-- 6. ORDERS: Adicionar coluna payment_receipt_url
-- =====================================================
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT DEFAULT NULL;

-- =====================================================
-- 7. RH_CANDIDATOS: Adicionar coluna etapa
-- =====================================================
ALTER TABLE public.rh_candidatos
ADD COLUMN IF NOT EXISTS etapa TEXT DEFAULT 'triagem';

-- =====================================================
-- 8. CRIAR TABELA CRM_OPPORTUNITIES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.crm_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  title TEXT NOT NULL,
  value NUMERIC DEFAULT 0,
  stage TEXT DEFAULT 'novo_lead',
  expected_close_date DATE DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own crm_opportunities" 
ON public.crm_opportunities 
FOR ALL 
USING (auth.uid() = user_id);

-- =====================================================
-- 9. CRIAR TABELA FINANCIAL_RECORDS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.financial_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT DEFAULT NULL,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own financial_records" 
ON public.financial_records 
FOR ALL 
USING (true);

-- =====================================================
-- 10. CRIAR TABELA INSTALLMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own installments" 
ON public.installments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = installments.order_id 
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own installments" 
ON public.installments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = installments.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- =====================================================
-- 11. CRIAR TABELA N8N_AGENT_MESSAGES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.n8n_agent_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT DEFAULT 'default',
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.n8n_agent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage n8n_agent_messages" 
ON public.n8n_agent_messages 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 12. CRIAR TABELA ZAPI_CONNECTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.zapi_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  instance_id TEXT NOT NULL,
  token TEXT NOT NULL,
  phone_number TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, instance_id)
);

ALTER TABLE public.zapi_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own zapi_connections" 
ON public.zapi_connections 
FOR ALL 
USING (auth.uid() = user_id);

-- =====================================================
-- 13. CRIAR TABELA WHATSAPP_MESSAGES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID DEFAULT NULL REFERENCES public.whatsapp_leads(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  direction TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage whatsapp_messages" 
ON public.whatsapp_messages 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 14. ADICIONAR COLUNAS FALTANTES EM WHATSAPP_LEADS
-- =====================================================
ALTER TABLE public.whatsapp_leads
ADD COLUMN IF NOT EXISTS phone_number TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS product_slug TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS product_title TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS first_message TEXT DEFAULT NULL;

-- =====================================================
-- 15. CRIAR BUCKET DE STORAGE PARA COMPROVANTES
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes', 'comprovantes', false)
ON CONFLICT (id) DO NOTHING;

-- Política para upload de comprovantes
CREATE POLICY "Users can upload own receipts"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'comprovantes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para visualização de comprovantes pelo admin
CREATE POLICY "Admins can view all receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'comprovantes' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Usuários podem ver seus próprios comprovantes
CREATE POLICY "Users can view own receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'comprovantes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- 16. ÍNDICES PARA MELHOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_customer_products_webhook_token ON public.customer_products(webhook_token);
CREATE INDEX IF NOT EXISTS idx_financial_records_customer_product ON public.financial_records(customer_product_id);
CREATE INDEX IF NOT EXISTS idx_installments_order ON public.installments(order_id);
CREATE INDEX IF NOT EXISTS idx_n8n_messages_agent ON public.n8n_agent_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_lead ON public.whatsapp_messages(lead_id);

-- =====================================================
-- 17. CONSTRAINT ÚNICA PARA AI_CONTROL_CONFIG
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_control_config_customer_product_id_key'
  ) THEN
    ALTER TABLE public.ai_control_config ADD CONSTRAINT ai_control_config_customer_product_id_key UNIQUE (customer_product_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignora se já existe
  NULL;
END $$;
