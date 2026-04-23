DROP POLICY IF EXISTS "Workshops can read fleet vehicles" ON public.fleet_vehicles;

CREATE POLICY "Workshops can read assigned fleet vehicles"
ON public.fleet_vehicles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.fleet_service_orders so
    JOIN public.fleet_partner_workshops w ON w.id = so.workshop_id
    WHERE so.vehicle_id = fleet_vehicles.id
      AND w.user_id = auth.uid()
      AND w.status = 'aprovado'
  )
);