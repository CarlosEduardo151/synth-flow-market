-- Adicionar campos de integração n8n na tabela collection_settings
ALTER TABLE collection_settings
ADD COLUMN IF NOT EXISTS n8n_webhook_url text,
ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'template' CHECK (message_type IN ('template', 'ai')),
ADD COLUMN IF NOT EXISTS template_message text DEFAULT 'Olá {nome}, você tem uma cobrança de R$ {valor} vencendo em {data}. Clique no link para pagar: {link_pagamento}';

-- Adicionar campo para link de pagamento nas invoices
ALTER TABLE billing_invoices
ADD COLUMN IF NOT EXISTS payment_link text;