-- Inserir customer_products para pedidos completados que não têm produtos entregues
INSERT INTO customer_products (user_id, order_id, product_slug, product_title, acquisition_type, is_active, download_count, max_downloads)
SELECT 
  o.user_id,
  oi.order_id,
  oi.product_slug,
  oi.product_title,
  'purchase'::acquisition_type,
  true,
  0,
  3
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM customer_products cp 
    WHERE cp.order_id = oi.order_id 
    AND cp.product_slug = oi.product_slug
  )