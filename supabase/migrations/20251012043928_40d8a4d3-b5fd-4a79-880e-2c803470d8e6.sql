-- ============================================
-- TABELAS PARA PRODUTOS COM SISTEMAS INTEGRADOS
-- ============================================

-- Sistema CRM (vinculado ao produto "crm-simples")
CREATE TABLE IF NOT EXISTS public.crm_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  business_type TEXT,
  status TEXT NOT NULL DEFAULT 'lead',
  last_contact_date TIMESTAMP WITH TIME ZONE,
  total_purchases DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crm_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  subject TEXT,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sistema de Dashboards (vinculado ao produto "dashboards-personalizados")
CREATE TABLE IF NOT EXISTS public.dashboard_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  metrics JSONB NOT NULL DEFAULT '[]',
  webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dashboard_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_config_id UUID NOT NULL REFERENCES public.dashboard_configs(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  value DECIMAL(10,2),
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sistema de Gestão de Cobranças (vinculado ao produto "gestao-cobrancas")
CREATE TABLE IF NOT EXISTS public.billing_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  cpf_cnpj TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.billing_clients(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  whatsapp_reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sistema de Landing Pages (vinculado ao produto "landing-pages")
CREATE TABLE IF NOT EXISTS public.user_landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  headline TEXT NOT NULL,
  subheadline TEXT,
  cta_text TEXT DEFAULT 'Entre em Contato',
  colors JSONB,
  hero_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  views INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.landing_page_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id UUID NOT NULL REFERENCES public.user_landing_pages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sistema de Posts Sociais (vinculado ao produto "posts-sociais")
CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  platforms TEXT[] NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sistema de Relatórios Financeiros (vinculado ao produto "relatorios-financeiros")
CREATE TABLE IF NOT EXISTS public.financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- receita, despesa
  category TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sistema de Gestão de Cobranças (vinculado ao produto "gestao-cobrancas")  
CREATE TABLE IF NOT EXISTS public.collection_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL UNIQUE REFERENCES public.customer_products(id) ON DELETE CASCADE,
  auto_send_reminders BOOLEAN DEFAULT true,
  days_before_due INTEGER DEFAULT 3,
  whatsapp_template TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.crm_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_page_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_settings ENABLE ROW LEVEL SECURITY;

-- Policies para CRM
CREATE POLICY "Users can manage their CRM customers" ON public.crm_customers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.customer_products WHERE id = customer_product_id AND user_id = auth.uid())
);

CREATE POLICY "Users can manage their CRM interactions" ON public.crm_interactions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.crm_customers cc
    JOIN public.customer_products cp ON cc.customer_product_id = cp.id
    WHERE cc.id = customer_id AND cp.user_id = auth.uid()
  )
);

-- Policies para Dashboard
CREATE POLICY "Users can manage their dashboards" ON public.dashboard_configs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.customer_products WHERE id = customer_product_id AND user_id = auth.uid())
);

CREATE POLICY "Users can view their dashboard data" ON public.dashboard_data FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.dashboard_configs dc
    JOIN public.customer_products cp ON dc.customer_product_id = cp.id
    WHERE dc.id = dashboard_config_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "System can insert dashboard data" ON public.dashboard_data FOR INSERT WITH CHECK (true);

-- Policies para Cobrança
CREATE POLICY "Users can manage their billing clients" ON public.billing_clients FOR ALL USING (
  EXISTS (SELECT 1 FROM public.customer_products WHERE id = customer_product_id AND user_id = auth.uid())
);

CREATE POLICY "Users can manage their invoices" ON public.billing_invoices FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.billing_clients bc
    JOIN public.customer_products cp ON bc.customer_product_id = cp.id
    WHERE bc.id = client_id AND cp.user_id = auth.uid()
  )
);

-- Policies para Landing Pages
CREATE POLICY "Users can manage their landing pages" ON public.user_landing_pages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.customer_products WHERE id = customer_product_id AND user_id = auth.uid())
);

CREATE POLICY "Anyone can view active landing pages" ON public.user_landing_pages FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view their landing page leads" ON public.landing_page_leads FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_landing_pages lp
    JOIN public.customer_products cp ON lp.customer_product_id = cp.id
    WHERE lp.id = landing_page_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can create landing page leads" ON public.landing_page_leads FOR INSERT WITH CHECK (true);

-- Policies para Posts Sociais
CREATE POLICY "Users can manage their social posts" ON public.social_posts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.customer_products WHERE id = customer_product_id AND user_id = auth.uid())
);

-- Policies para Relatórios Financeiros
CREATE POLICY "Users can manage their financial records" ON public.financial_records FOR ALL USING (
  EXISTS (SELECT 1 FROM public.customer_products WHERE id = customer_product_id AND user_id = auth.uid())
);

-- Policies para Collection Settings
CREATE POLICY "Users can manage their collection settings" ON public.collection_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.customer_products WHERE id = customer_product_id AND user_id = auth.uid())
);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_crm_customers_updated_at BEFORE UPDATE ON public.crm_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dashboard_configs_updated_at BEFORE UPDATE ON public.dashboard_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_billing_clients_updated_at BEFORE UPDATE ON public.billing_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_billing_invoices_updated_at BEFORE UPDATE ON public.billing_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_landing_pages_updated_at BEFORE UPDATE ON public.user_landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_posts_updated_at BEFORE UPDATE ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collection_settings_updated_at BEFORE UPDATE ON public.collection_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();