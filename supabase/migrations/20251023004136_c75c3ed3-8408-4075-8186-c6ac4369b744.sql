-- Criar cupom INAUGURACAO20 com 20% de desconto
INSERT INTO public.coupons (
  code,
  type,
  value,
  min_order_amount,
  max_uses,
  is_active,
  valid_from
) VALUES (
  'INAUGURACAO20',
  'percentage',
  20,
  NULL,
  NULL,
  true,
  NOW()
);