-- Limpar dados transacionais mantendo estruturas e configurações importantes

-- Limpar tickets e mensagens
DELETE FROM ticket_messages;
DELETE FROM tickets;

-- Limpar dados de CRM
DELETE FROM crm_interactions;
DELETE FROM crm_customers;

-- Limpar dados de faturamento/cobrança
DELETE FROM billing_invoices;
DELETE FROM billing_clients;
DELETE FROM collection_settings;

-- Limpar landing pages e leads
DELETE FROM landing_page_leads;
DELETE FROM user_landing_pages;

-- Limpar posts sociais
DELETE FROM social_posts;

-- Limpar dashboards
DELETE FROM dashboard_data;
DELETE FROM dashboard_configs;

-- Limpar registros financeiros
DELETE FROM financial_records;

-- Limpar uso de cupons
DELETE FROM coupon_usages;

-- Limpar parcelas de pedidos
DELETE FROM order_installments;

-- Limpar itens de pedidos
DELETE FROM order_items;

-- Limpar pedidos
DELETE FROM orders;

-- Limpar credenciais de produtos
DELETE FROM product_credentials;

-- Limpar produtos dos clientes
DELETE FROM customer_products;

-- Limpar leads e mensagens do WhatsApp
DELETE FROM whatsapp_messages;
DELETE FROM whatsapp_leads;

-- Limpar conexões Z-API
DELETE FROM zapi_connections;

-- Resetar contador de uso de cupons
UPDATE coupons SET used_count = 0;

-- Resetar visualizações e conversões de notificações
UPDATE persistent_notifications SET view_count = 0, is_active = true;

-- Limpar avaliações de clientes (opcional - descomente se quiser manter)
DELETE FROM customer_reviews;