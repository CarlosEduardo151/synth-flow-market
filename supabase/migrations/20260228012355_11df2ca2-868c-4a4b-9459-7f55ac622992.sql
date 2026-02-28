-- Delete stage history for the Hilux ABC order
DELETE FROM fleet_stage_history WHERE service_order_id = '99149c8a-90b5-48f3-8300-06a2bf471291';

-- Delete the service order itself
DELETE FROM fleet_service_orders WHERE id = '99149c8a-90b5-48f3-8300-06a2bf471291';

-- Set the vehicle back to available
UPDATE fleet_vehicles SET status = 'disponivel' WHERE id = 'e2a65e4c-0fb4-4d10-b7f9-c5cb2b6690a1';
