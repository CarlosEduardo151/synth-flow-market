-- Permitir health scores também para leads (sem opportunity_id)
ALTER TABLE public.sa_deal_health_scores
  DROP CONSTRAINT IF EXISTS sa_deal_health_scores_customer_product_id_opportunity_id_key;

ALTER TABLE public.sa_deal_health_scores
  ADD COLUMN IF NOT EXISTS lead_id uuid,
  ADD COLUMN IF NOT EXISTS entity_type text NOT NULL DEFAULT 'opportunity';

-- Índice único composto: aceita (cp, opportunity_id) ou (cp, lead_id)
CREATE UNIQUE INDEX IF NOT EXISTS sa_deal_health_scores_uniq_opp
  ON public.sa_deal_health_scores (customer_product_id, opportunity_id)
  WHERE opportunity_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS sa_deal_health_scores_uniq_lead
  ON public.sa_deal_health_scores (customer_product_id, lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS sa_deal_health_scores_entity_type_idx
  ON public.sa_deal_health_scores (entity_type);