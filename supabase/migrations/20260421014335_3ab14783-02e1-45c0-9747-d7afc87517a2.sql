-- ETAPA 1: Tabelas para Insights, Notificações, Previsões e KPIs

-- 1) Insights de IA (anomalias, alertas, recomendações)
CREATE TABLE IF NOT EXISTS public.financial_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id uuid NOT NULL,
  insight_type text NOT NULL CHECK (insight_type IN ('anomaly','optimization','benchmark','alert','recommendation')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  title text NOT NULL,
  description text NOT NULL,
  impact_brl numeric(14,2) DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved','dismissed')),
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_insights_cp ON public.financial_insights(customer_product_id, status, detected_at DESC);

ALTER TABLE public.financial_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own insights" ON public.financial_insights
  FOR SELECT USING (public.owns_customer_product(customer_product_id));
CREATE POLICY "Users update own insights" ON public.financial_insights
  FOR UPDATE USING (public.owns_customer_product(customer_product_id));
CREATE POLICY "Service role full access insights" ON public.financial_insights
  FOR ALL USING (auth.role() = 'service_role');

-- 2) Notificações financeiras (histórico de envios)
CREATE TABLE IF NOT EXISTS public.financial_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id uuid NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('due_soon','overdue','low_balance','goal_reached','anomaly','monthly_report')),
  channel text NOT NULL CHECK (channel IN ('email','whatsapp','in_app')),
  recipient text NOT NULL,
  subject text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  metadata jsonb DEFAULT '{}'::jsonb,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_notif_cp ON public.financial_notifications(customer_product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fin_notif_dedup ON public.financial_notifications(customer_product_id, notification_type, recipient, (metadata->>'ref_id'));

ALTER TABLE public.financial_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.financial_notifications
  FOR SELECT USING (public.owns_customer_product(customer_product_id));
CREATE POLICY "Service role full access notifications" ON public.financial_notifications
  FOR ALL USING (auth.role() = 'service_role');

-- 3) Previsões financeiras (forecast)
CREATE TABLE IF NOT EXISTS public.financial_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id uuid NOT NULL,
  horizon_days int NOT NULL CHECK (horizon_days IN (30,60,90)),
  generated_at timestamptz NOT NULL DEFAULT now(),
  method text NOT NULL DEFAULT 'linear_seasonal',
  projected_income numeric(14,2) NOT NULL DEFAULT 0,
  projected_expense numeric(14,2) NOT NULL DEFAULT 0,
  projected_balance numeric(14,2) NOT NULL DEFAULT 0,
  confidence numeric(5,2) DEFAULT 70,
  daily_series jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_forecast_cp ON public.financial_forecasts(customer_product_id, generated_at DESC);

ALTER TABLE public.financial_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own forecasts" ON public.financial_forecasts
  FOR SELECT USING (public.owns_customer_product(customer_product_id));
CREATE POLICY "Service role full access forecasts" ON public.financial_forecasts
  FOR ALL USING (auth.role() = 'service_role');

-- 4) KPIs agregados diários
CREATE TABLE IF NOT EXISTS public.financial_kpi_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id uuid NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  revenue_mtd numeric(14,2) DEFAULT 0,
  expense_mtd numeric(14,2) DEFAULT 0,
  net_margin_pct numeric(6,2) DEFAULT 0,
  burn_rate_monthly numeric(14,2) DEFAULT 0,
  runway_months numeric(6,2) DEFAULT 0,
  avg_ticket numeric(14,2) DEFAULT 0,
  cash_balance numeric(14,2) DEFAULT 0,
  receivables_open numeric(14,2) DEFAULT 0,
  payables_open numeric(14,2) DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_product_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_fin_kpi_cp ON public.financial_kpi_snapshots(customer_product_id, snapshot_date DESC);

ALTER TABLE public.financial_kpi_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own kpis" ON public.financial_kpi_snapshots
  FOR SELECT USING (public.owns_customer_product(customer_product_id));
CREATE POLICY "Service role full access kpis" ON public.financial_kpi_snapshots
  FOR ALL USING (auth.role() = 'service_role');

-- 5) Garantir extensions de cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;