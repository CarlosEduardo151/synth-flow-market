-- Create database
CREATE DATABASE payment_system;

-- Connect to database
\c payment_system;

-- Create products table
CREATE TABLE IF NOT EXISTS products (
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

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    total_amount DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    subtotal_amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50), -- 'mercadopago' or 'semi-auto'
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, cancelled
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    mercadopago_payment_id VARCHAR(255) UNIQUE,
    preference_id VARCHAR(255),
    payment_type VARCHAR(50), -- 'automatic' (mercadopago) or 'semi-auto' (pix)
    payment_method VARCHAR(50), -- credit_card, debit_card, pix, etc
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, refunded
    amount DECIMAL(10, 2) NOT NULL,
    payer_email VARCHAR(255),
    payer_name VARCHAR(255),
    proof_url TEXT, -- Para pagamento semi-automático
    metadata JSONB DEFAULT '{}',
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_title VARCHAR(255) NOT NULL,
    product_slug VARCHAR(255) NOT NULL,
    product_price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create logs table
CREATE TABLE IF NOT EXISTS logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL, -- webhook, payment_created, payment_approved, etc
    source VARCHAR(50), -- mercadopago, semi-auto, system
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    data JSONB NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_mercadopago_id ON payments(mercadopago_payment_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_logs_event_type ON logs(event_type);
CREATE INDEX idx_logs_created_at ON logs(created_at DESC);
CREATE INDEX idx_products_slug ON products(slug);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample products (optional)
INSERT INTO products (title, slug, description, price, category, in_stock) VALUES
('CRM Simples', 'crm-simples', 'Sistema CRM completo para micro empresas', 20000, 'micro-empresas', true),
('Dashboards Personalizados', 'dashboards-personalizados', 'Dashboards personalizados com métricas em tempo real', 30000, 'micro-empresas', true),
('Fidelidade Digital', 'fidelidade-digital', 'Sistema de fidelidade com pontos e recompensas', 25000, 'micro-empresas', true);
