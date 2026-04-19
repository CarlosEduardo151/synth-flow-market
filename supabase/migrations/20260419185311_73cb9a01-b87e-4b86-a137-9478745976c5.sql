-- ============================================
-- CRM Notifications + Reminder tracking
-- ============================================

CREATE TABLE IF NOT EXISTS public.crm_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('new_lead','followup_overdue','hot_opportunity','meeting_soon','meeting_starting','reminder_sent')),
  title text NOT NULL,
  message text,
  link_path text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_notifications_cp_unread
  ON public.crm_notifications (customer_product_id, is_read, created_at DESC);

ALTER TABLE public.crm_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select_crm_notifications" ON public.crm_notifications
  FOR SELECT TO authenticated
  USING (public.owns_customer_product(customer_product_id));

CREATE POLICY "owner_update_crm_notifications" ON public.crm_notifications
  FOR UPDATE TO authenticated
  USING (public.owns_customer_product(customer_product_id))
  WITH CHECK (public.owns_customer_product(customer_product_id));

CREATE POLICY "owner_delete_crm_notifications" ON public.crm_notifications
  FOR DELETE TO authenticated
  USING (public.owns_customer_product(customer_product_id));

CREATE POLICY "service_all_crm_notifications" ON public.crm_notifications
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT ALL ON public.crm_notifications TO service_role;

-- ============================================
-- Meeting reminders tracking (granular)
-- ============================================
ALTER TABLE public.sa_meetings
  ADD COLUMN IF NOT EXISTS reminder_email_24h_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_whatsapp_1h_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_email_1h_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_in_google boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_sa_meetings_scheduled_at
  ON public.sa_meetings (customer_product_id, scheduled_at)
  WHERE status NOT IN ('cancelled','completed');

-- ============================================
-- Realtime publication for notifications
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_notifications;
ALTER TABLE public.crm_notifications REPLICA IDENTITY FULL;