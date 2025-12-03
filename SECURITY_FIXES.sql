-- 🔒 CORREÇÕES DE SEGURANÇA - StarAI
-- Execute este script no Supabase SQL Editor para corrigir políticas RLS permissivas
-- Data: 2025-11-26

-- ============================================================================
-- 1. CORRIGIR POLICIES DE chat_messages
-- ============================================================================

-- Remover policy permissiva existente
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON chat_messages;

-- Nova policy: Apenas usuários autenticados podem inserir mensagens com seu próprio email
CREATE POLICY "Authenticated users can insert own messages"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (gmail = (auth.jwt() ->> 'email'));

-- Policy para visualização: Usuários veem suas mensagens ou admins veem tudo
DROP POLICY IF EXISTS "Users can read their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can read all messages" ON chat_messages;

CREATE POLICY "Users can view their own messages"
ON chat_messages FOR SELECT
TO authenticated
USING (gmail = (auth.jwt() ->> 'email') OR public.has_role(auth.uid(), 'admin'));


-- ============================================================================
-- 2. CORRIGIR POLICIES DE mp_orders
-- ============================================================================

-- Remover policy totalmente permissiva
DROP POLICY IF EXISTS "Allow all operations on mp_orders" ON mp_orders;

-- Usuários autenticados podem visualizar apenas seus próprios pedidos
CREATE POLICY "Users can view their own orders"
ON mp_orders FOR SELECT
TO authenticated
USING (customer_email = (auth.jwt() ->> 'email') OR public.has_role(auth.uid(), 'admin'));

-- Apenas sistema pode criar pedidos (via edge function com service role)
CREATE POLICY "Service role can create orders"
ON mp_orders FOR INSERT
TO service_role
WITH CHECK (true);

-- Apenas admins podem atualizar pedidos
CREATE POLICY "Admins can update orders"
ON mp_orders FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Apenas admins podem deletar pedidos
CREATE POLICY "Admins can delete orders"
ON mp_orders FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));


-- ============================================================================
-- 3. CORRIGIR POLICIES DE mp_order_items
-- ============================================================================

DROP POLICY IF EXISTS "Allow all operations on mp_order_items" ON mp_order_items;

-- Usuários podem ver itens dos seus pedidos
CREATE POLICY "Users can view their order items"
ON mp_order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM mp_orders
    WHERE mp_orders.id = mp_order_items.order_id
    AND (mp_orders.customer_email = (auth.jwt() ->> 'email') OR public.has_role(auth.uid(), 'admin'))
  )
);

-- Apenas sistema pode inserir itens de pedido
CREATE POLICY "Service role can create order items"
ON mp_order_items FOR INSERT
TO service_role
WITH CHECK (true);


-- ============================================================================
-- 4. CORRIGIR POLICIES DE mp_payments
-- ============================================================================

DROP POLICY IF EXISTS "Allow all operations on mp_payments" ON mp_payments;

-- Usuários podem ver seus próprios pagamentos
CREATE POLICY "Users can view their payments"
ON mp_payments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM mp_orders
    WHERE mp_orders.id = mp_payments.order_id
    AND (mp_orders.customer_email = (auth.jwt() ->> 'email') OR public.has_role(auth.uid(), 'admin'))
  )
);

-- Apenas sistema pode criar e atualizar pagamentos
CREATE POLICY "Service role can manage payments"
ON mp_payments FOR ALL
TO service_role
USING (true)
WITH CHECK (true);


-- ============================================================================
-- 5. CORRIGIR POLICIES DE mp_products
-- ============================================================================

DROP POLICY IF EXISTS "Allow all operations on mp_products" ON mp_products;

-- Todos podem visualizar produtos (catálogo público)
CREATE POLICY "Anyone can view products"
ON mp_products FOR SELECT
TO anon, authenticated
USING (in_stock = true);

-- Apenas admins podem gerenciar produtos
CREATE POLICY "Admins can manage products"
ON mp_products FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- ============================================================================
-- 6. CORRIGIR POLICIES DE mp_logs
-- ============================================================================

DROP POLICY IF EXISTS "Allow all operations on mp_logs" ON mp_logs;

-- Apenas sistema pode criar logs
CREATE POLICY "Service role can create logs"
ON mp_logs FOR INSERT
TO service_role
WITH CHECK (true);

-- Apenas admins podem visualizar logs
CREATE POLICY "Admins can view logs"
ON mp_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));


-- ============================================================================
-- 7. ADICIONAR POLICIES FALTANTES EM zapi_connections
-- ============================================================================

-- Verificar se RLS está habilitado
ALTER TABLE zapi_connections ENABLE ROW LEVEL SECURITY;

-- Usuários podem gerenciar apenas suas próprias conexões
CREATE POLICY "Users can manage their own Z-API connections"
ON zapi_connections FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins podem visualizar todas as conexões
CREATE POLICY "Admins can view all Z-API connections"
ON zapi_connections FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));


-- ============================================================================
-- 8. CORRIGIR whatsapp_leads (Não criar leads sem autenticação)
-- ============================================================================

-- Remover policies muito permissivas se existirem
DROP POLICY IF EXISTS "Anyone can insert leads" ON whatsapp_leads;

-- Apenas sistema pode criar leads (via webhook)
CREATE POLICY "Service role can create leads"
ON whatsapp_leads FOR INSERT
TO service_role
WITH CHECK (true);

-- Admins podem visualizar e gerenciar leads
CREATE POLICY "Admins can manage leads"
ON whatsapp_leads FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- ============================================================================
-- 9. CORRIGIR whatsapp_messages
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can insert messages" ON whatsapp_messages;

-- Apenas sistema pode criar mensagens (via webhook ou edge function)
CREATE POLICY "Service role can create messages"
ON whatsapp_messages FOR INSERT
TO service_role
WITH CHECK (true);

-- Admins podem visualizar mensagens
CREATE POLICY "Admins can view messages"
ON whatsapp_messages FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));


-- ============================================================================
-- 10. SEGURANÇA ADICIONAL: Função para validar email ownership
-- ============================================================================

-- Função auxiliar para verificar se email pertence ao usuário autenticado
CREATE OR REPLACE FUNCTION public.is_user_email(email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email = (auth.jwt() ->> 'email')
$$;


-- ============================================================================
-- 11. ATUALIZAR LEAKED PASSWORD PROTECTION (Requer ação no Dashboard)
-- ============================================================================

-- NOTA: Esta configuração deve ser feita no Supabase Dashboard:
-- 1. Vá para Authentication > Policies
-- 2. Habilite "Leaked Password Protection"
-- 3. Configure o nível mínimo de segurança de senha

-- Documentação: https://supabase.com/docs/guides/auth/password-security


-- ============================================================================
-- 12. VERIFICAÇÕES FINAIS
-- ============================================================================

-- Listar todas as policies criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'chat_messages',
  'mp_orders',
  'mp_order_items', 
  'mp_payments',
  'mp_products',
  'mp_logs',
  'zapi_connections',
  'whatsapp_leads',
  'whatsapp_messages'
)
ORDER BY tablename, policyname;


-- ============================================================================
-- COMO EXECUTAR ESTE SCRIPT
-- ============================================================================

-- 1. Faça backup do banco de dados antes:
--    Supabase Dashboard > Database > Backups

-- 2. Execute este script no SQL Editor:
--    Supabase Dashboard > SQL Editor > New Query

-- 3. Teste as policies:
--    Use o checklist em SECURITY_CHECKLIST.md

-- 4. Monitore os logs por erros:
--    Supabase Dashboard > Logs

-- ============================================================================

-- Mensagem de conclusão
DO $$
BEGIN
  RAISE NOTICE '✅ Policies de segurança atualizadas com sucesso!';
  RAISE NOTICE '📋 Próximos passos:';
  RAISE NOTICE '   1. Testar autenticação e autorização';
  RAISE NOTICE '   2. Verificar que usuários normais não veem dados de outros';
  RAISE NOTICE '   3. Confirmar que admins têm acesso total';
  RAISE NOTICE '   4. Habilitar Leaked Password Protection no Dashboard';
  RAISE NOTICE '   5. Atualizar versão do Postgres quando disponível';
END $$;
