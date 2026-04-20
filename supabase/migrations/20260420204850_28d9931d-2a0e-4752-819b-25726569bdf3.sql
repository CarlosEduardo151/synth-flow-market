-- Tabela de guias DAS emitidas
CREATE TABLE public.financial_das_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id UUID NOT NULL,
  regime TEXT NOT NULL CHECK (regime IN ('mei', 'simples')),
  anexo TEXT,
  competencia_month INTEGER NOT NULL CHECK (competencia_month BETWEEN 1 AND 12),
  competencia_year INTEGER NOT NULL CHECK (competencia_year BETWEEN 2020 AND 2100),
  revenue_month NUMERIC(14,2) NOT NULL DEFAULT 0,
  revenue_12m NUMERIC(14,2) NOT NULL DEFAULT 0,
  aliquota_efetiva NUMERIC(7,4) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL,
  tax_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  due_date DATE NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','overdue','cancelled')),
  paid_at TIMESTAMPTZ,
  barcode TEXT,
  pix_copy_paste TEXT,
  pdf_url TEXT,
  pdf_storage_path TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_product_id, competencia_year, competencia_month)
);

CREATE INDEX idx_das_guides_cp ON public.financial_das_guides(customer_product_id);
CREATE INDEX idx_das_guides_due ON public.financial_das_guides(due_date);
CREATE INDEX idx_das_guides_status ON public.financial_das_guides(payment_status);

ALTER TABLE public.financial_das_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their DAS guides"
  ON public.financial_das_guides FOR SELECT
  USING (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can insert DAS guides"
  ON public.financial_das_guides FOR INSERT
  WITH CHECK (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can update their DAS guides"
  ON public.financial_das_guides FOR UPDATE
  USING (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can delete their DAS guides"
  ON public.financial_das_guides FOR DELETE
  USING (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_das_guides_updated_at
  BEFORE UPDATE ON public.financial_das_guides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bucket privado para os PDFs das guias
INSERT INTO storage.buckets (id, name, public)
VALUES ('das_guides', 'das_guides', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Owners can read their DAS PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'das_guides'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.customer_products cp
        WHERE cp.user_id = auth.uid()
          AND cp.id::text = (storage.foldername(name))[1]
      )
    )
  );

CREATE POLICY "Service role can write DAS PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'das_guides');

CREATE POLICY "Service role can update DAS PDFs"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'das_guides');