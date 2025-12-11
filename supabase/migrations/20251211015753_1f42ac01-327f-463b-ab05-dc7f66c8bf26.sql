-- Tabela para armazenar uso de tokens por período
CREATE TABLE public.ai_token_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL REFERENCES public.customer_products(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  requests_count INTEGER NOT NULL DEFAULT 0,
  model_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_product_id, date)
);

-- Enable RLS
ALTER TABLE public.ai_token_usage ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own usage
CREATE POLICY "Users can view their own token usage"
ON public.ai_token_usage
FOR SELECT
USING (
  customer_product_id IN (
    SELECT id FROM customer_products WHERE user_id = auth.uid()
  )
);

-- Policy for system to insert/update usage
CREATE POLICY "System can manage token usage"
ON public.ai_token_usage
FOR ALL
USING (true)
WITH CHECK (true);

-- Index for faster queries
CREATE INDEX idx_ai_token_usage_customer_date ON public.ai_token_usage(customer_product_id, date);

-- Trigger for updated_at
CREATE TRIGGER update_ai_token_usage_updated_at
  BEFORE UPDATE ON public.ai_token_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();