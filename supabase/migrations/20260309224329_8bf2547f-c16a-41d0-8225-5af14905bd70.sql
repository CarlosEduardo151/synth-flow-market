
-- Tabela de notificações multicanal
CREATE TABLE public.fleet_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id TEXT NOT NULL,
  service_order_id UUID REFERENCES public.fleet_service_orders(id) ON DELETE CASCADE,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_role TEXT NOT NULL DEFAULT 'gestor', -- gestor, oficina
  channel TEXT NOT NULL DEFAULT 'in_app', -- in_app, email, whatsapp
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  stage TEXT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ,
  delivered BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para queries rápidas
CREATE INDEX idx_fleet_notifications_recipient ON public.fleet_notifications(recipient_user_id, is_read);
CREATE INDEX idx_fleet_notifications_so ON public.fleet_notifications(service_order_id);

-- RLS
ALTER TABLE public.fleet_notifications ENABLE ROW LEVEL SECURITY;

-- Usuário vê só as próprias notificações
CREATE POLICY "Users can view own notifications"
  ON public.fleet_notifications FOR SELECT
  TO authenticated
  USING (recipient_user_id = auth.uid());

-- Usuário pode marcar como lida
CREATE POLICY "Users can update own notifications"
  ON public.fleet_notifications FOR UPDATE
  TO authenticated
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

-- Service role pode inserir (edge functions)
CREATE POLICY "Service role can insert notifications"
  ON public.fleet_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins podem ver tudo
CREATE POLICY "Admins can view all notifications"
  ON public.fleet_notifications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Grant para service_role
GRANT ALL ON public.fleet_notifications TO service_role;
