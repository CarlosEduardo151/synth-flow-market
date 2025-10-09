-- Criar tabela de parcelas
CREATE TABLE IF NOT EXISTS public.order_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  installment_number INTEGER NOT NULL,
  total_installments INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT order_installments_status_check CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled'))
);

-- Enable RLS
ALTER TABLE public.order_installments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own installments"
ON public.order_installments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_installments.order_id
    AND orders.user_id = auth.uid()
  )
  OR is_admin(auth.uid())
);

CREATE POLICY "Users can create installments for their orders"
ON public.order_installments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_installments.order_id
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own installments"
ON public.order_installments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_installments.order_id
    AND orders.user_id = auth.uid()
  )
  OR is_admin(auth.uid())
);

-- Add installments column to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS installment_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS installment_value INTEGER;

-- Create function to update installment status automatically
CREATE OR REPLACE FUNCTION public.update_installment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if installment is overdue
  IF NEW.status = 'pending' AND NEW.due_date < now() THEN
    NEW.status := 'overdue';
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic status updates
DROP TRIGGER IF EXISTS update_installment_status_trigger ON public.order_installments;
CREATE TRIGGER update_installment_status_trigger
BEFORE INSERT OR UPDATE ON public.order_installments
FOR EACH ROW
EXECUTE FUNCTION public.update_installment_status();