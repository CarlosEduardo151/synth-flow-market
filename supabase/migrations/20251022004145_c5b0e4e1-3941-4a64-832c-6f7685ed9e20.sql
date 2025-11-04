-- Criar tabela de hotéis
CREATE TABLE public.starapp_hotels (
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

-- Criar tabela de staff (funcionários/garçons)
CREATE TABLE public.starapp_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID NOT NULL REFERENCES public.starapp_hotels(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'garcom',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(hotel_id, email)
);

-- Criar tabela de cardápio
CREATE TABLE public.starapp_menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID NOT NULL REFERENCES public.starapp_hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de pulseiras NFC
CREATE TABLE public.starapp_nfc_bracelets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID NOT NULL REFERENCES public.starapp_hotels(id) ON DELETE CASCADE,
  nfc_id TEXT NOT NULL UNIQUE,
  guest_name TEXT NOT NULL,
  guest_cpf TEXT NOT NULL,
  room_number TEXT,
  check_in_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  check_out_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de pedidos
CREATE TABLE public.starapp_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID NOT NULL REFERENCES public.starapp_hotels(id) ON DELETE CASCADE,
  bracelet_id UUID NOT NULL REFERENCES public.starapp_nfc_bracelets(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.starapp_staff(id),
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'aberto',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de itens do pedido
CREATE TABLE public.starapp_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.starapp_orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.starapp_menu_items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.starapp_hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.starapp_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.starapp_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.starapp_nfc_bracelets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.starapp_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.starapp_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies para hotéis
CREATE POLICY "Admin principal pode gerenciar todos os hotéis"
  ON public.starapp_hotels
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.email = 'staraiofc@gmail.com'
    )
  );

CREATE POLICY "Admin do hotel pode ver seu hotel"
  ON public.starapp_hotels
  FOR SELECT
  USING (
    admin_email = (SELECT email FROM public.profiles WHERE user_id = auth.uid())
  );

-- RLS Policies para staff
CREATE POLICY "Admin e hotel podem gerenciar staff"
  ON public.starapp_staff
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND (
        profiles.email = 'staraiofc@gmail.com'
        OR profiles.email = (SELECT admin_email FROM public.starapp_hotels WHERE id = starapp_staff.hotel_id)
      )
    )
  );

CREATE POLICY "Staff pode ver seus dados"
  ON public.starapp_staff
  FOR SELECT
  USING (
    email = (SELECT email FROM public.profiles WHERE user_id = auth.uid())
  );

-- RLS Policies para cardápio
CREATE POLICY "Admin e hotel podem gerenciar cardápio"
  ON public.starapp_menu_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND (
        profiles.email = 'staraiofc@gmail.com'
        OR profiles.email = (SELECT admin_email FROM public.starapp_hotels WHERE id = starapp_menu_items.hotel_id)
      )
    )
  );

CREATE POLICY "Staff pode ver cardápio do seu hotel"
  ON public.starapp_menu_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.starapp_staff
      WHERE starapp_staff.hotel_id = starapp_menu_items.hotel_id
      AND starapp_staff.email = (SELECT email FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- RLS Policies para pulseiras NFC
CREATE POLICY "Admin e hotel podem gerenciar pulseiras"
  ON public.starapp_nfc_bracelets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND (
        profiles.email = 'staraiofc@gmail.com'
        OR profiles.email = (SELECT admin_email FROM public.starapp_hotels WHERE id = starapp_nfc_bracelets.hotel_id)
      )
    )
  );

CREATE POLICY "Staff pode ver pulseiras do seu hotel"
  ON public.starapp_nfc_bracelets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.starapp_staff
      WHERE starapp_staff.hotel_id = starapp_nfc_bracelets.hotel_id
      AND starapp_staff.email = (SELECT email FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- RLS Policies para pedidos
CREATE POLICY "Admin e hotel podem ver todos os pedidos"
  ON public.starapp_orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND (
        profiles.email = 'staraiofc@gmail.com'
        OR profiles.email = (SELECT admin_email FROM public.starapp_hotels WHERE id = starapp_orders.hotel_id)
      )
    )
  );

CREATE POLICY "Staff pode criar e ver pedidos do seu hotel"
  ON public.starapp_orders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.starapp_staff
      WHERE starapp_staff.hotel_id = starapp_orders.hotel_id
      AND starapp_staff.email = (SELECT email FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- RLS Policies para itens de pedido
CREATE POLICY "Usuários podem gerenciar itens de seus pedidos"
  ON public.starapp_order_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.starapp_orders o
      JOIN public.starapp_staff s ON s.hotel_id = o.hotel_id
      WHERE o.id = starapp_order_items.order_id
      AND (
        s.email = (SELECT email FROM public.profiles WHERE user_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid()
          AND (
            p.email = 'staraiofc@gmail.com'
            OR p.email = (SELECT admin_email FROM public.starapp_hotels WHERE id = o.hotel_id)
          )
        )
      )
    )
  );

-- Triggers para updated_at
CREATE TRIGGER update_starapp_hotels_updated_at
  BEFORE UPDATE ON public.starapp_hotels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_starapp_staff_updated_at
  BEFORE UPDATE ON public.starapp_staff
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_starapp_menu_items_updated_at
  BEFORE UPDATE ON public.starapp_menu_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_starapp_orders_updated_at
  BEFORE UPDATE ON public.starapp_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();