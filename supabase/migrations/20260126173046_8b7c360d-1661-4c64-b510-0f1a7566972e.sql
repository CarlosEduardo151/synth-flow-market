-- Fix: Postgres doesn't support CREATE POLICY IF NOT EXISTS.

-- Tables
CREATE TABLE IF NOT EXISTS public.product_ai_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_slug TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  credential_id UUID NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_slug, provider, model)
);

CREATE INDEX IF NOT EXISTS idx_product_ai_assignments_product_slug
  ON public.product_ai_assignments (product_slug);

CREATE TABLE IF NOT EXISTS public.financial_agent_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_product_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  attachments JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_chat_messages_user_product
  ON public.financial_agent_chat_messages (user_id, customer_product_id, created_at);

CREATE TABLE IF NOT EXISTS public.financial_agent_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_product_id UUID NOT NULL UNIQUE,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_permissions_user_product
  ON public.financial_agent_permissions (user_id, customer_product_id);

CREATE TABLE IF NOT EXISTS public.financial_agent_action_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_product_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','executed','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ NULL,
  decision_by UUID NULL,
  executed_at TIMESTAMPTZ NULL,
  error TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_fin_action_requests_user_status
  ON public.financial_agent_action_requests (user_id, status, created_at);

-- RLS
ALTER TABLE public.product_ai_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_agent_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_agent_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_agent_action_requests ENABLE ROW LEVEL SECURITY;

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers
DROP TRIGGER IF EXISTS trg_product_ai_assignments_updated_at ON public.product_ai_assignments;
CREATE TRIGGER trg_product_ai_assignments_updated_at
BEFORE UPDATE ON public.product_ai_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_financial_agent_permissions_updated_at ON public.financial_agent_permissions;
CREATE TRIGGER trg_financial_agent_permissions_updated_at
BEFORE UPDATE ON public.financial_agent_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Policies (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='product_ai_assignments' AND policyname='Admins can manage product ai assignments'
  ) THEN
    CREATE POLICY "Admins can manage product ai assignments"
    ON public.product_ai_assignments
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='financial_agent_chat_messages' AND policyname='Users can read their own financial chat messages'
  ) THEN
    CREATE POLICY "Users can read their own financial chat messages"
    ON public.financial_agent_chat_messages
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='financial_agent_chat_messages' AND policyname='Users can insert their own financial chat messages'
  ) THEN
    CREATE POLICY "Users can insert their own financial chat messages"
    ON public.financial_agent_chat_messages
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='financial_agent_chat_messages' AND policyname='Admins can read all financial chat messages'
  ) THEN
    CREATE POLICY "Admins can read all financial chat messages"
    ON public.financial_agent_chat_messages
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='financial_agent_permissions' AND policyname='Users can read their own financial agent permissions'
  ) THEN
    CREATE POLICY "Users can read their own financial agent permissions"
    ON public.financial_agent_permissions
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='financial_agent_permissions' AND policyname='Users can upsert their own financial agent permissions'
  ) THEN
    CREATE POLICY "Users can upsert their own financial agent permissions"
    ON public.financial_agent_permissions
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='financial_agent_permissions' AND policyname='Users can update their own financial agent permissions'
  ) THEN
    CREATE POLICY "Users can update their own financial agent permissions"
    ON public.financial_agent_permissions
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='financial_agent_permissions' AND policyname='Admins can read all financial agent permissions'
  ) THEN
    CREATE POLICY "Admins can read all financial agent permissions"
    ON public.financial_agent_permissions
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='financial_agent_action_requests' AND policyname='Users can read their own financial action requests'
  ) THEN
    CREATE POLICY "Users can read their own financial action requests"
    ON public.financial_agent_action_requests
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='financial_agent_action_requests' AND policyname='Users can create their own financial action requests'
  ) THEN
    CREATE POLICY "Users can create their own financial action requests"
    ON public.financial_agent_action_requests
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='financial_agent_action_requests' AND policyname='Users can update their own financial action requests'
  ) THEN
    CREATE POLICY "Users can update their own financial action requests"
    ON public.financial_agent_action_requests
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='financial_agent_action_requests' AND policyname='Admins can read all financial action requests'
  ) THEN
    CREATE POLICY "Admins can read all financial action requests"
    ON public.financial_agent_action_requests
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
