UPDATE public.customer_products 
SET webhook_token = gen_random_uuid()::text, updated_at = now()
WHERE id = '0a188649-4392-4d22-a908-c76018baa59b' 
AND webhook_token IS NULL;