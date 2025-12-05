-- Adicionar coluna para armazenar o workflow_id do n8n no customer_products
ALTER TABLE public.customer_products 
ADD COLUMN IF NOT EXISTS n8n_workflow_id text;

-- Criar índice para busca rápida por workflow_id
CREATE INDEX IF NOT EXISTS idx_customer_products_n8n_workflow_id 
ON public.customer_products(n8n_workflow_id);