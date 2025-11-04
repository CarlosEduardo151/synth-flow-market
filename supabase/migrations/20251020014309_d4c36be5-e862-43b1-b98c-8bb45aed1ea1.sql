-- Add webhook_token column to customer_products for unique endpoints
ALTER TABLE customer_products 
ADD COLUMN IF NOT EXISTS webhook_token TEXT UNIQUE;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_customer_products_webhook_token 
ON customer_products(webhook_token);

-- Generate unique tokens for existing products (only for financial reports)
UPDATE customer_products 
SET webhook_token = gen_random_uuid()::text
WHERE product_slug = 'relatorios-financeiros' 
AND webhook_token IS NULL;