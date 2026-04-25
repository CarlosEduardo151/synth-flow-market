-- Consolidate WhatsApp instances for user 17d6d10c-548e-4534-ad77-59b1a9c6b733
-- WhatsApp/Baileys only allows one active session per phone number, so we
-- point every product (bots, CRM, financial) at the SAME Evolution instance
-- (the FINANCIAL one — the most recently confirmed "open" session).
UPDATE public.evolution_instances
   SET instance_name = 'staraiofc_gmail_com_FINANCIAL_91898399',
       updated_at = now()
 WHERE user_id = '17d6d10c-548e-4534-ad77-59b1a9c6b733'
   AND instance_name = 'staraiofc_gmail_com_BOT_91898399';

UPDATE public.product_credentials
   SET credential_value = 'staraiofc_gmail_com_FINANCIAL_91898399',
       updated_at = now()
 WHERE user_id = '17d6d10c-548e-4534-ad77-59b1a9c6b733'
   AND credential_key = 'evolution_instance_name'
   AND credential_value = 'staraiofc_gmail_com_BOT_91898399';