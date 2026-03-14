
-- Platform-wide logging table for edge function executions and system events
CREATE TABLE public.platform_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  level text NOT NULL DEFAULT 'info',
  source text NOT NULL DEFAULT 'system',
  function_name text,
  event_type text NOT NULL DEFAULT 'execution',
  message text NOT NULL,
  duration_ms integer DEFAULT 0,
  status_code integer,
  user_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  error_stack text
);

-- Index for fast queries
CREATE INDEX idx_platform_logs_created_at ON public.platform_logs (created_at DESC);
CREATE INDEX idx_platform_logs_level ON public.platform_logs (level);
CREATE INDEX idx_platform_logs_source ON public.platform_logs (source);
CREATE INDEX idx_platform_logs_function_name ON public.platform_logs (function_name);

-- Enable RLS
ALTER TABLE public.platform_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read platform logs
CREATE POLICY "Admins can view platform_logs"
  ON public.platform_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role and edge functions can insert
CREATE POLICY "Service can insert platform_logs"
  ON public.platform_logs FOR INSERT
  TO public
  WITH CHECK (true);

-- Grant permissions for service_role
GRANT ALL ON public.platform_logs TO service_role;
