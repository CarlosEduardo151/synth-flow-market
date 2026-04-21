-- =========================================================
-- 1) Contas multi-moeda (saldos persistentes)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.financial_currency_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id uuid NOT NULL,
  currency_code text NOT NULL,        -- BRL, USD, EUR, GBP...
  account_name text NOT NULL,         -- "Conta Wise USD", "Carteira PIX"
  balance numeric(18,4) NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_product_id, currency_code, account_name)
);

CREATE INDEX IF NOT EXISTS idx_currency_accounts_cp ON public.financial_currency_accounts(customer_product_id);

ALTER TABLE public.financial_currency_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own currency accounts"
ON public.financial_currency_accounts FOR ALL
USING (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_currency_accounts_updated_at
BEFORE UPDATE ON public.financial_currency_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 2) Vínculos automáticos de Metas <-> categorias/tags
-- =========================================================
CREATE TABLE IF NOT EXISTS public.financial_goal_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.financial_agent_goals(id) ON DELETE CASCADE,
  customer_product_id uuid NOT NULL,
  match_type text NOT NULL DEFAULT 'category', -- 'category' | 'tag' | 'description_contains'
  match_value text NOT NULL,
  contribution_type text NOT NULL DEFAULT 'income', -- conta receitas que contam para a meta
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goal_links_goal ON public.financial_goal_links(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_links_cp ON public.financial_goal_links(customer_product_id);

ALTER TABLE public.financial_goal_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own goal links"
ON public.financial_goal_links FOR ALL
USING (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 3) Snapshots de relatórios (DRE, Fluxo, Aging, etc.)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.financial_report_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id uuid NOT NULL,
  report_type text NOT NULL,          -- 'dre' | 'cashflow' | 'aging' | 'custom'
  period_start date,
  period_end date,
  title text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  pdf_url text,
  generated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_snapshots_cp ON public.financial_report_snapshots(customer_product_id, created_at DESC);

ALTER TABLE public.financial_report_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own report snapshots"
ON public.financial_report_snapshots FOR SELECT
USING (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner can insert own report snapshots"
ON public.financial_report_snapshots FOR INSERT
WITH CHECK (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner can delete own report snapshots"
ON public.financial_report_snapshots FOR DELETE
USING (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 4) Log de execuções de recorrência
-- =========================================================
CREATE TABLE IF NOT EXISTS public.financial_recurring_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_event_id uuid,
  customer_product_id uuid NOT NULL,
  generated_event_id uuid,
  generated_invoice_id uuid,
  run_type text NOT NULL,             -- 'calendar' | 'invoice'
  run_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

CREATE INDEX IF NOT EXISTS idx_recurring_runs_cp ON public.financial_recurring_runs(customer_product_id, run_at DESC);

ALTER TABLE public.financial_recurring_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own recurring runs"
ON public.financial_recurring_runs FOR SELECT
USING (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 5) RPC: recompute goal progress
-- =========================================================
CREATE OR REPLACE FUNCTION public.goal_recompute_progress(_goal_id uuid)
RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  total numeric := 0;
  cp_id uuid;
  link record;
BEGIN
  SELECT customer_product_id INTO cp_id FROM public.financial_agent_goals WHERE id = _goal_id;
  IF cp_id IS NULL THEN RETURN 0; END IF;

  FOR link IN
    SELECT * FROM public.financial_goal_links WHERE goal_id = _goal_id
  LOOP
    IF link.match_type = 'category' THEN
      SELECT total + COALESCE(SUM(amount),0) INTO total
        FROM public.financial_agent_transactions
        WHERE customer_product_id = cp_id
          AND type = link.contribution_type
          AND COALESCE(category, '') = link.match_value;
    ELSIF link.match_type = 'tag' THEN
      SELECT total + COALESCE(SUM(amount),0) INTO total
        FROM public.financial_agent_transactions
        WHERE customer_product_id = cp_id
          AND type = link.contribution_type
          AND link.match_value = ANY(COALESCE(tags, ARRAY[]::text[]));
    ELSIF link.match_type = 'description_contains' THEN
      SELECT total + COALESCE(SUM(amount),0) INTO total
        FROM public.financial_agent_transactions
        WHERE customer_product_id = cp_id
          AND type = link.contribution_type
          AND COALESCE(description, '') ILIKE '%' || link.match_value || '%';
    END IF;
  END LOOP;

  UPDATE public.financial_agent_goals
    SET current_amount = total,
        status = CASE WHEN total >= target_amount THEN 'completed' ELSE 'active' END
    WHERE id = _goal_id;

  RETURN total;
END; $$;

-- =========================================================
-- 6) Função: process_recurring_events (cron)
-- =========================================================
CREATE OR REPLACE FUNCTION public.process_recurring_events()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec record;
  next_date date;
  new_id uuid;
  generated int := 0;
BEGIN
  FOR rec IN
    SELECT * FROM public.financial_calendar_events
    WHERE recurring = true
      AND status <> 'cancelled'
      AND event_date <= CURRENT_DATE
  LOOP
    next_date := CASE rec.recurring_interval
      WHEN 'weekly'    THEN rec.event_date + INTERVAL '7 days'
      WHEN 'monthly'   THEN rec.event_date + INTERVAL '1 month'
      WHEN 'quarterly' THEN rec.event_date + INTERVAL '3 months'
      WHEN 'yearly'    THEN rec.event_date + INTERVAL '1 year'
      ELSE NULL
    END;

    IF next_date IS NULL THEN CONTINUE; END IF;

    -- evita duplicar: só insere se ainda não existe um próximo evento
    IF NOT EXISTS (
      SELECT 1 FROM public.financial_calendar_events
      WHERE customer_product_id = rec.customer_product_id
        AND title = rec.title
        AND event_date = next_date
        AND recurring = true
    ) THEN
      INSERT INTO public.financial_calendar_events (
        customer_product_id, title, amount, event_type, event_date,
        category, recurring, recurring_interval, status
      ) VALUES (
        rec.customer_product_id, rec.title, rec.amount, rec.event_type, next_date,
        rec.category, true, rec.recurring_interval, 'pending'
      ) RETURNING id INTO new_id;

      -- marca a ocorrência atual como executada (mantém recurring=false na original para não duplicar de novo)
      UPDATE public.financial_calendar_events
        SET status = 'executed', recurring = false
        WHERE id = rec.id;

      INSERT INTO public.financial_recurring_runs (source_event_id, customer_product_id, generated_event_id, run_type)
      VALUES (rec.id, rec.customer_product_id, new_id, 'calendar');

      generated := generated + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('generated', generated, 'ran_at', now());
END; $$;

-- =========================================================
-- 7) Função: update_overdue_invoices (cron)
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_overdue_invoices()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE updated_payable int := 0; updated_recv int := 0;
BEGIN
  UPDATE public.financial_agent_invoices
     SET status = 'overdue'
   WHERE status = 'pending'
     AND due_date < CURRENT_DATE;
  GET DIAGNOSTICS updated_payable = ROW_COUNT;

  UPDATE public.financial_receivables
     SET status = 'overdue'
   WHERE status = 'sent'
     AND due_date < CURRENT_DATE;
  GET DIAGNOSTICS updated_recv = ROW_COUNT;

  RETURN jsonb_build_object('payables', updated_payable, 'receivables', updated_recv, 'ran_at', now());
END; $$;

-- =========================================================
-- 8) Cron jobs (pg_cron)
-- =========================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove jobs antigos com mesmo nome se existirem
DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname IN ('financial-recurring-daily', 'financial-overdue-daily');
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Roda recorrências todo dia às 03:00 UTC
SELECT cron.schedule(
  'financial-recurring-daily',
  '0 3 * * *',
  $cron$ SELECT public.process_recurring_events(); $cron$
);

-- Atualiza vencidos todo dia às 04:00 UTC
SELECT cron.schedule(
  'financial-overdue-daily',
  '0 4 * * *',
  $cron$ SELECT public.update_overdue_invoices(); $cron$
);

-- =========================================================
-- 9) Trigger: ao inserir/alterar/deletar transação, recalcula metas vinculadas
-- =========================================================
CREATE OR REPLACE FUNCTION public.trg_recompute_linked_goals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g record; cp_id uuid;
BEGIN
  cp_id := COALESCE(NEW.customer_product_id, OLD.customer_product_id);
  FOR g IN
    SELECT DISTINCT goal_id FROM public.financial_goal_links WHERE customer_product_id = cp_id
  LOOP
    PERFORM public.goal_recompute_progress(g.goal_id);
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS trg_tx_recompute_goals ON public.financial_agent_transactions;
CREATE TRIGGER trg_tx_recompute_goals
AFTER INSERT OR UPDATE OR DELETE ON public.financial_agent_transactions
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_linked_goals();