-- Adicionar caduxim0@gmail.com como administrador
INSERT INTO public.user_roles (user_id, role)
VALUES ('9778ed68-7165-45e2-a495-8c2425246cbe', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;