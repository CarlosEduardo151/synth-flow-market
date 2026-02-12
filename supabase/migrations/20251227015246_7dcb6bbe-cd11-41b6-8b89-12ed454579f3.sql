
-- ==========================================
-- SISTEMA DE GESTÃO FINANCEIRA PARA ADMIN
-- ==========================================

-- Tabela de produtos com custos para cálculo das 3 caixinhas
CREATE TABLE public.admin_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sale_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.admin_products ENABLE ROW LEVEL SECURITY;

-- Somente admins podem gerenciar produtos
CREATE POLICY "Admins podem ver produtos"
ON public.admin_products FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem criar produtos"
ON public.admin_products FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar produtos"
ON public.admin_products FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem deletar produtos"
ON public.admin_products FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_admin_products_updated_at
BEFORE UPDATE ON public.admin_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ==========================================
-- TRANSAÇÕES FINANCEIRAS (FLUXO DE CAIXA)
-- ==========================================

CREATE TABLE public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  product_id UUID REFERENCES public.admin_products(id) ON DELETE SET NULL,
  payment_method TEXT,
  reference_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- Somente admins podem gerenciar transações
CREATE POLICY "Admins podem ver transações"
ON public.financial_transactions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem criar transações"
ON public.financial_transactions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar transações"
ON public.financial_transactions FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem deletar transações"
ON public.financial_transactions FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_financial_transactions_updated_at
BEFORE UPDATE ON public.financial_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ==========================================
-- CÁLCULO DAS 3 CAIXINHAS
-- ==========================================

CREATE TABLE public.profit_distribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.admin_products(id) ON DELETE CASCADE,
  sale_price DECIMAL(12, 2) NOT NULL,
  cost_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  gross_profit DECIMAL(12, 2) NOT NULL,
  reinvestment_amount DECIMAL(12, 2) NOT NULL, -- 33%
  emergency_amount DECIMAL(12, 2) NOT NULL, -- 33%
  prolabore_amount DECIMAL(12, 2) NOT NULL, -- 33%
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.profit_distribution ENABLE ROW LEVEL SECURITY;

-- Somente admins podem gerenciar distribuição
CREATE POLICY "Admins podem ver distribuição"
ON public.profit_distribution FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem criar distribuição"
ON public.profit_distribution FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar distribuição"
ON public.profit_distribution FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem deletar distribuição"
ON public.profit_distribution FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- ==========================================
-- SALDOS DAS CAIXINHAS (TOTAIS ACUMULADOS)
-- ==========================================

CREATE TABLE public.box_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_type TEXT NOT NULL CHECK (box_type IN ('reinvestment', 'emergency', 'prolabore')),
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(box_type)
);

-- Inserir registros iniciais das caixinhas
INSERT INTO public.box_balances (box_type, balance) VALUES 
  ('reinvestment', 0),
  ('emergency', 0),
  ('prolabore', 0);

-- Habilitar RLS
ALTER TABLE public.box_balances ENABLE ROW LEVEL SECURITY;

-- Somente admins podem gerenciar saldos
CREATE POLICY "Admins podem ver saldos"
ON public.box_balances FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar saldos"
ON public.box_balances FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- ==========================================
-- CLIENTES DO CRM PARA ADMIN
-- ==========================================

CREATE TABLE public.admin_crm_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cpf_cnpj TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  company TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'lead', 'prospect', 'customer')),
  source TEXT, -- Como conheceu a empresa
  total_purchases DECIMAL(12, 2) NOT NULL DEFAULT 0,
  last_purchase_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.admin_crm_customers ENABLE ROW LEVEL SECURITY;

-- Somente admins podem gerenciar clientes
CREATE POLICY "Admins podem ver clientes"
ON public.admin_crm_customers FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem criar clientes"
ON public.admin_crm_customers FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar clientes"
ON public.admin_crm_customers FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem deletar clientes"
ON public.admin_crm_customers FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_admin_crm_customers_updated_at
BEFORE UPDATE ON public.admin_crm_customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ==========================================
-- MOVIMENTAÇÕES DAS CAIXINHAS
-- ==========================================

CREATE TABLE public.box_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_type TEXT NOT NULL CHECK (box_type IN ('reinvestment', 'emergency', 'prolabore')),
  type TEXT NOT NULL CHECK (type IN ('in', 'out')),
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT NOT NULL,
  reference_id UUID, -- Pode referenciar profit_distribution ou financial_transactions
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.box_movements ENABLE ROW LEVEL SECURITY;

-- Somente admins podem gerenciar movimentações
CREATE POLICY "Admins podem ver movimentações"
ON public.box_movements FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem criar movimentações"
ON public.box_movements FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem deletar movimentações"
ON public.box_movements FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
