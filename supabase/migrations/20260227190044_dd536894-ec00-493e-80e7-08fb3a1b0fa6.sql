
-- Tabela de mensagens entre frota e oficinas
CREATE TABLE public.fleet_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('frota', 'oficina')),
  sender_name text NOT NULL,
  recipient_name text NOT NULL,
  message_text text NOT NULL,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'audio', 'image', 'file', 'call_started', 'call_ended')),
  attachment_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fleet_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage fleet_messages"
  ON public.fleet_messages FOR ALL
  USING (owns_customer_product(customer_product_id))
  WITH CHECK (owns_customer_product(customer_product_id));

CREATE POLICY "Admins can manage fleet_messages"
  ON public.fleet_messages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_fleet_messages_cp ON public.fleet_messages(customer_product_id, created_at DESC);

-- Tabela de chamadas entre frota e oficinas
CREATE TABLE public.fleet_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id uuid NOT NULL,
  caller_role text NOT NULL CHECK (caller_role IN ('frota', 'oficina')),
  caller_name text NOT NULL,
  recipient_name text NOT NULL,
  status text NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'active', 'ended', 'missed', 'rejected')),
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fleet_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage fleet_calls"
  ON public.fleet_calls FOR ALL
  USING (owns_customer_product(customer_product_id))
  WITH CHECK (owns_customer_product(customer_product_id));

CREATE POLICY "Admins can manage fleet_calls"
  ON public.fleet_calls FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
