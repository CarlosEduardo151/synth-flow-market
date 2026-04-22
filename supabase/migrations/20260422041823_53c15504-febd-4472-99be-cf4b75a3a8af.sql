
-- 1) Add category column to transactions (used by chat snapshot)
ALTER TABLE public.financial_agent_transactions
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS tags text[];

-- 2) financial_agent_chat_messages
CREATE TABLE IF NOT EXISTS public.financial_agent_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  customer_product_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  attachments jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fa_chat_msgs_cp ON public.financial_agent_chat_messages(customer_product_id, created_at);
ALTER TABLE public.financial_agent_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners read chat msgs" ON public.financial_agent_chat_messages;
CREATE POLICY "owners read chat msgs" ON public.financial_agent_chat_messages
  FOR SELECT USING (public.owns_customer_product(customer_product_id));
DROP POLICY IF EXISTS "owners write chat msgs" ON public.financial_agent_chat_messages;
CREATE POLICY "owners write chat msgs" ON public.financial_agent_chat_messages
  FOR INSERT WITH CHECK (public.owns_customer_product(customer_product_id));
DROP POLICY IF EXISTS "service all chat msgs" ON public.financial_agent_chat_messages;
CREATE POLICY "service all chat msgs" ON public.financial_agent_chat_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3) financial_agent_action_requests
CREATE TABLE IF NOT EXISTS public.financial_agent_action_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  customer_product_id uuid NOT NULL,
  action_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','executed','failed','rejected')),
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fa_action_req_cp ON public.financial_agent_action_requests(customer_product_id, created_at DESC);
ALTER TABLE public.financial_agent_action_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners read action req" ON public.financial_agent_action_requests;
CREATE POLICY "owners read action req" ON public.financial_agent_action_requests
  FOR SELECT USING (public.owns_customer_product(customer_product_id));
DROP POLICY IF EXISTS "owners write action req" ON public.financial_agent_action_requests;
CREATE POLICY "owners write action req" ON public.financial_agent_action_requests
  FOR ALL USING (public.owns_customer_product(customer_product_id))
  WITH CHECK (public.owns_customer_product(customer_product_id));
DROP POLICY IF EXISTS "service all action req" ON public.financial_agent_action_requests;
CREATE POLICY "service all action req" ON public.financial_agent_action_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4) financial_agent_permissions
CREATE TABLE IF NOT EXISTS public.financial_agent_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  customer_product_id uuid NOT NULL,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, customer_product_id)
);
ALTER TABLE public.financial_agent_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners read perms" ON public.financial_agent_permissions;
CREATE POLICY "owners read perms" ON public.financial_agent_permissions
  FOR SELECT USING (public.owns_customer_product(customer_product_id));
DROP POLICY IF EXISTS "owners write perms" ON public.financial_agent_permissions;
CREATE POLICY "owners write perms" ON public.financial_agent_permissions
  FOR ALL USING (public.owns_customer_product(customer_product_id))
  WITH CHECK (public.owns_customer_product(customer_product_id));
DROP POLICY IF EXISTS "service all perms" ON public.financial_agent_permissions;
CREATE POLICY "service all perms" ON public.financial_agent_permissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
