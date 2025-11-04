-- ============================================
-- 1. CRM SIMPLES PARA MICROEMPRESAS
-- ============================================

-- Tabela de clientes do CRM
CREATE TABLE IF NOT EXISTS public.crm_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  business_type TEXT,
  status TEXT NOT NULL DEFAULT 'lead', -- lead, prospect, customer, inactive
  last_contact_date TIMESTAMP WITH TIME ZONE,
  total_purchases DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de interações do CRM
CREATE TABLE IF NOT EXISTS public.crm_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- call, email, whatsapp, meeting, note
  subject TEXT,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de negócios/oportunidades
CREATE TABLE IF NOT EXISTS public.crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open, won, lost
  stage TEXT NOT NULL DEFAULT 'prospecting', -- prospecting, proposal, negotiation, closed
  expected_close_date DATE,
  closed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. DASHBOARDS PERSONALIZADOS
-- ============================================

-- Tabela de dashboards customizados
CREATE TABLE IF NOT EXISTS public.custom_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  webhook_url TEXT, -- URL para receber dados via n8n
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de widgets/métricas
CREATE TABLE IF NOT EXISTS public.dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES public.custom_dashboards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- line, bar, pie, number, table
  metric_key TEXT NOT NULL, -- chave do dado a ser exibido
  position INTEGER DEFAULT 0,
  config JSONB, -- configurações específicas do widget
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de dados recebidos via webhook
CREATE TABLE IF NOT EXISTS public.dashboard_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES public.custom_dashboards(id) ON DELETE CASCADE,
  data JSONB NOT NULL, -- dados recebidos do webhook
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. GESTÃO DE COBRANÇAS AUTOMATIZADA
-- ============================================

-- Tabela de clientes de cobrança
CREATE TABLE IF NOT EXISTS public.billing_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  cpf_cnpj TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de faturas/cobranças
CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.billing_customers(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  payment_method TEXT, -- pix, boleto, card
  payment_link TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, overdue, cancelled
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de pagamentos
CREATE TABLE IF NOT EXISTS public.billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.billing_invoices(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_proof_url TEXT,
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- Tabela de lembretes de cobrança enviados
CREATE TABLE IF NOT EXISTS public.billing_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.billing_invoices(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  type TEXT NOT NULL, -- before_due, on_due, after_due
  message TEXT NOT NULL,
  status TEXT DEFAULT 'sent' -- sent, delivered, read, failed
);

-- ============================================
-- 4. LANDING PAGES AUTOMATIZADAS
-- ============================================

-- Tabela de landing pages
CREATE TABLE IF NOT EXISTS public.landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  business_segment TEXT,
  headline TEXT NOT NULL,
  subheadline TEXT,
  cta_text TEXT NOT NULL DEFAULT 'Entre em Contato',
  cta_url TEXT,
  colors JSONB, -- {primary, secondary, background, text}
  hero_image_url TEXT,
  logo_url TEXT,
  features JSONB[], -- [{title, description, icon}]
  testimonials JSONB[], -- [{name, text, photo}]
  is_active BOOLEAN DEFAULT true,
  webhook_url TEXT, -- para enviar leads para n8n
  views INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de leads capturados
CREATE TABLE IF NOT EXISTS public.landing_page_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id UUID NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  source TEXT, -- utm_source ou origem
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. POSTS SOCIAIS AUTOMATIZADOS
-- ============================================

-- Tabela de campanhas sociais
CREATE TABLE IF NOT EXISTS public.social_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT, -- lançamento, promoção, institucional
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de posts
CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.social_campaigns(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  platforms TEXT[] NOT NULL, -- ['instagram', 'facebook', 'linkedin']
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, published, failed, cancelled
  published_at TIMESTAMP WITH TIME ZONE,
  webhook_url TEXT, -- URL do n8n para publicação
  webhook_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- RLS POLICIES
-- ============================================

-- CRM
ALTER TABLE public.crm_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own CRM customers" ON public.crm_customers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own CRM interactions" ON public.crm_interactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own CRM deals" ON public.crm_deals FOR ALL USING (auth.uid() = user_id);

-- Dashboards
ALTER TABLE public.custom_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own dashboards" ON public.custom_dashboards FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their dashboard widgets" ON public.dashboard_widgets FOR ALL USING (
  EXISTS (SELECT 1 FROM public.custom_dashboards WHERE id = dashboard_id AND user_id = auth.uid())
);
CREATE POLICY "Users can view their dashboard data" ON public.dashboard_data FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.custom_dashboards WHERE id = dashboard_id AND user_id = auth.uid())
);
CREATE POLICY "System can insert dashboard data" ON public.dashboard_data FOR INSERT WITH CHECK (true);

-- Billing
ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their billing customers" ON public.billing_customers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their invoices" ON public.billing_invoices FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view their payments" ON public.billing_payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.billing_invoices WHERE id = invoice_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create payments" ON public.billing_payments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.billing_invoices WHERE id = invoice_id AND user_id = auth.uid())
);
CREATE POLICY "Users can view their reminders" ON public.billing_reminders FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.billing_invoices WHERE id = invoice_id AND user_id = auth.uid())
);
CREATE POLICY "System can create reminders" ON public.billing_reminders FOR INSERT WITH CHECK (true);

-- Landing Pages
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_page_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their landing pages" ON public.landing_pages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view active landing pages" ON public.landing_pages FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view their landing page leads" ON public.landing_page_leads FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.landing_pages WHERE id = landing_page_id AND user_id = auth.uid())
);
CREATE POLICY "Anyone can create landing page leads" ON public.landing_page_leads FOR INSERT WITH CHECK (true);

-- Social Posts
ALTER TABLE public.social_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their campaigns" ON public.social_campaigns FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their posts" ON public.social_posts FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE TRIGGER update_crm_customers_updated_at BEFORE UPDATE ON public.crm_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_deals_updated_at BEFORE UPDATE ON public.crm_deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_dashboards_updated_at BEFORE UPDATE ON public.custom_dashboards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_billing_customers_updated_at BEFORE UPDATE ON public.billing_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_billing_invoices_updated_at BEFORE UPDATE ON public.billing_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_landing_pages_updated_at BEFORE UPDATE ON public.landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_campaigns_updated_at BEFORE UPDATE ON public.social_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_posts_updated_at BEFORE UPDATE ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();