-- Adicionar campo business_name na tabela ai_control_config
ALTER TABLE public.ai_control_config 
ADD COLUMN IF NOT EXISTS business_name TEXT DEFAULT 'Meu Negócio';

-- Comentário para documentação
COMMENT ON COLUMN public.ai_control_config.business_name IS 'Nome personalizado do negócio/bot do cliente';