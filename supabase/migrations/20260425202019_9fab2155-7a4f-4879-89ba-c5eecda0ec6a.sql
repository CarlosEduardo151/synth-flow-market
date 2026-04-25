-- Restore required table privileges for the financial WhatsApp flow.
-- RLS policies already restrict owner/admin access; these GRANTs allow the policies to be evaluated.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.financial_whatsapp_authorized_numbers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.financial_whatsapp_authorized_numbers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.financial_whatsapp_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.financial_whatsapp_logs TO service_role;
