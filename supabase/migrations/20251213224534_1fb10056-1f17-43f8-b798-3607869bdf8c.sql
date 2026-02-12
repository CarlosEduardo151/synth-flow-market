-- Tabela de configurações do agente financeiro
CREATE TABLE public.financial_agent_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'personal' CHECK (mode IN ('personal', 'business')),
  business_name TEXT,
  currency TEXT NOT NULL DEFAULT 'BRL',
  webhook_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  n8n_webhook_url TEXT,
  monthly_budget NUMERIC,
  alert_threshold INTEGER DEFAULT 80,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_product_id)
);

-- Tabela de categorias personalizadas
CREATE TABLE public.financial_agent_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de transações financeiras
CREATE TABLE public.financial_agent_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.financial_agent_categories(id),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  recurring BOOLEAN DEFAULT false,
  recurring_interval TEXT CHECK (recurring_interval IN ('daily', 'weekly', 'monthly', 'yearly')),
  tags TEXT[],
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'chatbot', 'import')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de faturas/contas
CREATE TABLE public.financial_agent_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  paid_at TIMESTAMP WITH TIME ZONE,
  category_id UUID REFERENCES public.financial_agent_categories(id),
  recurring BOOLEAN DEFAULT false,
  recurring_interval TEXT CHECK (recurring_interval IN ('monthly', 'yearly')),
  notes TEXT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'chatbot', 'import')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de metas financeiras
CREATE TABLE public.financial_agent_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de logs do chatbot
CREATE TABLE public.financial_agent_chat_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  message TEXT NOT NULL,
  action_type TEXT,
  action_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.financial_agent_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_agent_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_agent_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_agent_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_agent_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_agent_chat_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can manage their financial config"
ON public.financial_agent_config FOR ALL
USING (EXISTS (
  SELECT 1 FROM customer_products
  WHERE customer_products.id = financial_agent_config.customer_product_id
  AND customer_products.user_id = auth.uid()
));

CREATE POLICY "Users can manage their categories"
ON public.financial_agent_categories FOR ALL
USING (EXISTS (
  SELECT 1 FROM customer_products
  WHERE customer_products.id = financial_agent_categories.customer_product_id
  AND customer_products.user_id = auth.uid()
));

CREATE POLICY "Users can manage their transactions"
ON public.financial_agent_transactions FOR ALL
USING (EXISTS (
  SELECT 1 FROM customer_products
  WHERE customer_products.id = financial_agent_transactions.customer_product_id
  AND customer_products.user_id = auth.uid()
));

CREATE POLICY "System can insert transactions via webhook"
ON public.financial_agent_transactions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can manage their invoices"
ON public.financial_agent_invoices FOR ALL
USING (EXISTS (
  SELECT 1 FROM customer_products
  WHERE customer_products.id = financial_agent_invoices.customer_product_id
  AND customer_products.user_id = auth.uid()
));

CREATE POLICY "System can insert invoices via webhook"
ON public.financial_agent_invoices FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can manage their goals"
ON public.financial_agent_goals FOR ALL
USING (EXISTS (
  SELECT 1 FROM customer_products
  WHERE customer_products.id = financial_agent_goals.customer_product_id
  AND customer_products.user_id = auth.uid()
));

CREATE POLICY "Users can manage their chat logs"
ON public.financial_agent_chat_logs FOR ALL
USING (EXISTS (
  SELECT 1 FROM customer_products
  WHERE customer_products.id = financial_agent_chat_logs.customer_product_id
  AND customer_products.user_id = auth.uid()
));

CREATE POLICY "System can insert chat logs via webhook"
ON public.financial_agent_chat_logs FOR INSERT
WITH CHECK (true);

-- Triggers para updated_at
CREATE TRIGGER update_financial_agent_config_updated_at
BEFORE UPDATE ON public.financial_agent_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_agent_transactions_updated_at
BEFORE UPDATE ON public.financial_agent_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_agent_invoices_updated_at
BEFORE UPDATE ON public.financial_agent_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_agent_goals_updated_at
BEFORE UPDATE ON public.financial_agent_goals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();