-- =====================================================
-- CRIAR TODAS AS TABELAS FALTANTES
-- =====================================================

-- Enum para tipo de aquisição de produto (se não existir)
DO $$ BEGIN
  CREATE TYPE public.acquisition_type AS ENUM ('purchase', 'rental');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum para status de trial gratuito (se não existir)
DO $$ BEGIN
  CREATE TYPE public.trial_status AS ENUM ('active', 'expired', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ========== TABELAS PRINCIPAIS ==========

-- Tabela de perfis de usuários
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  cpf TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== ADMIN & CRM ==========

CREATE TABLE IF NOT EXISTS public.admin_crm_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  cpf_cnpj TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  source TEXT,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  sale_price NUMERIC DEFAULT 0,
  cost_price NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crm_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  title TEXT NOT NULL,
  value NUMERIC,
  stage TEXT,
  expected_close_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== AI & AGENT CONFIGURATION ==========

CREATE TABLE IF NOT EXISTS public.ai_control_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_product_id UUID,
  business_name TEXT,
  personality TEXT,
  system_prompt TEXT,
  action_instructions TEXT,
  provider TEXT,
  model TEXT,
  ai_model TEXT,
  temperature NUMERIC,
  max_tokens INTEGER,
  tools_enabled TEXT[],
  ai_credentials JSONB,
  configuration JSONB,
  n8n_webhook_url TEXT,
  memory_session_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.n8n_agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== BOT & TRADING ==========

CREATE TABLE IF NOT EXISTS public.bot_hft_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange TEXT DEFAULT 'binance',
  trading_pair TEXT,
  strategy TEXT,
  risk_level TEXT,
  initial_capital NUMERIC,
  patrimonio_atual NUMERIC,
  api_key TEXT,
  api_secret TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== FINANCIAL MANAGEMENT ==========

CREATE TABLE IF NOT EXISTS public.box_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_type TEXT NOT NULL UNIQUE,
  balance NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.box_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_type TEXT NOT NULL,
  movement_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT,
  description TEXT,
  payment_method TEXT,
  reference_date DATE,
  notes TEXT,
  product_id UUID REFERENCES public.admin_products(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== FINANCIAL AGENT ==========

CREATE TABLE IF NOT EXISTS public.financial_agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL,
  webhook_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.financial_agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL,
  session_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.financial_agent_chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL,
  session_id UUID,
  direction TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.financial_agent_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  payment_method TEXT,
  source TEXT,
  date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.financial_agent_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT,
  recurring BOOLEAN DEFAULT false,
  recurring_interval TEXT,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.financial_agent_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC DEFAULT 0,
  deadline DATE,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== CRM AI ==========

CREATE TABLE IF NOT EXISTS public.crm_ai_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT,
  model TEXT,
  temperature NUMERIC,
  max_tokens INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crm_ai_pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT,
  status TEXT,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crm_ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crm_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crm_webhook_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL,
  webhook_url TEXT,
  webhook_token TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Continua na próxima parte...