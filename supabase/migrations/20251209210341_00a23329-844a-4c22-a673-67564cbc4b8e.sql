-- Insert the missing customer product for the completed order
INSERT INTO customer_products (user_id, order_id, product_slug, product_title, acquisition_type, is_active, download_count, max_downloads)
VALUES ('6e90e4fc-a56e-475e-a404-bcc0ba00d1be', 'cc870f17-092f-4b23-a8de-ecc3a8d5c854', 'assistente-vendas', 'Assistente de Vendas com IA', 'purchase', true, 0, 3)
ON CONFLICT DO NOTHING;