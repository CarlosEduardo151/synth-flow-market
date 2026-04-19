-- Anti-Churn Preditivo: campos adicionais para alertas
ALTER TABLE public.sa_antichurn_alerts
  ADD COLUMN IF NOT EXISTS crm_customer_id UUID REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS days_since_contact INTEGER,
  ADD COLUMN IF NOT EXISTS suggested_action TEXT,
  ADD COLUMN IF NOT EXISTS monthly_value NUMERIC DEFAULT 0;

-- Atualiza CHECK de status para incluir 'active', 'recovered'
ALTER TABLE public.sa_antichurn_alerts DROP CONSTRAINT IF EXISTS sa_antichurn_alerts_status_check;
ALTER TABLE public.sa_antichurn_alerts
  ADD CONSTRAINT sa_antichurn_alerts_status_check
  CHECK (status IN ('open','active','acted','resolved','recovered','false_positive','dismissed'));

-- Índice para evitar duplicatas por cliente CRM em alertas ativos
CREATE UNIQUE INDEX IF NOT EXISTS uq_sa_antichurn_active_per_customer
  ON public.sa_antichurn_alerts(customer_product_id, crm_customer_id)
  WHERE status IN ('open','active');

-- Permissões para service_role (edge functions)
GRANT ALL ON public.sa_antichurn_alerts TO service_role;