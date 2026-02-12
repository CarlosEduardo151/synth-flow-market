-- =====================================================
-- CORRIGIR POLÍTICAS RLS FALTANTES PARA ORDER_ITEMS E INSTALLMENTS
-- =====================================================

-- Permitir usuários inserirem itens em seus próprios pedidos
CREATE POLICY "Users can insert own order_items" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND o.user_id = auth.uid()
    )
  );

-- Permitir admins gerenciarem todos os itens
CREATE POLICY "Admins can manage all order_items" ON public.order_items
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Permitir usuários inserirem parcelas em seus próprios pedidos
CREATE POLICY "Users can insert own installments" ON public.installments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = installments.order_id
      AND o.user_id = auth.uid()
    )
  );

-- Permitir admins gerenciarem todas as parcelas
CREATE POLICY "Admins can manage all installments" ON public.installments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Permitir usuários criarem seus próprios profiles
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Permitir admins gerenciarem profiles
CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));