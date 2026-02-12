-- Migração (retry) sem mexer em storage.objects (evita erro de ownership)

-- 1) Bucket privado para scripts (fonte)
INSERT INTO storage.buckets (id, name, public)
VALUES ('bot_scripts', 'bot_scripts', false)
ON CONFLICT (id) DO NOTHING;

-- 2) Tabelas de controle (admin-only)
CREATE TABLE IF NOT EXISTS public.worker_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id uuid NOT NULL,
  worker_base_url text NOT NULL,
  shared_secret text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_product_id)
);

CREATE TABLE IF NOT EXISTS public.bot_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id uuid NOT NULL,
  language text NOT NULL,
  entrypoint_path text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_product_id)
);

-- 3) RLS
ALTER TABLE public.worker_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_scripts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins can manage worker_instances"
  ON public.worker_instances
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage bot_scripts"
  ON public.bot_scripts
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) updated_at triggers
DO $$ BEGIN
  CREATE TRIGGER update_worker_instances_updated_at
  BEFORE UPDATE ON public.worker_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_bot_scripts_updated_at
  BEFORE UPDATE ON public.bot_scripts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
