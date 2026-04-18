DROP POLICY IF EXISTS "no client access oauth states" ON public.sa_oauth_states;

CREATE POLICY "deny select oauth states" ON public.sa_oauth_states FOR SELECT USING (false);
CREATE POLICY "deny insert oauth states" ON public.sa_oauth_states FOR INSERT WITH CHECK (false);
CREATE POLICY "deny update oauth states" ON public.sa_oauth_states FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "deny delete oauth states" ON public.sa_oauth_states FOR DELETE USING (false);