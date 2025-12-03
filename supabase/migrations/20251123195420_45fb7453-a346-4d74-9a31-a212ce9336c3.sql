-- Tabelas para nodejs-payment-system com prefixo mp_

-- Tabela de produtos do sistema de pagamento
CREATE TABLE IF NOT EXISTS public.mp_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    rental_price DECIMAL(10, 2),
    category VARCHAR(100),
    images JSONB DEFAULT '[]',
    features JSONB DEFAULT '[]',
    in_stock BOOLEAN DEFAULT true,
    delivery VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de pedidos do sistema de pagamento
CREATE TABLE IF NOT EXISTS public.mp_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    total_amount DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    subtotal_amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de pagamentos
CREATE TABLE IF NOT EXISTS public.mp_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.mp_orders(id) ON DELETE CASCADE,
    mercadopago_payment_id VARCHAR(255) UNIQUE,
    preference_id VARCHAR(255),
    payment_type VARCHAR(50),
    payment_method VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    amount DECIMAL(10, 2) NOT NULL,
    payer_email VARCHAR(255),
    payer_name VARCHAR(255),
    proof_url TEXT,
    metadata JSONB DEFAULT '{}',
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de itens do pedido
CREATE TABLE IF NOT EXISTS public.mp_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.mp_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.mp_products(id) ON DELETE SET NULL,
    product_title VARCHAR(255) NOT NULL,
    product_slug VARCHAR(255) NOT NULL,
    product_price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de logs
CREATE TABLE IF NOT EXISTS public.mp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    source VARCHAR(50),
    order_id UUID REFERENCES public.mp_orders(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES public.mp_payments(id) ON DELETE SET NULL,
    data JSONB NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX idx_mp_orders_status ON public.mp_orders(status);
CREATE INDEX idx_mp_orders_created_at ON public.mp_orders(created_at DESC);
CREATE INDEX idx_mp_payments_status ON public.mp_payments(status);
CREATE INDEX idx_mp_payments_mercadopago_id ON public.mp_payments(mercadopago_payment_id);
CREATE INDEX idx_mp_payments_order_id ON public.mp_payments(order_id);
CREATE INDEX idx_mp_logs_event_type ON public.mp_logs(event_type);
CREATE INDEX idx_mp_logs_created_at ON public.mp_logs(created_at DESC);
CREATE INDEX idx_mp_products_slug ON public.mp_products(slug);

-- Função de trigger para updated_at
CREATE OR REPLACE FUNCTION update_mp_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_mp_products_updated_at 
    BEFORE UPDATE ON public.mp_products
    FOR EACH ROW EXECUTE FUNCTION update_mp_updated_at_column();

CREATE TRIGGER update_mp_orders_updated_at 
    BEFORE UPDATE ON public.mp_orders
    FOR EACH ROW EXECUTE FUNCTION update_mp_updated_at_column();

CREATE TRIGGER update_mp_payments_updated_at 
    BEFORE UPDATE ON public.mp_payments
    FOR EACH ROW EXECUTE FUNCTION update_mp_updated_at_column();

-- RLS Policies (desabilitado para permitir acesso do sistema externo)
ALTER TABLE public.mp_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mp_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mp_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mp_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mp_logs ENABLE ROW LEVEL SECURITY;

-- Policy para permitir todas as operações (o nodejs-payment-system usa service_role_key)
CREATE POLICY "Allow all operations on mp_products" ON public.mp_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on mp_orders" ON public.mp_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on mp_payments" ON public.mp_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on mp_order_items" ON public.mp_order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on mp_logs" ON public.mp_logs FOR ALL USING (true) WITH CHECK (true);