-- Criar tabela de produtos entregues aos clientes
CREATE TABLE public.customer_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id UUID NOT NULL,
  product_slug TEXT NOT NULL,
  product_title TEXT NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  download_count INTEGER NOT NULL DEFAULT 0,
  max_downloads INTEGER DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT true,
  access_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.customer_products ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own products" 
ON public.customer_products 
FOR SELECT 
USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Users can create their own product entries" 
ON public.customer_products 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" 
ON public.customer_products 
FOR UPDATE 
USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_customer_products_updated_at
BEFORE UPDATE ON public.customer_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();