-- Expand profiles table with more customer data
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- Add payment proof field to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

-- Update admin accounts
UPDATE public.profiles SET role = 'admin' WHERE email IN ('admin@loja.com', 'caduxim0@gmail.com');

-- Insert admin profiles if they don't exist
INSERT INTO public.profiles (user_id, email, full_name, role) 
SELECT gen_random_uuid(), 'admin@loja.com', 'Administrador', 'admin'::user_role 
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'admin@loja.com');

INSERT INTO public.profiles (user_id, email, full_name, role) 
SELECT gen_random_uuid(), 'caduxim0@gmail.com', 'Administrador', 'admin'::user_role 
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'caduxim0@gmail.com');