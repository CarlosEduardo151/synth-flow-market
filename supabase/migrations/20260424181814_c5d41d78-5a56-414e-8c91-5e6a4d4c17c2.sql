-- Reset total das conexões WhatsApp
DELETE FROM public.whatsapp_message_dedup;
DELETE FROM public.whatsapp_inbox_events;
DELETE FROM public.financial_whatsapp_logs;
DELETE FROM public.financial_whatsapp_authorized_numbers;
DELETE FROM public.bot_instances;
DELETE FROM public.evolution_instances;