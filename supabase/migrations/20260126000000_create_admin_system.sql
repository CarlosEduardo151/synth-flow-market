 -- ===================================================
 -- MIGRAÇÃO: Sistema de Admin e Roles
 -- Cria estrutura básica para gerenciamento de roles
 -- ===================================================
 
 -- 1. Criar enum de roles (se não existir)
 DO $$ BEGIN
   CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
 EXCEPTION
   WHEN duplicate_object THEN NULL;
 END $$;
 
 -- 2. Criar tabela user_roles (se não existir)
 CREATE TABLE IF NOT EXISTS public.user_roles (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
   role app_role NOT NULL DEFAULT 'user',
   created_at TIMESTAMPTZ DEFAULT NOW(),
   UNIQUE(user_id, role)
 );
 
 -- 3. Habilitar RLS
 ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
 
 -- 4. Criar função has_role (substitui se já existir)
 CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
 RETURNS BOOLEAN
 LANGUAGE SQL
 STABLE
 SECURITY DEFINER
 SET search_path = public
 AS $$
   SELECT EXISTS (
     SELECT 1
     FROM public.user_roles
     WHERE user_id = _user_id AND role = _role
   )
 $$;
 
 -- 5. Remover políticas antigas (se existirem)
 DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
 DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
 DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
 
 -- 6. Criar políticas RLS
 CREATE POLICY "Users can view own roles" ON public.user_roles
   FOR SELECT USING (auth.uid() = user_id);
 
 CREATE POLICY "Admins can view all roles" ON public.user_roles
   FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
 
 CREATE POLICY "Admins can manage all roles" ON public.user_roles
   FOR ALL USING (public.has_role(auth.uid(), 'admin'));
 
 -- 7. TORNAR caduxim0@gmail.com ADMIN
 -- (Isso só funciona se o usuário já estiver cadastrado)
 INSERT INTO public.user_roles (user_id, role)
 SELECT id, 'admin'::app_role
 FROM auth.users
 WHERE email = 'caduxim0@gmail.com'
 ON CONFLICT (user_id, role) 
 DO UPDATE SET role = 'admin'::app_role;
 
 -- ===================================================
 -- MIGRAÇÃO COMPLETA
 -- Após executar, caduxim0@gmail.com terá role de admin
 -- ===================================================