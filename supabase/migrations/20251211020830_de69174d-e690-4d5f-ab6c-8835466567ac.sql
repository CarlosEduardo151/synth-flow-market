-- Inserir uso de tokens que o usuário já consumiu
INSERT INTO public.ai_token_usage (customer_product_id, date, tokens_used, requests_count, model_used)
VALUES ('035372d7-55cf-4ee4-9927-88bd15641e61', CURRENT_DATE, 16, 1, 'gpt-4o-mini')
ON CONFLICT (customer_product_id, date) 
DO UPDATE SET 
  tokens_used = ai_token_usage.tokens_used + EXCLUDED.tokens_used, 
  requests_count = ai_token_usage.requests_count + 1;