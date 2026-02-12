-- =====================================================
-- POLÍTICAS FINAIS PARA SALES, CUSTOMER_PRODUCTS E OUTROS
-- =====================================================

-- SALES PIPELINE - Permitir INSERT/UPDATE/DELETE
CREATE POLICY "Users can insert own sales_pipeline" ON public.sales_pipeline
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sales_pipeline" ON public.sales_pipeline
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own sales_pipeline" ON public.sales_pipeline
  FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- SALES FOLLOW UPS
CREATE POLICY "Users can insert own sales_follow_ups" ON public.sales_follow_ups
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sales_follow_ups" ON public.sales_follow_ups
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own sales_follow_ups" ON public.sales_follow_ups
  FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- SALES MEETINGS
CREATE POLICY "Users can insert own sales_meetings" ON public.sales_meetings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sales_meetings" ON public.sales_meetings
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own sales_meetings" ON public.sales_meetings
  FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- SALES AI INSIGHTS
CREATE POLICY "Users can insert own sales_ai_insights" ON public.sales_ai_insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sales_ai_insights" ON public.sales_ai_insights
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own sales_ai_insights" ON public.sales_ai_insights
  FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- CUSTOMER PRODUCTS - Permitir INSERT/UPDATE/DELETE
CREATE POLICY "Users can insert own customer_products" ON public.customer_products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customer_products" ON public.customer_products
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own customer_products" ON public.customer_products
  FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- PRODUCT CREDENTIALS
CREATE POLICY "Users can insert own product_credentials" ON public.product_credentials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own product_credentials" ON public.product_credentials
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own product_credentials" ON public.product_credentials
  FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- PRODUCT RENTALS
CREATE POLICY "Users can insert own product_rentals" ON public.product_rentals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own product_rentals" ON public.product_rentals
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own product_rentals" ON public.product_rentals
  FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- PRODUCT REVIEWS
CREATE POLICY "Users can update own product_reviews" ON public.product_reviews
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own product_reviews" ON public.product_reviews
  FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- FREE TRIALS
CREATE POLICY "Users can insert own free_trials" ON public.free_trials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own free_trials" ON public.free_trials
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own free_trials" ON public.free_trials
  FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- TUTORIAL COMPLETIONS
CREATE POLICY "Users can insert own tutorial_completions" ON public.tutorial_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tutorial_completions" ON public.tutorial_completions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tutorial_completions" ON public.tutorial_completions
  FOR DELETE USING (auth.uid() = user_id);

-- CRM OPPORTUNITIES
CREATE POLICY "Users can insert own crm_opportunities" ON public.crm_opportunities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crm_opportunities" ON public.crm_opportunities
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own crm_opportunities" ON public.crm_opportunities
  FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- CRM AI PENDING ACTIONS
CREATE POLICY "Users can insert own crm_ai_pending_actions" ON public.crm_ai_pending_actions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crm_ai_pending_actions" ON public.crm_ai_pending_actions
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own crm_ai_pending_actions" ON public.crm_ai_pending_actions
  FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- CRM AI REPORTS
CREATE POLICY "Users can insert own crm_ai_reports" ON public.crm_ai_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crm_ai_reports" ON public.crm_ai_reports
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own crm_ai_reports" ON public.crm_ai_reports
  FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ZAPI CONNECTIONS
CREATE POLICY "Users can insert own zapi_connections" ON public.zapi_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own zapi_connections" ON public.zapi_connections
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own zapi_connections" ON public.zapi_connections
  FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));