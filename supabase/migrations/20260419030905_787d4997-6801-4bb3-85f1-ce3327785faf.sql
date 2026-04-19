
-- Trigger Events: alvos avulsos (independentes do CRM)
CREATE TABLE IF NOT EXISTS public.sa_trigger_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id uuid NOT NULL,
  name text NOT NULL,
  company text,
  position text,
  linkedin_url text,
  website_url text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sa_trigger_targets_cp ON public.sa_trigger_targets(customer_product_id);

ALTER TABLE public.sa_trigger_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage trigger targets"
ON public.sa_trigger_targets
FOR ALL
TO authenticated
USING (public.owns_customer_product(customer_product_id))
WITH CHECK (public.owns_customer_product(customer_product_id));

CREATE TRIGGER sa_trigger_targets_updated_at
BEFORE UPDATE ON public.sa_trigger_targets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Adiciona target_id em sa_trigger_events (vínculo alternativo a prospect)
ALTER TABLE public.sa_trigger_events
  ADD COLUMN IF NOT EXISTS target_id uuid REFERENCES public.sa_trigger_targets(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sa_trigger_events_target ON public.sa_trigger_events(target_id);
