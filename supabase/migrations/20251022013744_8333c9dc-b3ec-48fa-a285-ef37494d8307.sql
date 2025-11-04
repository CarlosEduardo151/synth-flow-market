-- Criar tabela de hotéis se não existir
CREATE TABLE IF NOT EXISTS public.starapp_hotels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.starapp_hotels ENABLE ROW LEVEL SECURITY;

-- Política: Administradores principais podem gerenciar todos os hotéis
CREATE POLICY "Admin principal pode gerenciar hotéis"
ON public.starapp_hotels
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND (profiles.email = 'staraiofc@gmail.com' OR profiles.email = 'caduxim0@gmail.com')
  )
);

-- Política: Dono do hotel pode ver e editar seu próprio hotel
CREATE POLICY "Dono do hotel pode ver e editar seu hotel"
ON public.starapp_hotels
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.email = starapp_hotels.admin_email
  )
);

-- Política: Staff pode ver dados do hotel onde trabalha
CREATE POLICY "Staff pode ver dados do hotel"
ON public.starapp_hotels
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM starapp_staff
    WHERE starapp_staff.hotel_id = starapp_hotels.id
    AND starapp_staff.email = (
      SELECT profiles.email FROM profiles
      WHERE profiles.user_id = auth.uid()
    )
  )
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_starapp_hotels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_starapp_hotels_timestamp
BEFORE UPDATE ON public.starapp_hotels
FOR EACH ROW
EXECUTE FUNCTION update_starapp_hotels_updated_at();