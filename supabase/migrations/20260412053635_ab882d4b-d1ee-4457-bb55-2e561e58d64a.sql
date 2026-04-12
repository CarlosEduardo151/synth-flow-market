INSERT INTO public.customer_products (user_id, product_slug, product_title, acquisition_type, delivered_at, is_active, webhook_token)
VALUES (
  '17d6d10c-548e-4534-ad77-59b1a9c6b733',
  'micro-business-suite',
  'Micro-Business Suite',
  'purchase',
  now(),
  true,
  encode(extensions.gen_random_bytes(32), 'hex')
)
ON CONFLICT (user_id, product_slug)
DO UPDATE SET is_active = true, delivered_at = COALESCE(customer_products.delivered_at, now());