
-- Follow-up rules table
CREATE TABLE public.crm_follow_up_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'sem_resposta',
  delay_hours INTEGER NOT NULL DEFAULT 24,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  message_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  target_stage TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_follow_up_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own follow-up rules"
  ON public.crm_follow_up_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customer_products cp
      WHERE cp.id = customer_product_id AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customer_products cp
      WHERE cp.id = customer_product_id AND cp.user_id = auth.uid()
    )
  );

GRANT ALL ON public.crm_follow_up_rules TO service_role;

-- Follow-up execution logs
CREATE TABLE public.crm_follow_up_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES public.crm_follow_up_rules(id) ON DELETE SET NULL,
  customer_product_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  message_sent TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  attempt_number INTEGER NOT NULL DEFAULT 1,
  opportunity_id TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_follow_up_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own follow-up logs"
  ON public.crm_follow_up_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customer_products cp
      WHERE cp.id = customer_product_id AND cp.user_id = auth.uid()
    )
  );

GRANT ALL ON public.crm_follow_up_logs TO service_role;

-- Trigger for updated_at
CREATE TRIGGER update_crm_follow_up_rules_updated_at
  BEFORE UPDATE ON public.crm_follow_up_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
