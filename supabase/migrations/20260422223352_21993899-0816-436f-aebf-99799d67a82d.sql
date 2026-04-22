-- Tornar 2FA por email obrigatório para todos os usuários
-- 1) Ativar 2FA para todos os usuários existentes (upsert)
INSERT INTO public.user_mfa_settings (user_id, is_enabled, trusted_device_days)
SELECT u.id, true, 30
FROM auth.users u
ON CONFLICT (user_id) DO UPDATE SET is_enabled = true;

-- 2) Trigger para ativar 2FA automaticamente em novos cadastros
CREATE OR REPLACE FUNCTION public.handle_new_user_enable_mfa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_mfa_settings (user_id, is_enabled, trusted_device_days)
  VALUES (NEW.id, true, 30)
  ON CONFLICT (user_id) DO UPDATE SET is_enabled = true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_enable_mfa ON auth.users;
CREATE TRIGGER on_auth_user_created_enable_mfa
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_enable_mfa();