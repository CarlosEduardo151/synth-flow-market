-- Criar função para entregar produtos de um pedido
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
    RETURN jsonb_build_object('success', false, 'error', 'Pedido ainda não foi aprovado/pago');
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
        'title', COALESCE(item_record.product_title, item_record.product_name)
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

-- Criar função de trigger para entrega automática
CREATE OR REPLACE FUNCTION public.on_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Quando status muda para aprovado/pago/completed, entrega os produtos
  IF NEW.status IN ('approved', 'paid', 'completed') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('approved', 'paid', 'completed')) THEN
    PERFORM public.deliver_order_products(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS trigger_order_status_change ON public.orders;
CREATE TRIGGER trigger_order_status_change
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.on_order_status_change();

-- Criar função para atualizar trials expirados (usada em outros lugares)
CREATE OR REPLACE FUNCTION public.update_expired_trials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE free_trials
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < now();
END;
$$;