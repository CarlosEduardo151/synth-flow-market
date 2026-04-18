
ALTER TABLE public.sa_cadences
  ADD COLUMN IF NOT EXISTS goal text DEFAULT 'qualify',
  ADD COLUMN IF NOT EXISTS target_audience text,
  ADD COLUMN IF NOT EXISTS primary_channel text DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS open_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reply_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversion_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_leads integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_leads integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS messages_sent integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS messages_replied integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_personalization boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS tone text DEFAULT 'consultivo';

ALTER TABLE public.sa_cadence_enrollments
  ADD COLUMN IF NOT EXISTS lead_name text,
  ADD COLUMN IF NOT EXISTS lead_phone text,
  ADD COLUMN IF NOT EXISTS lead_email text,
  ADD COLUMN IF NOT EXISTS opened_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS replied boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS converted boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_cadence_enroll_status ON public.sa_cadence_enrollments(cadence_id, status);
CREATE INDEX IF NOT EXISTS idx_cadence_enroll_next ON public.sa_cadence_enrollments(next_action_at) WHERE status = 'active';
