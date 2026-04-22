-- Drop multi-currency feature (no longer needed)
DROP TABLE IF EXISTS public.financial_currency_accounts CASCADE;

-- Ensure new goals have a default 'active' status so they appear in the UI
ALTER TABLE public.financial_agent_goals
  ALTER COLUMN status SET DEFAULT 'active';

UPDATE public.financial_agent_goals
   SET status = 'active'
 WHERE status IS NULL;