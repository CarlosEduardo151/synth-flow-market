-- =====================================================
-- 1. ORÇAMENTOS POR CATEGORIA (planejamento mensal)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.financial_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id uuid NOT NULL,
  name text NOT NULL,
  category text,
  budget_amount numeric(14,2) NOT NULL DEFAULT 0,
  period text NOT NULL DEFAULT 'monthly', -- monthly | annual
  color text NOT NULL DEFAULT '#10b981',
  alert_threshold numeric(5,2) NOT NULL DEFAULT 80,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_financial_budgets_cp ON public.financial_budgets(customer_product_id);
ALTER TABLE public.financial_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Budgets owner select" ON public.financial_budgets;
CREATE POLICY "Budgets owner select" ON public.financial_budgets FOR SELECT
  USING (public.has_role(auth.uid(),'admin') OR public.owns_customer_product(customer_product_id));
DROP POLICY IF EXISTS "Budgets owner insert" ON public.financial_budgets;
CREATE POLICY "Budgets owner insert" ON public.financial_budgets FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.owns_customer_product(customer_product_id));
DROP POLICY IF EXISTS "Budgets owner update" ON public.financial_budgets;
CREATE POLICY "Budgets owner update" ON public.financial_budgets FOR UPDATE
  USING (public.has_role(auth.uid(),'admin') OR public.owns_customer_product(customer_product_id));
DROP POLICY IF EXISTS "Budgets owner delete" ON public.financial_budgets;
CREATE POLICY "Budgets owner delete" ON public.financial_budgets FOR DELETE
  USING (public.has_role(auth.uid(),'admin') OR public.owns_customer_product(customer_product_id));

DROP TRIGGER IF EXISTS trg_financial_budgets_updated ON public.financial_budgets;
CREATE TRIGGER trg_financial_budgets_updated BEFORE UPDATE ON public.financial_budgets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 2. ORÇAMENTOS COMERCIAIS (cotações para clientes)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.financial_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id uuid NOT NULL,
  quote_number text NOT NULL,
  client_name text NOT NULL,
  client_email text,
  client_phone text,
  client_document text,
  client_address text,
  status text NOT NULL DEFAULT 'draft', -- draft, sent, approved, rejected, expired, converted
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  discount numeric(14,2) NOT NULL DEFAULT 0,
  tax numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  valid_until date,
  sent_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  notes text,
  terms text,
  converted_receivable_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_product_id, quote_number)
);
CREATE INDEX IF NOT EXISTS idx_financial_quotes_cp ON public.financial_quotes(customer_product_id);
CREATE INDEX IF NOT EXISTS idx_financial_quotes_status ON public.financial_quotes(status);
ALTER TABLE public.financial_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Quotes owner select" ON public.financial_quotes;
CREATE POLICY "Quotes owner select" ON public.financial_quotes FOR SELECT
  USING (public.has_role(auth.uid(),'admin') OR public.owns_customer_product(customer_product_id));
DROP POLICY IF EXISTS "Quotes owner insert" ON public.financial_quotes;
CREATE POLICY "Quotes owner insert" ON public.financial_quotes FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.owns_customer_product(customer_product_id));
DROP POLICY IF EXISTS "Quotes owner update" ON public.financial_quotes;
CREATE POLICY "Quotes owner update" ON public.financial_quotes FOR UPDATE
  USING (public.has_role(auth.uid(),'admin') OR public.owns_customer_product(customer_product_id));
DROP POLICY IF EXISTS "Quotes owner delete" ON public.financial_quotes;
CREATE POLICY "Quotes owner delete" ON public.financial_quotes FOR DELETE
  USING (public.has_role(auth.uid(),'admin') OR public.owns_customer_product(customer_product_id));

DROP TRIGGER IF EXISTS trg_financial_quotes_updated ON public.financial_quotes;
CREATE TRIGGER trg_financial_quotes_updated BEFORE UPDATE ON public.financial_quotes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.financial_quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.financial_quotes(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(12,3) NOT NULL DEFAULT 1,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  discount numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON public.financial_quote_items(quote_id);
ALTER TABLE public.financial_quote_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Quote items via parent" ON public.financial_quote_items;
CREATE POLICY "Quote items via parent" ON public.financial_quote_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.financial_quotes q WHERE q.id = quote_id
    AND (public.has_role(auth.uid(),'admin') OR public.owns_customer_product(q.customer_product_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.financial_quotes q WHERE q.id = quote_id
    AND (public.has_role(auth.uid(),'admin') OR public.owns_customer_product(q.customer_product_id))));

-- =====================================================
-- 3. FATURAS A RECEBER (cobrança de clientes)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.financial_receivables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id uuid NOT NULL,
  invoice_number text NOT NULL,
  quote_id uuid REFERENCES public.financial_quotes(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_email text,
  client_phone text,
  client_document text,
  client_address text,
  status text NOT NULL DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  discount numeric(14,2) NOT NULL DEFAULT 0,
  tax numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  paid_amount numeric(14,2) NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  sent_at timestamptz,
  paid_at timestamptz,
  payment_method text,
  payment_link text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_product_id, invoice_number)
);
CREATE INDEX IF NOT EXISTS idx_financial_receivables_cp ON public.financial_receivables(customer_product_id);
CREATE INDEX IF NOT EXISTS idx_financial_receivables_status ON public.financial_receivables(status);
ALTER TABLE public.financial_receivables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Receivables owner select" ON public.financial_receivables;
CREATE POLICY "Receivables owner select" ON public.financial_receivables FOR SELECT
  USING (public.has_role(auth.uid(),'admin') OR public.owns_customer_product(customer_product_id));
DROP POLICY IF EXISTS "Receivables owner insert" ON public.financial_receivables;
CREATE POLICY "Receivables owner insert" ON public.financial_receivables FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.owns_customer_product(customer_product_id));
DROP POLICY IF EXISTS "Receivables owner update" ON public.financial_receivables;
CREATE POLICY "Receivables owner update" ON public.financial_receivables FOR UPDATE
  USING (public.has_role(auth.uid(),'admin') OR public.owns_customer_product(customer_product_id));
DROP POLICY IF EXISTS "Receivables owner delete" ON public.financial_receivables;
CREATE POLICY "Receivables owner delete" ON public.financial_receivables FOR DELETE
  USING (public.has_role(auth.uid(),'admin') OR public.owns_customer_product(customer_product_id));

DROP TRIGGER IF EXISTS trg_financial_receivables_updated ON public.financial_receivables;
CREATE TRIGGER trg_financial_receivables_updated BEFORE UPDATE ON public.financial_receivables
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.financial_receivable_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id uuid NOT NULL REFERENCES public.financial_receivables(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(12,3) NOT NULL DEFAULT 1,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  discount numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_receivable_items_rec ON public.financial_receivable_items(receivable_id);
ALTER TABLE public.financial_receivable_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Receivable items via parent" ON public.financial_receivable_items;
CREATE POLICY "Receivable items via parent" ON public.financial_receivable_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.financial_receivables r WHERE r.id = receivable_id
    AND (public.has_role(auth.uid(),'admin') OR public.owns_customer_product(r.customer_product_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.financial_receivables r WHERE r.id = receivable_id
    AND (public.has_role(auth.uid(),'admin') OR public.owns_customer_product(r.customer_product_id))));

-- =====================================================
-- 4. ENRIQUECE FATURAS A PAGAR
-- =====================================================
ALTER TABLE public.financial_agent_invoices
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS paid_amount numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS supplier text,
  ADD COLUMN IF NOT EXISTS parent_invoice_id uuid;

-- =====================================================
-- 5. NUMERAÇÃO SEQUENCIAL
-- =====================================================
CREATE OR REPLACE FUNCTION public.next_quote_number(_cp_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  yr int := EXTRACT(YEAR FROM now());
  n int;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(quote_number FROM '\d+$')::int), 0) + 1 INTO n
    FROM public.financial_quotes
    WHERE customer_product_id = _cp_id
      AND quote_number LIKE 'ORC-' || yr || '-%';
  RETURN 'ORC-' || yr || '-' || LPAD(n::text, 4, '0');
END;$$;

CREATE OR REPLACE FUNCTION public.next_invoice_number(_cp_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  yr int := EXTRACT(YEAR FROM now());
  n int;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(invoice_number FROM '\d+$')::int), 0) + 1 INTO n
    FROM public.financial_receivables
    WHERE customer_product_id = _cp_id
      AND invoice_number LIKE 'FAT-' || yr || '-%';
  RETURN 'FAT-' || yr || '-' || LPAD(n::text, 4, '0');
END;$$;

-- =====================================================
-- 6. RECÁLCULO AUTOMÁTICO DE TOTAIS
-- =====================================================
CREATE OR REPLACE FUNCTION public.recalc_quote_totals(_quote_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sub numeric(14,2);
BEGIN
  SELECT COALESCE(SUM(total),0) INTO sub FROM public.financial_quote_items WHERE quote_id = _quote_id;
  UPDATE public.financial_quotes
    SET subtotal = sub,
        total = GREATEST(sub - COALESCE(discount,0) + COALESCE(tax,0), 0),
        updated_at = now()
    WHERE id = _quote_id;
END;$$;

CREATE OR REPLACE FUNCTION public.recalc_receivable_totals(_rec_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sub numeric(14,2);
BEGIN
  SELECT COALESCE(SUM(total),0) INTO sub FROM public.financial_receivable_items WHERE receivable_id = _rec_id;
  UPDATE public.financial_receivables
    SET subtotal = sub,
        total = GREATEST(sub - COALESCE(discount,0) + COALESCE(tax,0), 0),
        updated_at = now()
    WHERE id = _rec_id;
END;$$;

CREATE OR REPLACE FUNCTION public.trg_quote_item_recalc()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recalc_quote_totals(COALESCE(NEW.quote_id, OLD.quote_id));
  RETURN COALESCE(NEW, OLD);
END;$$;

CREATE OR REPLACE FUNCTION public.trg_receivable_item_recalc()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recalc_receivable_totals(COALESCE(NEW.receivable_id, OLD.receivable_id));
  RETURN COALESCE(NEW, OLD);
END;$$;

DROP TRIGGER IF EXISTS trg_quote_items_recalc ON public.financial_quote_items;
CREATE TRIGGER trg_quote_items_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.financial_quote_items
FOR EACH ROW EXECUTE FUNCTION public.trg_quote_item_recalc();

DROP TRIGGER IF EXISTS trg_receivable_items_recalc ON public.financial_receivable_items;
CREATE TRIGGER trg_receivable_items_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.financial_receivable_items
FOR EACH ROW EXECUTE FUNCTION public.trg_receivable_item_recalc();