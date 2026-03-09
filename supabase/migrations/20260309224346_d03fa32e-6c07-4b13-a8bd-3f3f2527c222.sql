
-- Fix overly permissive INSERT policy - restrict to service_role or self-insert
DROP POLICY "Service role can insert notifications" ON public.fleet_notifications;

CREATE POLICY "Users can insert own notifications"
  ON public.fleet_notifications FOR INSERT
  TO authenticated
  WITH CHECK (recipient_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
