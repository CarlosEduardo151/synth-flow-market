-- Promo carousel slides for homepage (admin-managed)
CREATE TABLE IF NOT EXISTS public.promo_carousel_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text NULL,
  eyebrow text NULL,
  href text NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promo_carousel_slides ENABLE ROW LEVEL SECURITY;

-- Public can read active slides (homepage)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'promo_carousel_slides'
      AND policyname = 'Promo carousel: public can read active'
  ) THEN
    CREATE POLICY "Promo carousel: public can read active"
    ON public.promo_carousel_slides
    FOR SELECT
    USING (is_active = true);
  END IF;
END$$;

-- Admins can manage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'promo_carousel_slides'
      AND policyname = 'Promo carousel: admins can manage'
  ) THEN
    CREATE POLICY "Promo carousel: admins can manage"
    ON public.promo_carousel_slides
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'::public.app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END$$;

-- Index for ordering
CREATE INDEX IF NOT EXISTS promo_carousel_slides_active_order_idx
ON public.promo_carousel_slides (is_active, sort_order, created_at);

-- updated_at trigger
DROP TRIGGER IF EXISTS update_promo_carousel_slides_updated_at ON public.promo_carousel_slides;
CREATE TRIGGER update_promo_carousel_slides_updated_at
BEFORE UPDATE ON public.promo_carousel_slides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
