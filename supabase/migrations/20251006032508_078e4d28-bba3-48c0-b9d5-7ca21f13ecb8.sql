-- Criar enum para tipo de aquisição
CREATE TYPE acquisition_type AS ENUM ('purchase', 'rental');

-- Criar enum para tipos de credenciais
CREATE TYPE credential_type AS ENUM (
  'openai_api_key',
  'facebook_graph_api',
  'instagram_graph_api',
  'whatsapp_api',
  'discord_bot_token',
  'telegram_bot_api',
  'database_connection',
  'google_sheets_api',
  'erp_api',
  'pix_credentials',
  'payment_gateway',
  'zapi_credentials',
  'smtp_credentials',
  'other'
);

-- Adicionar campos à tabela customer_products
ALTER TABLE customer_products 
ADD COLUMN acquisition_type acquisition_type NOT NULL DEFAULT 'purchase',
ADD COLUMN rental_start_date timestamp with time zone,
ADD COLUMN rental_end_date timestamp with time zone,
ADD COLUMN rental_payment_status text DEFAULT 'active',
ADD COLUMN monthly_rental_price integer,
ADD COLUMN auto_renew boolean DEFAULT false;

-- Criar tabela para armazenar credenciais dos produtos
CREATE TABLE product_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id uuid REFERENCES customer_products(id) ON DELETE CASCADE NOT NULL,
  credential_type credential_type NOT NULL,
  credential_name text NOT NULL,
  credential_value text, -- Para ser preenchido pelo cliente
  is_system_generated boolean DEFAULT false,
  is_active boolean DEFAULT true,
  n8n_doc_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE product_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies para product_credentials
CREATE POLICY "Users can view their own product credentials"
ON product_credentials FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM customer_products
    WHERE customer_products.id = product_credentials.customer_product_id
    AND customer_products.user_id = auth.uid()
  )
  OR is_admin(auth.uid())
);

CREATE POLICY "Users can update their own product credentials"
ON product_credentials FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM customer_products
    WHERE customer_products.id = product_credentials.customer_product_id
    AND customer_products.user_id = auth.uid()
  )
  OR is_admin(auth.uid())
);

CREATE POLICY "System can create product credentials"
ON product_credentials FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM customer_products
    WHERE customer_products.id = product_credentials.customer_product_id
    AND customer_products.user_id = auth.uid()
  )
  OR is_admin(auth.uid())
);

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_product_credentials_updated_at
BEFORE UPDATE ON product_credentials
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Criar tabela para definir quais credenciais cada produto precisa
CREATE TABLE product_required_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_slug text NOT NULL,
  credential_type credential_type NOT NULL,
  credential_name text NOT NULL,
  is_required boolean DEFAULT true,
  description text,
  n8n_doc_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS (todos podem ver as credenciais necessárias)
ALTER TABLE product_required_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view required credentials"
ON product_required_credentials FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage required credentials"
ON product_required_credentials FOR ALL
USING (is_admin(auth.uid()));

-- Criar índices para performance
CREATE INDEX idx_product_credentials_customer_product 
ON product_credentials(customer_product_id);

CREATE INDEX idx_product_credentials_type 
ON product_credentials(credential_type);

CREATE INDEX idx_customer_products_acquisition_type 
ON customer_products(acquisition_type);

CREATE INDEX idx_customer_products_rental_end_date 
ON customer_products(rental_end_date)
WHERE acquisition_type = 'rental';