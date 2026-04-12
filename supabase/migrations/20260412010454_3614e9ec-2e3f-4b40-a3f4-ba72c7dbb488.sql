
CREATE TABLE public.crm_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_product_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  business_type TEXT,
  status TEXT NOT NULL DEFAULT 'lead',
  notes TEXT,
  last_contact_date TIMESTAMP WITH TIME ZONE,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_product_id, phone)
);

ALTER TABLE public.crm_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage crm_customers"
ON public.crm_customers FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can manage crm_customers"
ON public.crm_customers FOR ALL
TO authenticated
USING (owns_customer_product(customer_product_id))
WITH CHECK (owns_customer_product(customer_product_id));

CREATE TRIGGER update_crm_customers_updated_at
BEFORE UPDATE ON public.crm_customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
