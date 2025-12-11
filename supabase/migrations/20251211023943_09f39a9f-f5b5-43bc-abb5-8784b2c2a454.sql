-- Adicionar coluna n8n_workflow_id à tabela ai_token_usage
ALTER TABLE public.ai_token_usage 
ADD COLUMN n8n_workflow_id TEXT;

-- Criar índice para consultas por workflow
CREATE INDEX idx_ai_token_usage_workflow ON public.ai_token_usage(n8n_workflow_id);

-- Atualizar registros existentes com o workflow_id do customer_product (se existir)
UPDATE public.ai_token_usage atu
SET n8n_workflow_id = cp.n8n_workflow_id
FROM public.customer_products cp
WHERE atu.customer_product_id = cp.id
AND cp.n8n_workflow_id IS NOT NULL;