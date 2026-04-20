
ALTER TABLE public.financial_das_guides
  ADD COLUMN IF NOT EXISTS user_id UUID;

UPDATE public.financial_das_guides g
SET user_id = cp.user_id
FROM public.customer_products cp
WHERE g.customer_product_id = cp.id
  AND g.user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_das_guides_user ON public.financial_das_guides(user_id);

-- Refresh policies usando user_id quando disponível, fallback via customer_products
DROP POLICY IF EXISTS "Owners view their DAS guides" ON public.financial_das_guides;
DROP POLICY IF EXISTS "Owners insert their DAS guides" ON public.financial_das_guides;
DROP POLICY IF EXISTS "Owners update their DAS guides" ON public.financial_das_guides;
DROP POLICY IF EXISTS "Owners delete their DAS guides" ON public.financial_das_guides;

CREATE POLICY "DAS owners view"
  ON public.financial_das_guides FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR auth.uid() = user_id
    OR public.owns_customer_product(customer_product_id)
  );

CREATE POLICY "DAS owners insert"
  ON public.financial_das_guides FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.owns_customer_product(customer_product_id)
  );

CREATE POLICY "DAS owners update"
  ON public.financial_das_guides FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.owns_customer_product(customer_product_id)
  );

CREATE POLICY "DAS owners delete"
  ON public.financial_das_guides FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.owns_customer_product(customer_product_id)
  );

GRANT ALL ON public.financial_das_guides TO service_role;
