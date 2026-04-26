UPDATE public.evolution_instances
SET is_active = false,
    connection_state = 'logged_out',
    reconnect_attempts = 0,
    next_reconnect_at = NULL,
    last_reconnect_error = 'whatsapp_session_revoked_401',
    updated_at = now()
WHERE instance_name = 'staraiofc_gmail_com_WA_91898399';