-- Create bot instances for products that can have multiple independent bots (workflows)
CREATE TABLE IF NOT EXISTS public.bot_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Bot',
  workflow_id text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bot_instances ENABLE ROW LEVEL SECURITY;

-- Policies: admins can manage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bot_instances'
      AND policyname = 'Admins can manage bot_instances'
  ) THEN
    CREATE POLICY "Admins can manage bot_instances"
    ON public.bot_instances
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'::public.app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

-- Policies: owners can manage (via owns_customer_product)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bot_instances'
      AND policyname = 'Owners can manage bot_instances'
  ) THEN
    CREATE POLICY "Owners can manage bot_instances"
    ON public.bot_instances
    FOR ALL
    USING (public.owns_customer_product(customer_product_id))
    WITH CHECK (public.owns_customer_product(customer_product_id));
  END IF;
END $$;

-- Trigger to keep updated_at in sync
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_bot_instances_updated_at'
  ) THEN
    CREATE TRIGGER update_bot_instances_updated_at
    BEFORE UPDATE ON public.bot_instances
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_bot_instances_customer_product_id
  ON public.bot_instances(customer_product_id);
