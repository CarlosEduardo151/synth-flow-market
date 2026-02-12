-- =====================================================
-- PARTE 4: HABILITAR RLS E CRIAR POLÍTICAS DE SEGURANÇA
-- =====================================================

-- Habilitar RLS em TODAS as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_crm_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_control_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_hft_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.box_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.box_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_agent_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_agent_chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_agent_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_agent_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_agent_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_ai_pending_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_ai_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_webhook_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_required_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutorial_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_message_templates ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.whatsapp_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zapi_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ========== POLÍTICAS RLS - PROFILES ==========

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ========== POLÍTICAS RLS - ADMIN TABLES (APENAS ADMINS) ==========

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

-- ========== POLÍTICAS RLS - USER DATA (OWNER OR ADMIN) ==========

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

CREATE POLICY "Users can view own installments" ON public.installments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = installments.order_id
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

CREATE POLICY "Users can view own sales_follow_ups" ON public.sales_follow_ups
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage own sales_follow_ups" ON public.sales_follow_ups
  FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own sales_meetings" ON public.sales_meetings
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage own sales_meetings" ON public.sales_meetings
  FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own sales_ai_insights" ON public.sales_ai_insights
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage own sales_ai_insights" ON public.sales_ai_insights
  FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own rh_vagas" ON public.rh_vagas
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage own rh_vagas" ON public.rh_vagas
  FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own rh_candidatos" ON public.rh_candidatos
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage own rh_candidatos" ON public.rh_candidatos
  FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own rh_entrevistas" ON public.rh_entrevistas
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage own rh_entrevistas" ON public.rh_entrevistas
  FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own support_tickets" ON public.support_tickets
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage own support_tickets" ON public.support_tickets
  FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own ticket_messages" ON public.ticket_messages
  FOR SELECT USING (
    auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_messages.ticket_id
      AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create ticket_messages" ON public.ticket_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own zapi_connections" ON public.zapi_connections
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage own zapi_connections" ON public.zapi_connections
  FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own crm_ai_config" ON public.crm_ai_config
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage own crm_ai_config" ON public.crm_ai_config
  FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own crm_ai_pending_actions" ON public.crm_ai_pending_actions
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage own crm_ai_pending_actions" ON public.crm_ai_pending_actions
  FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own crm_ai_reports" ON public.crm_ai_reports
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage own crm_ai_reports" ON public.crm_ai_reports
  FOR ALL USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ========== POLÍTICAS RLS - TABELAS BASEADAS EM CUSTOMER_PRODUCT_ID ==========

-- Estas tabelas não têm user_id, então os acessos são gerenciados via webhooks/edge functions
-- Por segurança, permitimos apenas admins terem acesso direto

CREATE POLICY "Admins can manage financial_records" ON public.financial_records
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage financial_agent_config" ON public.financial_agent_config
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage financial_agent_sessions" ON public.financial_agent_sessions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage financial_agent_chat_logs" ON public.financial_agent_chat_logs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage financial_agent_transactions" ON public.financial_agent_transactions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage financial_agent_invoices" ON public.financial_agent_invoices
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage financial_agent_goals" ON public.financial_agent_goals
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage crm_message_templates" ON public.crm_message_templates
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage crm_webhook_config" ON public.crm_webhook_config
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage dashboard_configs" ON public.dashboard_configs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage dashboard_data" ON public.dashboard_data
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage loyalty_clients" ON public.loyalty_clients
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

CREATE POLICY "Admins can manage whatsapp_leads" ON public.whatsapp_leads
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage whatsapp_messages" ON public.whatsapp_messages
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage chat_messages" ON public.chat_messages
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));