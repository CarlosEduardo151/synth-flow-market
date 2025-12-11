-- Tabela para armazenar compras de créditos StarAI
CREATE TABLE public.starai_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  amount_brl NUMERIC NOT NULL,
  payment_id TEXT,
  mercadopago_payment_id TEXT,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.starai_purchases ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own purchases"
ON public.starai_purchases
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases"
ON public.starai_purchases
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "System can insert purchases"
ON public.starai_purchases
FOR INSERT
WITH CHECK (true);

-- Index for faster queries
CREATE INDEX idx_starai_purchases_user_id ON public.starai_purchases(user_id);
CREATE INDEX idx_starai_purchases_created_at ON public.starai_purchases(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_starai_purchases_updated_at
BEFORE UPDATE ON public.starai_purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();