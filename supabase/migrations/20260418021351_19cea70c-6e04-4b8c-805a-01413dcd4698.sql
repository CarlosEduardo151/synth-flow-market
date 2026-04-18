-- Calendar connection per customer_product
CREATE TABLE IF NOT EXISTS public.sa_calendar_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'google',
  google_email text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scope text,
  calendar_id text DEFAULT 'primary',
  default_duration_min int DEFAULT 30,
  default_buffer_min int DEFAULT 10,
  working_hours jsonb DEFAULT '{"start":"09:00","end":"18:00","days":[1,2,3,4,5]}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(customer_product_id, provider)
);

ALTER TABLE public.sa_calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners select calendar conn" ON public.sa_calendar_connections
  FOR SELECT USING (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owners insert calendar conn" ON public.sa_calendar_connections
  FOR INSERT WITH CHECK (public.owns_customer_product(customer_product_id));
CREATE POLICY "owners update calendar conn" ON public.sa_calendar_connections
  FOR UPDATE USING (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owners delete calendar conn" ON public.sa_calendar_connections
  FOR DELETE USING (public.owns_customer_product(customer_product_id) OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER sa_calendar_conn_updated BEFORE UPDATE ON public.sa_calendar_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enhance sa_meetings with Google sync fields and richer metadata
ALTER TABLE public.sa_meetings
  ADD COLUMN IF NOT EXISTS lead_email text,
  ADD COLUMN IF NOT EXISTS lead_phone text,
  ADD COLUMN IF NOT EXISTS duration_min int DEFAULT 30,
  ADD COLUMN IF NOT EXISTS meeting_url text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS google_event_id text,
  ADD COLUMN IF NOT EXISTS google_calendar_id text,
  ADD COLUMN IF NOT EXISTS reminder_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS opportunity_id uuid,
  ADD COLUMN IF NOT EXISTS outcome text,
  ADD COLUMN IF NOT EXISTS rescheduled_count int DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_sa_meetings_cp_scheduled ON public.sa_meetings(customer_product_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sa_meetings_status ON public.sa_meetings(status);

-- Table for OAuth state tracking (CSRF)
CREATE TABLE IF NOT EXISTS public.sa_oauth_states (
  state text PRIMARY KEY,
  customer_product_id uuid NOT NULL,
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'google',
  redirect_to text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes')
);
ALTER TABLE public.sa_oauth_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access oauth states" ON public.sa_oauth_states FOR ALL USING (false) WITH CHECK (false);