CREATE POLICY "deny_all_authenticated" ON public.whatsapp_message_dedup
  FOR ALL TO authenticated USING (false) WITH CHECK (false);