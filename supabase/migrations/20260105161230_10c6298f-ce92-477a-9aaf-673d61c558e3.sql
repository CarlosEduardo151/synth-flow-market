-- Create customer_products table for tracking purchased/rented products
CREATE TABLE public.customer_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_slug TEXT NOT NULL,
  product_title TEXT NOT NULL,
  acquisition_type TEXT NOT NULL DEFAULT 'purchase', -- 'purchase' or 'rental'
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  access_expires_at TIMESTAMP WITH TIME ZONE,
  download_count INTEGER DEFAULT 0,
  max_downloads INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  order_id UUID REFERENCES public.orders(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_products ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own products"
  ON public.customer_products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all products"
  ON public.customer_products FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create free_trials table
CREATE TABLE public.free_trials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_slug)
);

-- Enable RLS
ALTER TABLE public.free_trials ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own trials"
  ON public.free_trials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trials"
  ON public.free_trials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all trials"
  ON public.free_trials FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to update expired trials
CREATE OR REPLACE FUNCTION public.update_expired_trials()
RETURNS void AS $$
BEGIN
  UPDATE public.free_trials
  SET status = 'expired'
  WHERE status = 'active' AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;