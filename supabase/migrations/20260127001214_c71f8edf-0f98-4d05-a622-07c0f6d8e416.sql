-- Fix migration order: create tables before functions that reference them

-- ENUMS (guarded)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'acquisition_type') THEN
    CREATE TYPE public.acquisition_type AS ENUM ('purchase', 'rental');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trial_status') THEN
    CREATE TYPE public.trial_status AS ENUM ('active', 'expired', 'cancelled');
  END IF;
END$$;

-- update_updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- CUSTOMER PRODUCTS (needed by owns_customer_product)
CREATE TABLE IF NOT EXISTS public.customer_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_slug text NOT NULL,
  product_title text,
  acquisition_type public.acquisition_type NOT NULL DEFAULT 'purchase',
  is_active boolean NOT NULL DEFAULT true,
  delivered_at timestamptz,
  access_expires_at timestamptz,
  rental_start_date date,
  rental_end_date date,
  rental_payment_status text,
  monthly_rental_price numeric,
  download_count integer NOT NULL DEFAULT 0,
  max_downloads integer,
  n8n_workflow_id text,
  webhook_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_products ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='customer_products' AND policyname='Users can manage own customer_products') THEN
    CREATE POLICY "Users can manage own customer_products"
      ON public.customer_products FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='customer_products' AND policyname='Admins can manage customer_products') THEN
    CREATE POLICY "Admins can manage customer_products"
      ON public.customer_products FOR ALL
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_customer_products_updated_at') THEN
    CREATE TRIGGER update_customer_products_updated_at
    BEFORE UPDATE ON public.customer_products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- Helper: check ownership of customer_product_id
CREATE OR REPLACE FUNCTION public.owns_customer_product(_customer_product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.customer_products cp
    WHERE cp.id = _customer_product_id
      AND cp.user_id = auth.uid()
  )
$$;

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text,
  email text,
  phone text,
  birth_date date,
  cpf text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
      ON public.profiles FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
      ON public.profiles FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON public.profiles FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='Admins can manage profiles'
  ) THEN
    CREATE POLICY "Admins can manage profiles"
      ON public.profiles FOR ALL
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- PRODUCT REVIEWS
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_slug text NOT NULL,
  customer_name text,
  rating integer NOT NULL,
  review_text text,
  is_approved boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_reviews' AND policyname='Users can insert own product_reviews') THEN
    CREATE POLICY "Users can insert own product_reviews"
      ON public.product_reviews FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_reviews' AND policyname='Users can view own product_reviews') THEN
    CREATE POLICY "Users can view own product_reviews"
      ON public.product_reviews FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_reviews' AND policyname='Public can view approved product_reviews') THEN
    CREATE POLICY "Public can view approved product_reviews"
      ON public.product_reviews FOR SELECT
      USING (is_approved = true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_reviews' AND policyname='Admins can manage product_reviews') THEN
    CREATE POLICY "Admins can manage product_reviews"
      ON public.product_reviews FOR ALL
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END$$;

-- FREE TRIALS
CREATE TABLE IF NOT EXISTS public.free_trials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_slug text NOT NULL,
  status public.trial_status NOT NULL DEFAULT 'active',
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_slug)
);
ALTER TABLE public.free_trials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='free_trials' AND policyname='Users can manage own free_trials') THEN
    CREATE POLICY "Users can manage own free_trials"
      ON public.free_trials FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='free_trials' AND policyname='Admins can manage free_trials') THEN
    CREATE POLICY "Admins can manage free_trials"
      ON public.free_trials FOR ALL
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END$$;
