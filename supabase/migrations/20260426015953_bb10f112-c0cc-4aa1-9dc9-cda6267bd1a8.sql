ALTER TABLE public.evolution_instances
  ADD COLUMN IF NOT EXISTS last_disconnect_reason text,
  ADD COLUMN IF NOT EXISTS last_disconnect_code integer,
  ADD COLUMN IF NOT EXISTS last_disconnect_at timestamptz,
  ADD COLUMN IF NOT EXISTS connecting_since timestamptz;