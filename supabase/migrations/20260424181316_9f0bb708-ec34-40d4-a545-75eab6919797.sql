-- Remove instâncias _CRM e _FIN do número 9991300202 (staraiofc_gmail_com).
-- Estas foram deletadas manualmente do painel da Evolution.
-- O fan-out do whatsapp-ingest cuida de distribuir mensagens para CRM e Financeiro
-- a partir da instância única 'staraiofc_gmail_com' (bots-automacao).

DELETE FROM public.evolution_instances
WHERE instance_name IN ('staraiofc_gmail_com_CRM', 'staraiofc_gmail_com_FIN');

-- Limpa o cache de deduplicação para permitir testes limpos
DELETE FROM public.whatsapp_message_dedup
WHERE expires_at < now() OR scope IN ('ingest', 'usermsg');