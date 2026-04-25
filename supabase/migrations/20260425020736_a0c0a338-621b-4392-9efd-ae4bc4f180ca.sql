-- Remove eventuais duplicados antes de criar a constraint
DELETE FROM public.product_credentials a
USING public.product_credentials b
WHERE a.ctid < b.ctid
  AND a.user_id = b.user_id
  AND a.product_slug = b.product_slug
  AND a.credential_key = b.credential_key;

ALTER TABLE public.product_credentials
  ADD CONSTRAINT product_credentials_user_product_key_unique
  UNIQUE (user_id, product_slug, credential_key);