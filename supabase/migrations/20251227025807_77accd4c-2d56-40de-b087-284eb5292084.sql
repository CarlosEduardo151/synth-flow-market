-- Create admin_products table for product management
CREATE TABLE public.admin_products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    sale_price NUMERIC NOT NULL DEFAULT 0,
    cost_price NUMERIC NOT NULL DEFAULT 0,
    category TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin_crm_customers table for CRM management
CREATE TABLE public.admin_crm_customers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    cpf_cnpj TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    company TEXT,
    status TEXT NOT NULL DEFAULT 'lead',
    source TEXT,
    total_purchases NUMERIC NOT NULL DEFAULT 0,
    last_purchase_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create financial_transactions table for cash flow
CREATE TABLE public.financial_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL, -- 'income' or 'expense'
    amount NUMERIC NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    product_id UUID REFERENCES public.admin_products(id) ON DELETE SET NULL,
    payment_method TEXT,
    reference_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create box_balances table for 3 boxes system
CREATE TABLE public.box_balances (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    box_type TEXT NOT NULL, -- 'reinvestment', 'emergency', 'prolabore'
    balance NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(box_type)
);

-- Insert default box balances
INSERT INTO public.box_balances (box_type, balance) VALUES
    ('reinvestment', 0),
    ('emergency', 0),
    ('prolabore', 0);

-- Enable RLS on all tables
ALTER TABLE public.admin_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_crm_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.box_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_products (admin only)
CREATE POLICY "Admins can manage products" 
ON public.admin_products 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for admin_crm_customers (admin only)
CREATE POLICY "Admins can manage CRM customers" 
ON public.admin_crm_customers 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for financial_transactions (admin only)
CREATE POLICY "Admins can manage transactions" 
ON public.financial_transactions 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for box_balances (admin only)
CREATE POLICY "Admins can manage box balances" 
ON public.box_balances 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create triggers for updated_at
CREATE TRIGGER update_admin_products_updated_at
BEFORE UPDATE ON public.admin_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_crm_customers_updated_at
BEFORE UPDATE ON public.admin_crm_customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_transactions_updated_at
BEFORE UPDATE ON public.financial_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_box_balances_updated_at
BEFORE UPDATE ON public.box_balances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();