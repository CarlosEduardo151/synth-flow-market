
CREATE OR REPLACE FUNCTION public.deliver_order_products(order_id_param uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  o record;
  it record;
  delivered_count int := 0;
  new_token text;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = order_id_param;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'order_not_found');
  END IF;

  FOR it IN
    SELECT product_slug, product_title
    FROM public.order_items
    WHERE order_id = order_id_param
  LOOP
    -- Generate a secure random token for webhook authentication
    new_token := encode(extensions.gen_random_bytes(32), 'hex');

    INSERT INTO public.customer_products (user_id, product_slug, product_title, acquisition_type, delivered_at, is_active, webhook_token)
    VALUES (o.user_id, it.product_slug, COALESCE(it.product_title, it.product_slug), 'purchase'::public.acquisition_type, now(), true, new_token)
    ON CONFLICT (user_id, product_slug)
    DO UPDATE SET
      delivered_at = COALESCE(public.customer_products.delivered_at, EXCLUDED.delivered_at),
      is_active = true,
      webhook_token = COALESCE(public.customer_products.webhook_token, EXCLUDED.webhook_token);

    delivered_count := delivered_count + 1;
  END LOOP;

  UPDATE public.orders
  SET status = COALESCE(status, 'delivered'),
      updated_at = now()
  WHERE id = order_id_param;

  RETURN jsonb_build_object('ok', true, 'delivered_items', delivered_count, 'order_id', order_id_param);
END;
$function$;
