-- Corrigir função deliver_order_products: substituir gen_random_bytes por md5(random())
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
      -- Inserir o produto para o cliente (usando md5 em vez de gen_random_bytes)
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
        md5(random()::text || clock_timestamp()::text)
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