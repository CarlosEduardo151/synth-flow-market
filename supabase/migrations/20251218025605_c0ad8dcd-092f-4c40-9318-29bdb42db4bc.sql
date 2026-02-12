-- Remove old constraint and add new one with 'api' value
ALTER TABLE financial_agent_transactions DROP CONSTRAINT IF EXISTS financial_agent_transactions_source_check;
ALTER TABLE financial_agent_transactions ADD CONSTRAINT financial_agent_transactions_source_check CHECK (source = ANY (ARRAY['manual'::text, 'chatbot'::text, 'import'::text, 'api'::text]));