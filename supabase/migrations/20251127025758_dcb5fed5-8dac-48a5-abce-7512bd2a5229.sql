-- ========================================
-- CORREÇÃO DE VULNERABILIDADES RLS - V2
-- Corrigindo políticas existentes
-- ========================================

-- 1. Corrigir chat_messages (CRÍTICO)
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can read their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Admins can insert chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can read their messages" ON public.chat_messages;

CREATE POLICY "Admins can insert chat messages"
ON public.chat_messages FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read their messages"
ON public.chat_messages FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR
  gmail = (auth.jwt() ->> 'email')
);

-- 2. Corrigir mp_orders (ALTO)
DROP POLICY IF EXISTS "Allow all operations on mp_orders" ON public.mp_orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.mp_orders;
DROP POLICY IF EXISTS "Users can view their orders by email" ON public.mp_orders;
DROP POLICY IF EXISTS "System can create orders" ON public.mp_orders;

CREATE POLICY "Admins can manage all orders"
ON public.mp_orders FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their orders by email"
ON public.mp_orders FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR
  customer_email = (auth.jwt() ->> 'email')
);

CREATE POLICY "System can create orders"
ON public.mp_orders FOR INSERT
WITH CHECK (true);

-- 3. Corrigir mp_order_items (ALTO)
DROP POLICY IF EXISTS "Allow all operations on mp_order_items" ON public.mp_order_items;
DROP POLICY IF EXISTS "Admins can manage all order items" ON public.mp_order_items;
DROP POLICY IF EXISTS "Users can view their order items" ON public.mp_order_items;
DROP POLICY IF EXISTS "System can create order items" ON public.mp_order_items;

CREATE POLICY "Admins can manage all order items"
ON public.mp_order_items FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their order items"
ON public.mp_order_items FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.mp_orders
    WHERE mp_orders.id = mp_order_items.order_id
    AND mp_orders.customer_email = (auth.jwt() ->> 'email')
  )
);

CREATE POLICY "System can create order items"
ON public.mp_order_items FOR INSERT
WITH CHECK (true);

-- 4. Corrigir mp_payments (ALTO)
DROP POLICY IF EXISTS "Allow all operations on mp_payments" ON public.mp_payments;
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.mp_payments;
DROP POLICY IF EXISTS "Users can view their payments" ON public.mp_payments;
DROP POLICY IF EXISTS "System can create payments" ON public.mp_payments;
DROP POLICY IF EXISTS "System can update payments" ON public.mp_payments;

CREATE POLICY "Admins can manage all payments"
ON public.mp_payments FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their payments"
ON public.mp_payments FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR
  payer_email = (auth.jwt() ->> 'email')
);

CREATE POLICY "System can create payments"
ON public.mp_payments FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update payments"
ON public.mp_payments FOR UPDATE
USING (true);

-- 5. Corrigir mp_products (MÉDIO)
DROP POLICY IF EXISTS "Allow all operations on mp_products" ON public.mp_products;
DROP POLICY IF EXISTS "Everyone can view products" ON public.mp_products;
DROP POLICY IF EXISTS "Only admins can manage products" ON public.mp_products;

CREATE POLICY "Everyone can view products"
ON public.mp_products FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage products"
ON public.mp_products FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 6. Corrigir mp_logs (MÉDIO)
DROP POLICY IF EXISTS "Allow all operations on mp_logs" ON public.mp_logs;
DROP POLICY IF EXISTS "Only admins can view logs" ON public.mp_logs;
DROP POLICY IF EXISTS "System can create logs" ON public.mp_logs;

CREATE POLICY "Only admins can view logs"
ON public.mp_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can create logs"
ON public.mp_logs FOR INSERT
WITH CHECK (true);

-- 7. Corrigir zapi_connections (CRÍTICO)
DROP POLICY IF EXISTS "Users can insert their own connection" ON public.zapi_connections;
DROP POLICY IF EXISTS "Users can update their own connection" ON public.zapi_connections;
DROP POLICY IF EXISTS "Users can view their own connection" ON public.zapi_connections;
DROP POLICY IF EXISTS "Users can delete their own connection" ON public.zapi_connections;
DROP POLICY IF EXISTS "Users can manage their own connections" ON public.zapi_connections;

CREATE POLICY "Users can manage their own connections"
ON public.zapi_connections FOR ALL
USING (auth.uid() = user_id);

-- 8. Corrigir whatsapp_leads (MÉDIO)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.whatsapp_leads;
DROP POLICY IF EXISTS "Only admins can manage leads" ON public.whatsapp_leads;
DROP POLICY IF EXISTS "System can create leads" ON public.whatsapp_leads;

CREATE POLICY "Only admins can manage leads"
ON public.whatsapp_leads FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can create leads"
ON public.whatsapp_leads FOR INSERT
WITH CHECK (true);

-- 9. Corrigir whatsapp_messages (MÉDIO)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Only admins can manage messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "System can create messages" ON public.whatsapp_messages;

CREATE POLICY "Only admins can manage messages"
ON public.whatsapp_messages FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can create messages"
ON public.whatsapp_messages FOR INSERT
WITH CHECK (true);