 -- =====================================================
 -- SCRIPT SQL COMPLETO - SUPABASE DATABASE SCHEMA
 -- Gerado por auditoria completa do projeto
 -- Data: 2026-01-26
 -- =====================================================
 --
 -- INSTRUÇÕES DE USO:
 -- 1. Acesse o Supabase Dashboard
 -- 2. Vá em SQL Editor
 -- 3. Cole e execute este script completo
 --
 -- ATENÇÃO: Este script assume um banco de dados limpo.
 -- Se já existirem tabelas, você pode precisar ajustar.
 -- =====================================================
 
 -- =====================================================
 -- PARTE 1: TIPOS ENUMERADOS (ENUMS)
 -- =====================================================
 
 -- Enum para roles de usuário
 CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
 
 -- Enum para tipo de aquisição de produto
 CREATE TYPE public.acquisition_type AS ENUM ('purchase', 'rental');
 
 -- Enum para status de trial gratuito
 CREATE TYPE public.trial_status AS ENUM ('active', 'expired', 'cancelled');
 
 -- =====================================================
 -- PARTE 2: TABELAS PRINCIPAIS
 -- =====================================================
 
 -- Tabela de perfis de usuários
 CREATE TABLE public.profiles (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
   full_name TEXT,
   email TEXT,
   phone TEXT,
   avatar_url TEXT,
   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW(),
   UNIQUE(user_id)
 );
 
 -- Tabela de roles de usuários (CRITICAL: Separada de profiles)
 CREATE TABLE public.user_roles (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
   role app_role NOT NULL DEFAULT 'user',
   created_at TIMESTAMPTZ DEFAULT NOW(),
   UNIQUE(user_id, role)
 );
 
 -- =====================================================
 -- ADMIN & CRM
 -- =====================================================
 
 CREATE TABLE public.admin_crm_customers (
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
 
 CREATE TABLE public.admin_products (
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
 
 CREATE TABLE public.crm_opportunities (
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
 
 -- =====================================================
 -- AI & AGENT CONFIGURATION
 -- =====================================================
 
 CREATE TABLE public.ai_control_config (
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
 
 CREATE TABLE public.api_credentials (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   provider TEXT NOT NULL,
   api_key TEXT NOT NULL,
   is_active BOOLEAN DEFAULT true,
   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 CREATE TABLE public.n8n_agent_messages (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   agent_id UUID,
   role TEXT NOT NULL,
   content TEXT NOT NULL,
   metadata JSONB,
   created_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 -- =====================================================
 -- BOT & TRADING
 -- =====================================================
 
 CREATE TABLE public.bot_hft_configs (
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
 
 -- =====================================================
 -- FINANCIAL MANAGEMENT
 -- =====================================================
 
 CREATE TABLE public.box_balances (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   box_type TEXT NOT NULL,
   balance NUMERIC DEFAULT 0,
   updated_at TIMESTAMPTZ DEFAULT NOW(),
   UNIQUE(box_type)
 );
 
 CREATE TABLE public.box_movements (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   box_type TEXT NOT NULL,
   movement_type TEXT NOT NULL,
   amount NUMERIC NOT NULL,
   description TEXT,
   reference_id UUID,
   created_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 CREATE TABLE public.financial_transactions (
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
 
 CREATE TABLE public.financial_records (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   customer_product_id UUID NOT NULL,
   type TEXT NOT NULL,
   category TEXT NOT NULL,
   amount NUMERIC NOT NULL,
   description TEXT,
   date DATE,
   created_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 -- =====================================================
 -- FINANCIAL AGENT
 -- =====================================================
 
 CREATE TABLE public.financial_agent_config (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   customer_product_id UUID NOT NULL,
   webhook_token TEXT NOT NULL,
   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 CREATE TABLE public.financial_agent_sessions (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   customer_product_id UUID NOT NULL,
   session_name TEXT,
   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 CREATE TABLE public.financial_agent_chat_logs (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   customer_product_id UUID NOT NULL,
   session_id UUID,
   direction TEXT NOT NULL,
   message TEXT NOT NULL,
   created_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 CREATE TABLE public.financial_agent_transactions (
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
 
 CREATE TABLE public.financial_agent_invoices (
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
 
 CREATE TABLE public.financial_agent_goals (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   customer_product_id UUID NOT NULL,
   name TEXT NOT NULL,
   target_amount NUMERIC NOT NULL,
   current_amount NUMERIC DEFAULT 0,
   deadline DATE,
   status TEXT,
   created_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 -- =====================================================
 -- CRM AI
 -- =====================================================
 
 CREATE TABLE public.crm_ai_config (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
   provider TEXT,
   model TEXT,
   temperature NUMERIC,
   max_tokens INTEGER,
   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 CREATE TABLE public.crm_ai_pending_actions (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
   action_type TEXT NOT NULL,
   description TEXT NOT NULL,
   priority TEXT,
   status TEXT,
   due_date DATE,
   created_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 CREATE TABLE public.crm_ai_reports (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
   report_type TEXT NOT NULL,
   title TEXT NOT NULL,
   content TEXT,
   generated_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 CREATE TABLE public.crm_message_templates (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   customer_product_id UUID NOT NULL,
   name TEXT NOT NULL,
   content TEXT NOT NULL,
   message_type TEXT,
   is_active BOOLEAN DEFAULT true,
   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 CREATE TABLE public.crm_webhook_config (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   customer_product_id UUID NOT NULL,
   webhook_url TEXT,
   webhook_token TEXT,
   is_active BOOLEAN DEFAULT true,
   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 -- =====================================================
 -- CUSTOMER PRODUCTS & ORDERS
 -- =====================================================
 
 CREATE TABLE public.customer_products (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
   product_slug TEXT NOT NULL,
   product_title TEXT,
   acquisition_type acquisition_type DEFAULT 'purchase',
   is_active BOOLEAN DEFAULT true,
   delivered_at TIMESTAMPTZ,
   access_expires_at TIMESTAMPTZ,
   rental_start_date DATE,
   rental_end_date DATE,
   rental_payment_status TEXT,
   monthly_rental_price NUMERIC,
   download_count INTEGER DEFAULT 0,
   max_downloads INTEGER,
   n8n_workflow_id TEXT,
   webhook_token TEXT,
   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 CREATE TABLE public.orders (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
   total NUMERIC DEFAULT 0,
   total_amount NUMERIC,
   status TEXT,
   payment_method TEXT,
   payment_id TEXT,
   payment_receipt_url TEXT,
   customer_name TEXT,
   customer_email TEXT,
   customer_phone TEXT,
   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 CREATE TABLE public.order_items (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
   product_slug TEXT NOT NULL,
   product_title TEXT NOT NULL,
   product_name TEXT,
   quantity INTEGER DEFAULT 1,
   price NUMERIC NOT NULL,
   unit_price NUMERIC,
   created_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 CREATE TABLE public.installments (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
   installment_number INTEGER NOT NULL,
   amount NUMERIC NOT NULL,
   due_date DATE NOT NULL,
   status TEXT,
   paid_at TIMESTAMPTZ,
   created_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 -- =====================================================
 -- PRODUCT MANAGEMENT
 -- =====================================================
 
 CREATE TABLE public.product_credentials (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
   product_slug TEXT NOT NULL,
   credential_key TEXT NOT NULL,
   credential_value TEXT,
   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 CREATE TABLE public.product_required_credentials (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   product_slug TEXT NOT NULL,
   credential_key TEXT NOT NULL,
   credential_label TEXT NOT NULL,
   credential_type TEXT,
   is_required BOOLEAN DEFAULT true,
   created_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 CREATE TABLE public.product_rentals (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
   product_slug TEXT NOT NULL,
   product_title TEXT,
   rental_price NUMERIC,
   status TEXT,
   expires_at TIMESTAMPTZ,
   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 CREATE TABLE public.product_reviews (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
   product_slug TEXT NOT NULL,
   customer_name TEXT,
   rating INTEGER,
   review_text TEXT,
   is_approved BOOLEAN DEFAULT false,
   is_featured BOOLEAN DEFAULT false,
   created_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 CREATE TABLE public.customer_reviews (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   customer_name TEXT NOT NULL,
   review_text TEXT NOT NULL,
   rating INTEGER,
   is_approved BOOLEAN DEFAULT false,
   is_featured BOOLEAN DEFAULT false,
   created_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 -- =====================================================
 -- FREE TRIALS
 -- =====================================================
 
 CREATE TABLE public.free_trials (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
   product_slug TEXT NOT NULL,
   status trial_status DEFAULT 'active',
   expires_at TIMESTAMPTZ NOT NULL,
   created_at TIMESTAMPTZ DEFAULT NOW(),
   UNIQUE(user_id, product_slug)
 );
 
 CREATE TABLE public.tutorial_completions (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
   product_slug TEXT NOT NULL,
   current_step INTEGER DEFAULT 0,
   completed BOOLEAN DEFAULT false,
   completed_steps JSONB,
   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW(),
   UNIQUE(user_id, product_slug)
 );
 
 -- =====================================================
 -- COUPONS
 -- =====================================================
 
 CREATE TABLE public.coupons (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   code TEXT NOT NULL UNIQUE,
   discount_type TEXT,
   discount_value NUMERIC NOT NULL,
   min_value NUMERIC,
   max_uses INTEGER,
   uses_count INTEGER DEFAULT 0,
   valid_from DATE,
   valid_until DATE,
   description TEXT,
   is_active BOOLEAN DEFAULT true,
   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 -- =====================================================
 -- DASHBOARDS
 -- =====================================================
 
 CREATE TABLE public.dashboard_configs (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   customer_product_id UUID NOT NULL,
   dashboard_name TEXT,
   metrics JSONB,
   webhook_token TEXT,
   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 CREATE TABLE public.dashboard_data (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   dashboard_config_id UUID REFERENCES public.dashboard_configs(id) ON DELETE CASCADE,
   data JSONB,
   source TEXT,
   created_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 -- =====================================================
 -- LOYALTY SYSTEM
 -- =====================================================
 
 CREATE TABLE public.loyalty_clients (
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
 
 CREATE TABLE public.loyalty_rewards (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   customer_product_id UUID NOT NULL,
   name TEXT NOT NULL,
   description TEXT,
   points_required INTEGER NOT NULL,
   is_active BOOLEAN DEFAULT true,
   total_redeemed INTEGER DEFAULT 0,
   created_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 CREATE TABLE public.loyalty_transactions (
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
 
 CREATE TABLE public.loyalty_settings (
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
 
 CREATE TABLE public.loyalty_message_templates (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   customer_product_id UUID NOT NULL,
   name TEXT NOT NULL,
   content TEXT NOT NULL,
   trigger_type TEXT,
   is_active BOOLEAN DEFAULT true,
   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 -- =====================================================
 -- SALES SYSTEM
 -- =====================================================
 
 CREATE TABLE public.sales_leads (
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
 
 CREATE TABLE public.sales_pipeline (
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
 
 CREATE TABLE public.sales_follow_ups (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
   lead_id UUID REFERENCES public.sales_leads(id),
   type TEXT NOT NULL,
   scheduled_at TIMESTAMPTZ NOT NULL,
   status TEXT,
   notes TEXT,
   created_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 CREATE TABLE public.sales_meetings (
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
 
 CREATE TABLE public.sales_ai_insights (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
   insight_type TEXT NOT NULL,
   title TEXT NOT NULL,
   content JSONB,
   priority TEXT,
   created_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 -- =====================================================
 -- RH (RECURSOS HUMANOS)
 -- =====================================================
 
 CREATE TABLE public.rh_vagas (
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
 
 CREATE TABLE public.rh_candidatos (
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
   avaliacao NUMERIC,
   notas TEXT,
   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 CREATE TABLE public.rh_entrevistas (
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
 
 -- =====================================================
 -- SOCIAL MEDIA
 -- =====================================================
 
 CREATE TABLE public.social_posts (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   customer_product_id UUID NOT NULL,
   content TEXT NOT NULL,
   image_url TEXT,
   platforms JSONB,
   scheduled_for TIMESTAMPTZ,
   status TEXT,
   created_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 -- =====================================================
 -- SUPPORT SYSTEM
 -- =====================================================
 
 CREATE TABLE public.support_tickets (
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
 
 CREATE TABLE public.ticket_messages (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
   message TEXT NOT NULL,
   is_admin BOOLEAN DEFAULT false,
   created_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 -- =====================================================
 -- WHATSAPP INTEGRATION
 -- =====================================================
 
 CREATE TABLE public.whatsapp_leads (
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
 
 CREATE TABLE public.whatsapp_messages (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   lead_id UUID REFERENCES public.whatsapp_leads(id),
   phone_number TEXT NOT NULL,
   message TEXT NOT NULL,
   direction TEXT NOT NULL,
   status TEXT,
   created_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 CREATE TABLE public.zapi_connections (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
   instance_id TEXT NOT NULL,
   token TEXT NOT NULL,
   phone_number TEXT,
   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 -- =====================================================
 -- CHAT MESSAGES
 -- =====================================================
 
 CREATE TABLE public.chat_messages (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   gmail TEXT,
   message TEXT NOT NULL,
   is_from_user BOOLEAN DEFAULT true,
   is_read BOOLEAN DEFAULT false,
   created_at TIMESTAMPTZ DEFAULT NOW()
 );
 
 -- =====================================================
 -- PARTE 3: ÍNDICES PARA PERFORMANCE
 -- =====================================================
 
 CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
 CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
 CREATE INDEX idx_customer_products_user_id ON public.customer_products(user_id);
 CREATE INDEX idx_orders_user_id ON public.orders(user_id);
 CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
 CREATE INDEX idx_sales_leads_user_id ON public.sales_leads(user_id);
 CREATE INDEX idx_sales_pipeline_lead_id ON public.sales_pipeline(lead_id);
 CREATE INDEX idx_rh_candidatos_vaga_id ON public.rh_candidatos(vaga_id);
 CREATE INDEX idx_whatsapp_messages_lead_id ON public.whatsapp_messages(lead_id);
 CREATE INDEX idx_free_trials_user_product ON public.free_trials(user_id, product_slug);
 
 -- =====================================================
 -- PARTE 4: FUNÇÕES AUXILIARES (RPC)
 -- =====================================================
 
 -- Função para verificar se usuário tem determinada role
 CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
 RETURNS BOOLEAN
 LANGUAGE SQL
 STABLE
 SECURITY DEFINER
 SET search_path = public
 AS $$
   SELECT EXISTS (
     SELECT 1
     FROM public.user_roles
     WHERE user_id = _user_id AND role = _role
   )
 $$;
 
 -- Função para atualizar trials expirados
 CREATE OR REPLACE FUNCTION public.update_expired_trials()
 RETURNS VOID
 LANGUAGE SQL
 SECURITY DEFINER
 SET search_path = public
 AS $$
   UPDATE public.free_trials
   SET status = 'expired'
   WHERE status = 'active'
   AND expires_at < NOW();
 $$;
 
 -- Função para entregar produtos de uma ordem
 CREATE OR REPLACE FUNCTION public.deliver_order_products(order_id_param UUID)
 RETURNS JSON
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
 AS $$
 DECLARE
   v_user_id UUID;
   v_result JSON;
 BEGIN
   -- Buscar user_id da ordem
   SELECT user_id INTO v_user_id
   FROM public.orders
   WHERE id = order_id_param;
 
   -- Inserir produtos na tabela customer_products
   INSERT INTO public.customer_products (user_id, product_slug, product_title, delivered_at, is_active)
   SELECT 
     v_user_id,
     oi.product_slug,
     oi.product_title,
     NOW(),
     true
   FROM public.order_items oi
   WHERE oi.order_id = order_id_param
   ON CONFLICT DO NOTHING;
 
   -- Retornar resultado
   v_result := json_build_object(
     'success', true,
     'message', 'Produtos entregues com sucesso'
   );
 
   RETURN v_result;
 END;
 $$;
 
 -- =====================================================
 -- PARTE 5: ROW LEVEL SECURITY (RLS)
 -- =====================================================
 
 -- Habilitar RLS em todas as tabelas
 ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.admin_crm_customers ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.admin_products ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.ai_control_config ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.api_credentials ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.bot_hft_configs ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.box_balances ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.box_movements ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.crm_ai_config ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.crm_ai_pending_actions ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.crm_ai_reports ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.crm_message_templates ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.crm_webhook_config ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.customer_products ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.dashboard_configs ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.dashboard_data ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.financial_agent_config ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.financial_agent_sessions ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.financial_agent_chat_logs ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.financial_agent_transactions ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.financial_agent_invoices ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.financial_agent_goals ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.free_trials ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.product_credentials ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.product_required_credentials ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.product_rentals ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.loyalty_clients ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.loyalty_message_templates ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.n8n_agent_messages ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.sales_pipeline ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.sales_follow_ups ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.sales_meetings ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.sales_ai_insights ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.rh_vagas ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.rh_candidatos ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.rh_entrevistas ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.tutorial_completions ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.whatsapp_leads ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.zapi_connections ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
 
 -- =====================================================
 -- POLÍTICAS RLS - PROFILES
 -- =====================================================
 
 CREATE POLICY "Users can view own profile" ON public.profiles
   FOR SELECT USING (auth.uid() = user_id);
 
 CREATE POLICY "Users can update own profile" ON public.profiles
   FOR UPDATE USING (auth.uid() = user_id);
 
 CREATE POLICY "Admins can view all profiles" ON public.profiles
   FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
 
 -- =====================================================
 -- POLÍTICAS RLS - USER_ROLES
 -- =====================================================
 
 CREATE POLICY "Users can view own roles" ON public.user_roles
   FOR SELECT USING (auth.uid() = user_id);
 
 CREATE POLICY "Admins can view all roles" ON public.user_roles
   FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can manage all roles" ON public.user_roles
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 -- =====================================================
 -- POLÍTICAS RLS - ADMIN TABLES (APENAS ADMINS)
 -- =====================================================
 
 CREATE POLICY "Admins can manage customers" ON public.admin_crm_customers
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can manage products" ON public.admin_products
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can manage api_credentials" ON public.api_credentials
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can manage box_balances" ON public.box_balances
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can manage box_movements" ON public.box_movements
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can manage financial_transactions" ON public.financial_transactions
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can manage coupons" ON public.coupons
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can view customer_reviews" ON public.customer_reviews
   FOR SELECT USING (is_approved = true OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can manage customer_reviews" ON public.customer_reviews
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can manage product_required_credentials" ON public.product_required_credentials
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can manage n8n_agent_messages" ON public.n8n_agent_messages
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 -- =====================================================
 -- POLÍTICAS RLS - USER DATA (OWNER OR ADMIN)
 -- =====================================================
 
 CREATE POLICY "Users can view own ai_control_config" ON public.ai_control_config
   FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can manage own ai_control_config" ON public.ai_control_config
   FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can view own bot_hft_configs" ON public.bot_hft_configs
   FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can manage own bot_hft_configs" ON public.bot_hft_configs
   FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can view own crm_opportunities" ON public.crm_opportunities
   FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can manage own crm_opportunities" ON public.crm_opportunities
   FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can view own customer_products" ON public.customer_products
   FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can manage own customer_products" ON public.customer_products
   FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can view own orders" ON public.orders
   FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can create own orders" ON public.orders
   FOR INSERT WITH CHECK (auth.uid() = user_id);
 
 CREATE POLICY "Admins can manage all orders" ON public.orders
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can view own order_items" ON public.order_items
   FOR SELECT USING (
     EXISTS (
       SELECT 1 FROM public.orders o
       WHERE o.id = order_items.order_id
       AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
     )
   );
 
 CREATE POLICY "Users can view own free_trials" ON public.free_trials
   FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can manage own free_trials" ON public.free_trials
   FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can view own product_credentials" ON public.product_credentials
   FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can manage own product_credentials" ON public.product_credentials
   FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can view own product_rentals" ON public.product_rentals
   FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can manage own product_rentals" ON public.product_rentals
   FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can view own product_reviews" ON public.product_reviews
   FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can create product_reviews" ON public.product_reviews
   FOR INSERT WITH CHECK (auth.uid() = user_id);
 
 CREATE POLICY "Admins can manage product_reviews" ON public.product_reviews
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can view own tutorial_completions" ON public.tutorial_completions
   FOR SELECT USING (auth.uid() = user_id);
 
 CREATE POLICY "Users can manage own tutorial_completions" ON public.tutorial_completions
   FOR ALL USING (auth.uid() = user_id);
 
 CREATE POLICY "Users can view own sales_leads" ON public.sales_leads
   FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can manage own sales_leads" ON public.sales_leads
   FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can view own sales_pipeline" ON public.sales_pipeline
   FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can manage own sales_pipeline" ON public.sales_pipeline
   FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can view own rh_vagas" ON public.rh_vagas
   FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can manage own rh_vagas" ON public.rh_vagas
   FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can view own rh_candidatos" ON public.rh_candidatos
   FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can manage own rh_candidatos" ON public.rh_candidatos
   FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can view own support_tickets" ON public.support_tickets
   FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can create support_tickets" ON public.support_tickets
   FOR INSERT WITH CHECK (auth.uid() = user_id);
 
 CREATE POLICY "Admins can manage support_tickets" ON public.support_tickets
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can view own ticket_messages" ON public.ticket_messages
   FOR SELECT USING (
     EXISTS (
       SELECT 1 FROM public.support_tickets st
       WHERE st.id = ticket_messages.ticket_id
       AND (st.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
     )
   );
 
 CREATE POLICY "Users can create ticket_messages" ON public.ticket_messages
   FOR INSERT WITH CHECK (
     EXISTS (
       SELECT 1 FROM public.support_tickets st
       WHERE st.id = ticket_messages.ticket_id
       AND st.user_id = auth.uid()
     )
   );
 
 CREATE POLICY "Admins can manage ticket_messages" ON public.ticket_messages
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can view own zapi_connections" ON public.zapi_connections
   FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can manage own zapi_connections" ON public.zapi_connections
   FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 -- =====================================================
 -- POLÍTICAS RLS - WHATSAPP (APENAS ADMINS E SISTEMA)
 -- =====================================================
 
 CREATE POLICY "Admins can view whatsapp_leads" ON public.whatsapp_leads
   FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can manage whatsapp_leads" ON public.whatsapp_leads
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "System can create whatsapp_leads" ON public.whatsapp_leads
   FOR INSERT WITH CHECK (true);
 
 CREATE POLICY "Admins can view whatsapp_messages" ON public.whatsapp_messages
   FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "System can create whatsapp_messages" ON public.whatsapp_messages
   FOR INSERT WITH CHECK (true);
 
 -- =====================================================
 -- POLÍTICAS RLS - CUSTOMER PRODUCT SCOPED TABLES
 -- =====================================================
 
 CREATE POLICY "Admins can manage crm_message_templates" ON public.crm_message_templates
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can manage crm_webhook_config" ON public.crm_webhook_config
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can manage dashboard_configs" ON public.dashboard_configs
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can view dashboard_data" ON public.dashboard_data
   FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "System can create dashboard_data" ON public.dashboard_data
   FOR INSERT WITH CHECK (true);
 
 CREATE POLICY "Admins can manage financial_agent_config" ON public.financial_agent_config
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can manage loyalty tables" ON public.loyalty_clients
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can manage loyalty_rewards" ON public.loyalty_rewards
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can manage loyalty_transactions" ON public.loyalty_transactions
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can manage loyalty_settings" ON public.loyalty_settings
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can manage loyalty_message_templates" ON public.loyalty_message_templates
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can manage social_posts" ON public.social_posts
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can manage financial_records" ON public.financial_records
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can manage financial_agent tables" ON public.financial_agent_sessions
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can manage financial_agent_chat_logs" ON public.financial_agent_chat_logs
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can manage financial_agent_transactions" ON public.financial_agent_transactions
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can manage financial_agent_invoices" ON public.financial_agent_invoices
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can manage financial_agent_goals" ON public.financial_agent_goals
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 -- =====================================================
 -- POLÍTICAS RLS - CRM AI (USER SCOPED)
 -- =====================================================
 
 CREATE POLICY "Users can manage own crm_ai_config" ON public.crm_ai_config
   FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can manage own crm_ai_pending_actions" ON public.crm_ai_pending_actions
   FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can manage own crm_ai_reports" ON public.crm_ai_reports
   FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can manage own sales_follow_ups" ON public.sales_follow_ups
   FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can manage own sales_meetings" ON public.sales_meetings
   FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can manage own sales_ai_insights" ON public.sales_ai_insights
   FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can manage own rh_entrevistas" ON public.rh_entrevistas
   FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Users can manage own installments" ON public.installments
   FOR SELECT USING (
     EXISTS (
       SELECT 1 FROM public.orders o
       WHERE o.id = installments.order_id
       AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
     )
   );
 
 CREATE POLICY "Anyone can view chat_messages" ON public.chat_messages
   FOR SELECT USING (true);
 
 CREATE POLICY "Anyone can create chat_messages" ON public.chat_messages
   FOR INSERT WITH CHECK (true);
 
 -- =====================================================
 -- PARTE 6: STORAGE BUCKETS E POLÍTICAS
 -- =====================================================
 
 -- Criar bucket para comprovantes de pagamento
 INSERT INTO storage.buckets (id, name, public)
 VALUES ('comprovantes', 'comprovantes', false)
 ON CONFLICT DO NOTHING;
 
 -- Criar bucket para anexos de tickets
 INSERT INTO storage.buckets (id, name, public)
 VALUES ('ticket-attachments', 'ticket-attachments', false)
 ON CONFLICT DO NOTHING;
 
 -- Políticas de storage para comprovantes
 CREATE POLICY "Users can upload own comprovantes"
 ON storage.objects FOR INSERT
 WITH CHECK (
   bucket_id = 'comprovantes' AND
   auth.uid()::text = (storage.foldername(name))[1]
 );
 
 CREATE POLICY "Users can view own comprovantes"
 ON storage.objects FOR SELECT
 USING (
   bucket_id = 'comprovantes' AND
   (
     auth.uid()::text = (storage.foldername(name))[1] OR
     public.has_role(auth.uid(), 'admin')
   )
 );
 
 CREATE POLICY "Admins can delete comprovantes"
 ON storage.objects FOR DELETE
 USING (
   bucket_id = 'comprovantes' AND
   public.has_role(auth.uid(), 'admin')
 );
 
 -- Políticas de storage para ticket-attachments
 CREATE POLICY "Users can upload own ticket attachments"
 ON storage.objects FOR INSERT
 WITH CHECK (
   bucket_id = 'ticket-attachments' AND
   auth.uid()::text = (storage.foldername(name))[1]
 );
 
 CREATE POLICY "Users can view own ticket attachments"
 ON storage.objects FOR SELECT
 USING (
   bucket_id = 'ticket-attachments' AND
   (
     auth.uid()::text = (storage.foldername(name))[1] OR
     public.has_role(auth.uid(), 'admin')
   )
 );
 
 -- =====================================================
 -- PARTE 7: TRIGGERS E AUTOMAÇÕES
 -- =====================================================
 
 -- Trigger para atualizar updated_at automaticamente
 CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS TRIGGER AS $$
 BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
 END;
 $$ LANGUAGE plpgsql;
 
 -- Aplicar trigger em tabelas relevantes
 CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
 
 CREATE TRIGGER update_customer_products_updated_at BEFORE UPDATE ON public.customer_products
   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
 
 CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
 
 -- =====================================================
 -- CONCLUSÃO
 -- =====================================================
 -- Script executado com sucesso!
 -- 
 -- Próximos passos:
 -- 1. Adicionar o primeiro usuário admin manualmente via:
 --    INSERT INTO public.user_roles (user_id, role)
 --    VALUES ('seu-user-id-aqui', 'admin');
 -- 
 -- 2. Configurar as Edge Functions no Supabase
 -- 3. Configurar variáveis de ambiente e secrets
 -- 4. Testar as políticas RLS com diferentes usuários
 -- =====================================================