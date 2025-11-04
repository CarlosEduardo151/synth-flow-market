-- Sistema de Fidelidade Digital (correção)
-- Primeiro, remove políticas existentes se houver
DROP POLICY IF EXISTS "Users can manage their loyalty clients" ON public.loyalty_clients;
DROP POLICY IF EXISTS "Users can manage their loyalty rewards" ON public.loyalty_rewards;
DROP POLICY IF EXISTS "Users can manage their loyalty transactions" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "Users can manage their loyalty settings" ON public.loyalty_settings;
DROP POLICY IF EXISTS "Users can manage their loyalty message templates" ON public.loyalty_message_templates;

-- Tabela de clientes do programa de fidelidade
CREATE TABLE IF NOT EXISTS public.loyalty_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  points_balance INTEGER NOT NULL DEFAULT 0,
  total_points_earned INTEGER NOT NULL DEFAULT 0,
  total_points_redeemed INTEGER NOT NULL DEFAULT 0,
  last_transaction_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar constraint unique se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'loyalty_clients_customer_product_id_phone_key'
  ) THEN
    ALTER TABLE public.loyalty_clients 
    ADD CONSTRAINT loyalty_clients_customer_product_id_phone_key 
    UNIQUE(customer_product_id, phone);
  END IF;
END $$;

-- Tabela de recompensas
CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  quantity_available INTEGER,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_redeemed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de transações de pontos
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.loyalty_clients(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('add', 'remove', 'redeem', 'expire', 'reset')),
  points_amount INTEGER NOT NULL,
  description TEXT,
  reward_id UUID REFERENCES public.loyalty_rewards(id),
  origin TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de configurações do programa
CREATE TABLE IF NOT EXISTS public.loyalty_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE UNIQUE,
  conversion_rate NUMERIC(10,2) NOT NULL DEFAULT 1.00,
  points_expiry_days INTEGER,
  welcome_message TEXT,
  webhook_url TEXT,
  auto_send_messages BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de templates de mensagens
CREATE TABLE IF NOT EXISTS public.loyalty_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('points_added', 'reward_redeemed', 'welcome', 'custom')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_loyalty_clients_customer_product ON public.loyalty_clients(customer_product_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_clients_phone ON public.loyalty_clients(phone);
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_customer_product ON public.loyalty_rewards(customer_product_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer_product ON public.loyalty_transactions(customer_product_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_client ON public.loyalty_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_date ON public.loyalty_transactions(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.loyalty_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_message_templates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can manage their loyalty clients"
  ON public.loyalty_clients
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.customer_products
      WHERE customer_products.id = loyalty_clients.customer_product_id
      AND customer_products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their loyalty rewards"
  ON public.loyalty_rewards
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.customer_products
      WHERE customer_products.id = loyalty_rewards.customer_product_id
      AND customer_products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their loyalty transactions"
  ON public.loyalty_transactions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.customer_products
      WHERE customer_products.id = loyalty_transactions.customer_product_id
      AND customer_products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their loyalty settings"
  ON public.loyalty_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.customer_products
      WHERE customer_products.id = loyalty_settings.customer_product_id
      AND customer_products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their loyalty message templates"
  ON public.loyalty_message_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.customer_products
      WHERE customer_products.id = loyalty_message_templates.customer_product_id
      AND customer_products.user_id = auth.uid()
    )
  );

-- Política adicional para receber webhook (insert sem auth)
CREATE POLICY "System can insert loyalty transactions via webhook"
  ON public.loyalty_transactions
  FOR INSERT
  WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_loyalty_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_loyalty_clients_updated_at ON public.loyalty_clients;
CREATE TRIGGER update_loyalty_clients_updated_at
  BEFORE UPDATE ON public.loyalty_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_loyalty_updated_at();

DROP TRIGGER IF EXISTS update_loyalty_rewards_updated_at ON public.loyalty_rewards;
CREATE TRIGGER update_loyalty_rewards_updated_at
  BEFORE UPDATE ON public.loyalty_rewards
  FOR EACH ROW
  EXECUTE FUNCTION update_loyalty_updated_at();

DROP TRIGGER IF EXISTS update_loyalty_settings_updated_at ON public.loyalty_settings;
CREATE TRIGGER update_loyalty_settings_updated_at
  BEFORE UPDATE ON public.loyalty_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_loyalty_updated_at();