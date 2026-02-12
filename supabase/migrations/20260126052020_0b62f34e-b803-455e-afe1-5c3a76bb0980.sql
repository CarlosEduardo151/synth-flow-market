-- =====================================================
-- ADICIONAR POLÍTICAS DE UPDATE E DELETE FALTANTES
-- =====================================================

-- SUPPORT TICKETS - Permitir usuários atualizarem seus próprios tickets
CREATE POLICY "Users can update own support_tickets" ON public.support_tickets
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all support_tickets" ON public.support_tickets
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own support_tickets" ON public.support_tickets
  FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- TICKET MESSAGES - Permitir usuários atualizarem suas mensagens
CREATE POLICY "Users can update own ticket_messages" ON public.ticket_messages
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all ticket_messages" ON public.ticket_messages
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- AI CONTROL CONFIG - Permitir INSERT para usuários
CREATE POLICY "Users can insert own ai_control_config" ON public.ai_control_config
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai_control_config" ON public.ai_control_config
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own ai_control_config" ON public.ai_control_config
  FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- BOT HFT CONFIGS - Permitir INSERT para usuários  
CREATE POLICY "Users can insert own bot_hft_configs" ON public.bot_hft_configs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bot_hft_configs" ON public.bot_hft_configs
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own bot_hft_configs" ON public.bot_hft_configs
  FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ORDERS - Permitir UPDATE apenas para admins (segurança)
CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- CRM AI CONFIG - Permitir INSERT para usuários
CREATE POLICY "Users can insert own crm_ai_config" ON public.crm_ai_config
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crm_ai_config" ON public.crm_ai_config
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own crm_ai_config" ON public.crm_ai_config
  FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- SALES, RH, CRM - Permitir INSERT/UPDATE/DELETE para os dados do usuário
CREATE POLICY "Users can insert own sales_leads" ON public.sales_leads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sales_leads" ON public.sales_leads
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own sales_leads" ON public.sales_leads
  FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own rh_vagas" ON public.rh_vagas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rh_vagas" ON public.rh_vagas
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own rh_vagas" ON public.rh_vagas
  FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own rh_candidatos" ON public.rh_candidatos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rh_candidatos" ON public.rh_candidatos
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own rh_candidatos" ON public.rh_candidatos
  FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own rh_entrevistas" ON public.rh_entrevistas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rh_entrevistas" ON public.rh_entrevistas
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own rh_entrevistas" ON public.rh_entrevistas
  FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));