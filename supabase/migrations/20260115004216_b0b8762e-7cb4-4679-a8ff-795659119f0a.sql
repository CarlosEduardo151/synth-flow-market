
-- =============================================
-- CORRIGIR RLS POLICIES COM VERIFICAÇÃO DE OWNERSHIP
-- =============================================

-- 1. dashboard_configs - verificar via customer_products
DROP POLICY IF EXISTS "Users can manage own dashboard_configs" ON public.dashboard_configs;

CREATE POLICY "Users can manage own dashboard_configs" ON public.dashboard_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customer_products cp
      WHERE cp.id = dashboard_configs.customer_product_id
      AND cp.user_id = auth.uid()
    )
  );

-- 2. dashboard_data - verificar via dashboard_configs -> customer_products
DROP POLICY IF EXISTS "Users can manage own dashboard_data" ON public.dashboard_data;

CREATE POLICY "Users can manage own dashboard_data" ON public.dashboard_data
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.dashboard_configs dc
      JOIN public.customer_products cp ON cp.id = dc.customer_product_id
      WHERE dc.id = dashboard_data.dashboard_config_id
      AND cp.user_id = auth.uid()
    )
  );

-- 3. crm_message_templates - verificar via customer_products
DROP POLICY IF EXISTS "Users can manage own crm_message_templates" ON public.crm_message_templates;

CREATE POLICY "Users can manage own crm_message_templates" ON public.crm_message_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customer_products cp
      WHERE cp.id = crm_message_templates.customer_product_id
      AND cp.user_id = auth.uid()
    )
  );

-- 4. crm_webhook_config - verificar via customer_products
DROP POLICY IF EXISTS "Users can manage own crm_webhook_config" ON public.crm_webhook_config;

CREATE POLICY "Users can manage own crm_webhook_config" ON public.crm_webhook_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customer_products cp
      WHERE cp.id = crm_webhook_config.customer_product_id
      AND cp.user_id = auth.uid()
    )
  );

-- 5. loyalty_settings - verificar via customer_products
DROP POLICY IF EXISTS "Users can manage own loyalty_settings" ON public.loyalty_settings;

CREATE POLICY "Users can manage own loyalty_settings" ON public.loyalty_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customer_products cp
      WHERE cp.id = loyalty_settings.customer_product_id
      AND cp.user_id = auth.uid()
    )
  );

-- 6. loyalty_message_templates - verificar via customer_products
DROP POLICY IF EXISTS "Users can manage own loyalty_message_templates" ON public.loyalty_message_templates;

CREATE POLICY "Users can manage own loyalty_message_templates" ON public.loyalty_message_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customer_products cp
      WHERE cp.id = loyalty_message_templates.customer_product_id
      AND cp.user_id = auth.uid()
    )
  );

-- =============================================
-- FUNÇÃO PARA ENTREGAR PRODUTOS APÓS PAGAMENTO
-- =============================================

CREATE OR REPLACE FUNCTION public.deliver_order_products(order_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_record RECORD;
  item_record RECORD;
  delivered_count INTEGER := 0;
  result_products JSONB := '[]'::JSONB;
BEGIN
  -- Buscar o pedido
  SELECT * INTO order_record FROM orders WHERE id = order_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado');
  END IF;
  
  -- Verificar se pedido está aprovado
  IF order_record.status NOT IN ('approved', 'paid', 'completed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido ainda não foi pago');
  END IF;
  
  -- Entregar cada item do pedido
  FOR item_record IN 
    SELECT * FROM order_items WHERE order_id = order_id_param
  LOOP
    -- Verificar se já foi entregue
    IF NOT EXISTS (
      SELECT 1 FROM customer_products 
      WHERE user_id = order_record.user_id 
      AND product_slug = item_record.product_slug
      AND is_active = true
    ) THEN
      -- Inserir o produto para o cliente
      INSERT INTO customer_products (
        user_id,
        product_slug,
        product_title,
        acquisition_type,
        is_active,
        delivered_at,
        webhook_token
      ) VALUES (
        order_record.user_id,
        item_record.product_slug,
        COALESCE(item_record.product_title, item_record.product_name, item_record.product_slug),
        'purchase',
        true,
        now(),
        encode(gen_random_bytes(32), 'hex')
      );
      
      delivered_count := delivered_count + 1;
      result_products := result_products || jsonb_build_object(
        'slug', item_record.product_slug,
        'title', item_record.product_title
      );
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'delivered_count', delivered_count,
    'products', result_products
  );
END;
$$;

-- =============================================
-- TRIGGER PARA ENTREGAR AUTOMATICAMENTE
-- =============================================

CREATE OR REPLACE FUNCTION public.on_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Quando status muda para aprovado/pago, entrega os produtos
  IF NEW.status IN ('approved', 'paid', 'completed') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('approved', 'paid', 'completed')) THEN
    PERFORM public.deliver_order_products(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_order_status_change ON public.orders;
CREATE TRIGGER trigger_order_status_change
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.on_order_status_change();

-- =============================================
-- ADICIONAR POLICY DE DELETE EM customer_products PARA ADMINS
-- =============================================

CREATE POLICY "Admins can manage all customer_products" ON public.customer_products
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
