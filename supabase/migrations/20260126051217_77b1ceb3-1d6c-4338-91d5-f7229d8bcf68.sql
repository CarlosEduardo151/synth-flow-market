-- =====================================================
-- PARTE 3: DASHBOARDS, LOYALTY, SALES, RH, SOCIAL, SUPPORT, WHATSAPP, CHAT
-- =====================================================

-- DASHBOARDS
CREATE TABLE IF NOT EXISTS public.dashboard_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL,
  dashboard_name TEXT,
  metrics JSONB,
  webhook_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dashboard_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_config_id UUID REFERENCES public.dashboard_configs(id) ON DELETE CASCADE,
  data JSONB,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LOYALTY SYSTEM
CREATE TABLE IF NOT EXISTS public.loyalty_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  points INTEGER DEFAULT 0,
  points_balance NUMERIC,
  total_points_earned NUMERIC,
  total_points_redeemed NUMERIC,
  tier TEXT,
  status TEXT,
  last_transaction_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  total_redeemed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL,
  client_id UUID REFERENCES public.loyalty_clients(id),
  type TEXT NOT NULL,
  transaction_type TEXT,
  points INTEGER NOT NULL,
  points_amount NUMERIC,
  reward_id UUID,
  description TEXT,
  origin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.loyalty_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL,
  points_per_real NUMERIC,
  welcome_bonus INTEGER,
  expiration_days INTEGER,
  tier_bronze_min INTEGER,
  tier_silver_min INTEGER,
  tier_gold_min INTEGER,
  tier_platinum_min INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.loyalty_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  trigger_type TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SALES SYSTEM
CREATE TABLE IF NOT EXISTS public.sales_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  position TEXT,
  source TEXT,
  status TEXT,
  notes TEXT,
  tags TEXT[],
  ai_score NUMERIC,
  ai_sentiment TEXT,
  ai_analysis TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.sales_leads(id),
  stage TEXT,
  value NUMERIC,
  probability NUMERIC,
  expected_close_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.sales_leads(id),
  type TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.sales_leads(id),
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER,
  location TEXT,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales_ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB,
  priority TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RH (RECURSOS HUMANOS)
CREATE TABLE IF NOT EXISTS public.rh_vagas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  requisitos TEXT,
  local TEXT,
  tipo_contrato TEXT,
  salario_min NUMERIC,
  salario_max NUMERIC,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rh_candidatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vaga_id UUID REFERENCES public.rh_vagas(id),
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  linkedin TEXT,
  curriculo_url TEXT,
  status TEXT,
  etapa TEXT,
  idade INTEGER,
  avaliacao NUMERIC,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rh_entrevistas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vaga_id UUID REFERENCES public.rh_vagas(id),
  candidato_id UUID REFERENCES public.rh_candidatos(id),
  data_hora TIMESTAMPTZ NOT NULL,
  tipo TEXT,
  local TEXT,
  entrevistador TEXT,
  status TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SOCIAL MEDIA
CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  platforms JSONB,
  scheduled_for TIMESTAMPTZ,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SUPPORT SYSTEM
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT,
  priority TEXT,
  status TEXT,
  response TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WHATSAPP INTEGRATION
CREATE TABLE IF NOT EXISTS public.whatsapp_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  phone_number TEXT,
  name TEXT,
  message TEXT,
  first_message TEXT,
  product_slug TEXT,
  product_title TEXT,
  source TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.whatsapp_leads(id),
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  direction TEXT NOT NULL,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.zapi_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_id TEXT NOT NULL,
  token TEXT NOT NULL,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CHAT MESSAGES
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail TEXT,
  message TEXT NOT NULL,
  is_from_user BOOLEAN DEFAULT true,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);