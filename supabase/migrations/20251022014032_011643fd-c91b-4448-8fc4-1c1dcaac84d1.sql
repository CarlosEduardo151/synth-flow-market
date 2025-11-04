-- Listar e remover TODAS as políticas da tabela starapp_hotels
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'starapp_hotels') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.starapp_hotels';
    END LOOP;
END $$;

-- Criar função security definer para verificar se é admin do StarAPP
CREATE OR REPLACE FUNCTION public.is_starapp_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
    AND email IN ('staraiofc@gmail.com', 'caduxim0@gmail.com')
  )
$$;

-- Criar função security definer para verificar se é dono do hotel
CREATE OR REPLACE FUNCTION public.is_hotel_owner(_user_id uuid, _admin_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
    AND email = _admin_email
  )
$$;

-- Criar função security definer para verificar se é staff do hotel
CREATE OR REPLACE FUNCTION public.is_hotel_staff(_user_id uuid, _hotel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.starapp_staff ss
    JOIN public.profiles p ON ss.email = p.email
    WHERE p.user_id = _user_id
    AND ss.hotel_id = _hotel_id
  )
$$;

-- Recriar políticas usando as funções
CREATE POLICY "Admin principal pode gerenciar todos os hotéis"
ON public.starapp_hotels
FOR ALL
USING (public.is_starapp_admin(auth.uid()));

CREATE POLICY "Dono pode ver e editar seu hotel"
ON public.starapp_hotels
FOR SELECT
USING (public.is_hotel_owner(auth.uid(), admin_email));

CREATE POLICY "Staff pode ver hotel onde trabalha"
ON public.starapp_hotels
FOR SELECT
USING (public.is_hotel_staff(auth.uid(), id));