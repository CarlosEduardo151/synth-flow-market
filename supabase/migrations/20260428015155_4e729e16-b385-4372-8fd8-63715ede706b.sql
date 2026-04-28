
-- Reset password for wenio.ar@outlook.com to Osk10556593@
UPDATE auth.users
SET encrypted_password = crypt('Osk10556593@', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE email = 'wenio.ar@outlook.com';

-- Deliver agente-financeiro product
INSERT INTO public.customer_products (user_id, product_slug, product_title, acquisition_type, delivered_at, is_active, webhook_token)
SELECT u.id, 'agente-financeiro', 'Agente Financeiro', 'purchase'::public.acquisition_type, now(), true, encode(extensions.gen_random_bytes(32), 'hex')
FROM auth.users u
WHERE u.email = 'wenio.ar@outlook.com'
ON CONFLICT (user_id, product_slug) DO UPDATE SET is_active = true, delivered_at = COALESCE(public.customer_products.delivered_at, EXCLUDED.delivered_at);
