-- Move vehicles to the correct customer_product_id (THERMOCAR user)
UPDATE public.fleet_vehicles
SET customer_product_id = 'b7fd30f9-a93d-43e1-85a3-10c8d5097551'
WHERE customer_product_id = '97c64f02-85cd-4e89-a048-9eec93fa3f65';

-- Move service orders
UPDATE public.fleet_service_orders
SET customer_product_id = 'b7fd30f9-a93d-43e1-85a3-10c8d5097551'
WHERE customer_product_id = '97c64f02-85cd-4e89-a048-9eec93fa3f65';

-- Move budgets
UPDATE public.fleet_budgets
SET customer_product_id = 'b7fd30f9-a93d-43e1-85a3-10c8d5097551'
WHERE customer_product_id = '97c64f02-85cd-4e89-a048-9eec93fa3f65';

-- Move stage history (linked via service orders, no direct cp_id)
-- Move messages
UPDATE public.fleet_messages
SET customer_product_id = 'b7fd30f9-a93d-43e1-85a3-10c8d5097551'
WHERE customer_product_id = '97c64f02-85cd-4e89-a048-9eec93fa3f65';

-- Move calls
UPDATE public.fleet_calls
SET customer_product_id = 'b7fd30f9-a93d-43e1-85a3-10c8d5097551'
WHERE customer_product_id = '97c64f02-85cd-4e89-a048-9eec93fa3f65';