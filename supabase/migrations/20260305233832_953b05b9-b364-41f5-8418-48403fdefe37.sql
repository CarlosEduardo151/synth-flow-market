
-- Add workshop_id to fleet_messages for per-workshop channels
ALTER TABLE public.fleet_messages
  ADD COLUMN workshop_id uuid REFERENCES public.fleet_partner_workshops(id) ON DELETE SET NULL;

-- Add workshop_id to fleet_calls for per-workshop channels
ALTER TABLE public.fleet_calls
  ADD COLUMN workshop_id uuid REFERENCES public.fleet_partner_workshops(id) ON DELETE SET NULL;

-- Index for fast lookups
CREATE INDEX idx_fleet_messages_workshop_id ON public.fleet_messages(workshop_id);
CREATE INDEX idx_fleet_calls_workshop_id ON public.fleet_calls(workshop_id);
