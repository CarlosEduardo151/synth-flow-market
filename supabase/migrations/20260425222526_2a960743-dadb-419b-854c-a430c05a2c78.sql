ALTER TABLE public.evolution_instances
ADD COLUMN IF NOT EXISTS connection_state TEXT,
ADD COLUMN IF NOT EXISTS last_health_check_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_reconnect_attempt_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reconnect_attempts INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_reconnect_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_reconnect_error TEXT;

CREATE INDEX IF NOT EXISTS idx_evolution_instances_health
ON public.evolution_instances (is_active, next_reconnect_at, updated_at);

GRANT SELECT, INSERT, UPDATE ON TABLE public.evolution_instances TO service_role;