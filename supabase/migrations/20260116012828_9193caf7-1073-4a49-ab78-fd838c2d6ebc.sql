
-- CORREÇÃO DEFINITIVA: Converter políticas RESTRICTIVE para PERMISSIVE
-- O problema é que políticas RESTRICTIVE não funcionam sozinhas - elas precisam de políticas PERMISSIVE

-- =============================================
-- TABELA: orders
-- =============================================
DROP POLICY IF EXISTS "Admins can update all orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;

-- Criar políticas PERMISSIVE (padrão)
CREATE POLICY "Admins can view all orders" ON orders
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all orders" ON orders
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders" ON orders
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- TABELA: customer_products
-- =============================================
DROP POLICY IF EXISTS "Admins can manage all customer_products" ON customer_products;
DROP POLICY IF EXISTS "Admins can view all customer_products" ON customer_products;
DROP POLICY IF EXISTS "Users can insert own products" ON customer_products;
DROP POLICY IF EXISTS "Users can update own products" ON customer_products;
DROP POLICY IF EXISTS "Users can view own products" ON customer_products;

-- Criar políticas PERMISSIVE
CREATE POLICY "Admins can manage all customer_products" ON customer_products
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own products" ON customer_products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own products" ON customer_products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products" ON customer_products
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- TABELA: order_items
-- =============================================
DROP POLICY IF EXISTS "Users can insert own order_items" ON order_items;
DROP POLICY IF EXISTS "Users can view own order_items" ON order_items;
DROP POLICY IF EXISTS "Admins can view all order_items" ON order_items;
DROP POLICY IF EXISTS "Admins can manage order_items" ON order_items;

-- Criar políticas PERMISSIVE
CREATE POLICY "Admins can manage order_items" ON order_items
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own order_items" ON order_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own order_items" ON order_items
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
  ));

-- =============================================
-- TABELA: installments
-- =============================================
DROP POLICY IF EXISTS "Users can insert own installments" ON installments;
DROP POLICY IF EXISTS "Users can view own installments" ON installments;
DROP POLICY IF EXISTS "Admins can manage installments" ON installments;

-- Criar políticas PERMISSIVE
CREATE POLICY "Admins can manage installments" ON installments
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own installments" ON installments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM orders WHERE orders.id = installments.order_id AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own installments" ON installments
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM orders WHERE orders.id = installments.order_id AND orders.user_id = auth.uid()
  ));
