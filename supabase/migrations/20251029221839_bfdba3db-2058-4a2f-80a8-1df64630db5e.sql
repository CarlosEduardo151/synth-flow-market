-- Deletar compras duplicadas de dashboards-personalizados, mantendo apenas a mais recente
DELETE FROM public.customer_products 
WHERE product_slug = 'dashboards-personalizados' 
AND user_id = '6e90e4fc-a56e-475e-a404-bcc0ba00d1be'
AND id IN (
  'eae36a09-66ef-4f6c-901d-57f1066c4984',
  '2be008a1-9f73-4b4d-829d-a97ec0b815be',
  'fd5874fd-4fee-4478-bb89-00032fdb7a0b'
);