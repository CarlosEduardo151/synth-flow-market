UPDATE public.evolution_instances
   SET is_active = false,
       connection_state = 'wiped',
       reconnect_attempts = 0,
       next_reconnect_at = NULL,
       last_reconnect_error = 'server_wiped',
       updated_at = now()
 WHERE is_active = true;