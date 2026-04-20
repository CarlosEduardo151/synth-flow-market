
CREATE TABLE IF NOT EXISTS public.financial_das_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  das_guide_id UUID NOT NULL REFERENCES public.financial_das_guides(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'in_app')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'queued')),
  days_before INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_das_notif_guide ON public.financial_das_notifications(das_guide_id);

ALTER TABLE public.financial_das_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners view their DAS notifications" ON public.financial_das_notifications;
CREATE POLICY "Owners view their DAS notifications"
  ON public.financial_das_notifications FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Owners insert DAS notifications" ON public.financial_das_notifications;
CREATE POLICY "Owners insert DAS notifications"
  ON public.financial_das_notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

GRANT ALL ON public.financial_das_notifications TO service_role;

CREATE OR REPLACE FUNCTION public.calculate_rbt12(_customer_product_id UUID, _ref_date DATE DEFAULT CURRENT_DATE)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)::NUMERIC
  FROM public.financial_agent_transactions
  WHERE customer_product_id = _customer_product_id
    AND type = 'income'
    AND date >= (_ref_date - INTERVAL '12 months')::date
    AND date < _ref_date;
$$;

CREATE OR REPLACE FUNCTION public.get_revenue_month(_customer_product_id UUID, _year INTEGER, _month INTEGER)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)::NUMERIC
  FROM public.financial_agent_transactions
  WHERE customer_product_id = _customer_product_id
    AND type = 'income'
    AND EXTRACT(YEAR FROM date) = _year
    AND EXTRACT(MONTH FROM date) = _month;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_rbt12(UUID, DATE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_revenue_month(UUID, INTEGER, INTEGER) TO authenticated, service_role;
