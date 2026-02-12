-- Permitir que admins vejam perfis (necessário para disparo de campanhas)
-- Mantém privacidade: usuários comuns continuam vendo apenas o próprio perfil.

-- Garantir RLS ligado (idempotente)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: usuário pode ver o próprio perfil
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Profiles: user can read own profile'
  ) THEN
    CREATE POLICY "Profiles: user can read own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END$$;

-- Policy: admin pode ver todos os perfis (inclui email/phone)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Profiles: admin can read all'
  ) THEN
    CREATE POLICY "Profiles: admin can read all"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END$$;
