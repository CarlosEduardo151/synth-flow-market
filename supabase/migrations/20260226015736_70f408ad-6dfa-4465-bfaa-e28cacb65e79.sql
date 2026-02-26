
-- Create FAQ table for bots
CREATE TABLE public.bot_faq (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  category TEXT DEFAULT 'geral',
  is_active BOOLEAN NOT NULL DEFAULT true,
  hit_count INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bot_faq ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage bot_faq"
ON public.bot_faq FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can manage bot_faq"
ON public.bot_faq FOR ALL
USING (owns_customer_product(customer_product_id))
WITH CHECK (owns_customer_product(customer_product_id));

-- Index for fast keyword search
CREATE INDEX idx_bot_faq_keywords ON public.bot_faq USING GIN(keywords);
CREATE INDEX idx_bot_faq_customer_product ON public.bot_faq (customer_product_id, is_active);

-- Trigger for updated_at
CREATE TRIGGER update_bot_faq_updated_at
BEFORE UPDATE ON public.bot_faq
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
