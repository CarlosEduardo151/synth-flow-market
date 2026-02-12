
-- =============================================
-- CORRIGIR TODAS AS POLICIES COM USING (true) RESTANTES
-- =============================================

-- financial_agent_chat_logs
DROP POLICY IF EXISTS "Users can manage own financial_agent_chat_logs" ON public.financial_agent_chat_logs;
CREATE POLICY "Users can manage own financial_agent_chat_logs" ON public.financial_agent_chat_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customer_products cp
      WHERE cp.id = financial_agent_chat_logs.customer_product_id
      AND cp.user_id = auth.uid()
    )
  );

-- financial_agent_config
DROP POLICY IF EXISTS "Users can manage own financial_agent_config" ON public.financial_agent_config;
CREATE POLICY "Users can manage own financial_agent_config" ON public.financial_agent_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customer_products cp
      WHERE cp.id = financial_agent_config.customer_product_id
      AND cp.user_id = auth.uid()
    )
  );

-- financial_agent_goals
DROP POLICY IF EXISTS "Users can manage own financial_agent_goals" ON public.financial_agent_goals;
CREATE POLICY "Users can manage own financial_agent_goals" ON public.financial_agent_goals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customer_products cp
      WHERE cp.id = financial_agent_goals.customer_product_id
      AND cp.user_id = auth.uid()
    )
  );

-- financial_agent_invoices
DROP POLICY IF EXISTS "Users can manage own financial_agent_invoices" ON public.financial_agent_invoices;
CREATE POLICY "Users can manage own financial_agent_invoices" ON public.financial_agent_invoices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customer_products cp
      WHERE cp.id = financial_agent_invoices.customer_product_id
      AND cp.user_id = auth.uid()
    )
  );

-- financial_agent_sessions
DROP POLICY IF EXISTS "Users can manage own financial_agent_sessions" ON public.financial_agent_sessions;
CREATE POLICY "Users can manage own financial_agent_sessions" ON public.financial_agent_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customer_products cp
      WHERE cp.id = financial_agent_sessions.customer_product_id
      AND cp.user_id = auth.uid()
    )
  );

-- financial_agent_transactions
DROP POLICY IF EXISTS "Users can manage own financial_agent_transactions" ON public.financial_agent_transactions;
CREATE POLICY "Users can manage own financial_agent_transactions" ON public.financial_agent_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customer_products cp
      WHERE cp.id = financial_agent_transactions.customer_product_id
      AND cp.user_id = auth.uid()
    )
  );

-- financial_records
DROP POLICY IF EXISTS "Users can manage own financial_records" ON public.financial_records;
CREATE POLICY "Users can manage own financial_records" ON public.financial_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customer_products cp
      WHERE cp.id = financial_records.customer_product_id
      AND cp.user_id = auth.uid()
    )
  );

-- loyalty_clients
DROP POLICY IF EXISTS "Users can manage own loyalty_clients" ON public.loyalty_clients;
CREATE POLICY "Users can manage own loyalty_clients" ON public.loyalty_clients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customer_products cp
      WHERE cp.id = loyalty_clients.customer_product_id
      AND cp.user_id = auth.uid()
    )
  );

-- loyalty_rewards
DROP POLICY IF EXISTS "Users can manage own loyalty_rewards" ON public.loyalty_rewards;
CREATE POLICY "Users can manage own loyalty_rewards" ON public.loyalty_rewards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customer_products cp
      WHERE cp.id = loyalty_rewards.customer_product_id
      AND cp.user_id = auth.uid()
    )
  );

-- loyalty_transactions
DROP POLICY IF EXISTS "Users can manage own loyalty_transactions" ON public.loyalty_transactions;
CREATE POLICY "Users can manage own loyalty_transactions" ON public.loyalty_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customer_products cp
      WHERE cp.id = loyalty_transactions.customer_product_id
      AND cp.user_id = auth.uid()
    )
  );

-- social_posts
DROP POLICY IF EXISTS "Users can manage own social_posts" ON public.social_posts;
CREATE POLICY "Users can manage own social_posts" ON public.social_posts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customer_products cp
      WHERE cp.id = social_posts.customer_product_id
      AND cp.user_id = auth.uid()
    )
  );
