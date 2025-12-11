-- Tornar customer_product_id nullable para permitir monitoramento de workflows não vinculados
ALTER TABLE ai_token_usage ALTER COLUMN customer_product_id DROP NOT NULL;