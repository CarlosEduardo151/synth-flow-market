
-- =============================================
-- TABELA: product_rentals
-- =============================================
CREATE TABLE IF NOT EXISTS public.product_rentals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_slug TEXT NOT NULL,
  product_title TEXT,
  status TEXT DEFAULT 'active',
  rental_price NUMERIC,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.product_rentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rentals" ON public.product_rentals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rentals" ON public.product_rentals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rentals" ON public.product_rentals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all rentals" ON public.product_rentals
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- TABELA: support_tickets
-- =============================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'normal',
  category TEXT,
  response TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets" ON public.support_tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all tickets" ON public.support_tickets
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- TABELA: coupons
-- =============================================
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL,
  min_value NUMERIC,
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active coupons" ON public.coupons
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage coupons" ON public.coupons
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- TABELA: dashboard_configs
-- =============================================
CREATE TABLE IF NOT EXISTS public.dashboard_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL,
  dashboard_name TEXT DEFAULT 'Meu Dashboard',
  metrics JSONB DEFAULT '[]'::jsonb,
  webhook_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.dashboard_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dashboard_configs" ON public.dashboard_configs
  FOR ALL USING (true);

-- =============================================
-- TABELA: dashboard_data
-- =============================================
CREATE TABLE IF NOT EXISTS public.dashboard_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dashboard_config_id UUID REFERENCES public.dashboard_configs(id) ON DELETE CASCADE,
  data JSONB,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.dashboard_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dashboard_data" ON public.dashboard_data
  FOR ALL USING (true);

-- =============================================
-- TABELA: crm_message_templates
-- =============================================
CREATE TABLE IF NOT EXISTS public.crm_message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'whatsapp',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.crm_message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own crm_message_templates" ON public.crm_message_templates
  FOR ALL USING (true);

-- =============================================
-- TABELA: crm_webhook_config
-- =============================================
CREATE TABLE IF NOT EXISTS public.crm_webhook_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL UNIQUE,
  webhook_url TEXT,
  webhook_token TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.crm_webhook_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own crm_webhook_config" ON public.crm_webhook_config
  FOR ALL USING (true);

-- =============================================
-- TABELA: loyalty_settings
-- =============================================
CREATE TABLE IF NOT EXISTS public.loyalty_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL UNIQUE,
  points_per_real NUMERIC DEFAULT 1,
  welcome_bonus INTEGER DEFAULT 0,
  tier_bronze_min INTEGER DEFAULT 0,
  tier_silver_min INTEGER DEFAULT 100,
  tier_gold_min INTEGER DEFAULT 500,
  tier_platinum_min INTEGER DEFAULT 1000,
  expiration_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own loyalty_settings" ON public.loyalty_settings
  FOR ALL USING (true);

-- =============================================
-- TABELA: loyalty_message_templates
-- =============================================
CREATE TABLE IF NOT EXISTS public.loyalty_message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  trigger_type TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.loyalty_message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own loyalty_message_templates" ON public.loyalty_message_templates
  FOR ALL USING (true);

-- =============================================
-- ADICIONAR total_redeemed em loyalty_rewards
-- =============================================
ALTER TABLE public.loyalty_rewards ADD COLUMN IF NOT EXISTS total_redeemed INTEGER DEFAULT 0;

-- =============================================
-- TRIGGERS para updated_at
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'product_rentals',
    'support_tickets', 
    'coupons',
    'dashboard_configs',
    'crm_message_templates',
    'crm_webhook_config',
    'loyalty_settings',
    'loyalty_message_templates'
  ])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%s_updated_at ON public.%s;
      CREATE TRIGGER update_%s_updated_at
        BEFORE UPDATE ON public.%s
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    ', tbl, tbl, tbl, tbl);
  END LOOP;
END $$;
