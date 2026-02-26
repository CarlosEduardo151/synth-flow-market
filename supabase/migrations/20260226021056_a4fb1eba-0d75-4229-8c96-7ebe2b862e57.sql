
-- Grant permissions for bot_report_config
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_report_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_report_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_report_config TO service_role;

-- Grant permissions for bot_report_logs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_report_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_report_logs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_report_logs TO service_role;
