ALTER TABLE public.financial_agent_invoices
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;