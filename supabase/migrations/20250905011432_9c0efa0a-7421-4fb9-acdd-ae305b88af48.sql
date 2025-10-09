-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('admin', 'customer');

-- Add role column to profiles table
ALTER TABLE public.profiles ADD COLUMN role public.user_role NOT NULL DEFAULT 'customer';

-- Create tickets table
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ticket messages table
CREATE TABLE public.ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_admin_reply BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value INTEGER NOT NULL, -- For percentage: value/100, for fixed: value in cents
  min_order_amount INTEGER, -- Minimum order amount in cents
  max_uses INTEGER, -- Maximum number of uses (null = unlimited)
  used_count INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create coupon usages table
CREATE TABLE public.coupon_usages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discount_amount INTEGER NOT NULL, -- Amount saved in cents
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customer reviews table
CREATE TABLE public.customer_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  review_text TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  customer_photo_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add discount fields to orders table
ALTER TABLE public.orders ADD COLUMN coupon_id UUID REFERENCES public.coupons(id);
ALTER TABLE public.orders ADD COLUMN discount_amount INTEGER DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN subtotal_amount INTEGER NOT NULL DEFAULT 0;

-- Enable RLS for new tables
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = is_admin.user_id 
    AND profiles.role = 'admin'
  );
$$;

-- RLS Policies for tickets
CREATE POLICY "Users can view their own tickets" ON public.tickets
FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can create their own tickets" ON public.tickets
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update tickets" ON public.tickets
FOR UPDATE USING (public.is_admin(auth.uid()));

-- RLS Policies for ticket messages
CREATE POLICY "Users can view messages for their tickets" ON public.ticket_messages
FOR SELECT USING (
  auth.uid() = user_id OR 
  public.is_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.tickets WHERE tickets.id = ticket_messages.ticket_id AND tickets.user_id = auth.uid())
);

CREATE POLICY "Users can create messages for their tickets" ON public.ticket_messages
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  (EXISTS (SELECT 1 FROM public.tickets WHERE tickets.id = ticket_messages.ticket_id AND tickets.user_id = auth.uid()) OR
   public.is_admin(auth.uid()))
);

-- RLS Policies for coupons
CREATE POLICY "Everyone can view active coupons" ON public.coupons
FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can manage coupons" ON public.coupons
FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for coupon usages
CREATE POLICY "Users can view their own coupon usages" ON public.coupon_usages
FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can create coupon usages for their orders" ON public.coupon_usages
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for customer reviews
CREATE POLICY "Everyone can view featured reviews" ON public.customer_reviews
FOR SELECT USING (is_featured = true);

CREATE POLICY "Only admins can manage reviews" ON public.customer_reviews
FOR ALL USING (public.is_admin(auth.uid()));

-- Update profiles policies to allow admin access
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view profiles" ON public.profiles
FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Update orders policies to allow admin access
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view orders" ON public.orders
FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
CREATE POLICY "Users can update orders" ON public.orders
FOR UPDATE USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Create triggers for timestamp updates
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_reviews_updated_at
  BEFORE UPDATE ON public.customer_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default admin user (will be created when someone signs up with this email)
INSERT INTO public.customer_reviews (customer_name, review_text, rating, display_order) VALUES
('Ana Silva', 'Excelente atendimento e produtos de qualidade! Recomendo muito.', 5, 1),
('Carlos Santos', 'Entrega rápida e produto exatamente como descrito. Muito satisfeito!', 5, 2),
('Mariana Costa', 'Ótima experiência de compra. Suporte muito atencioso.', 4, 3);