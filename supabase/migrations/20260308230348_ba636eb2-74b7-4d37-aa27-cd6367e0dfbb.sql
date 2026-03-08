-- Add workshop_id to fleet_service_orders so we know which workshop handles each SO
ALTER TABLE public.fleet_service_orders
  ADD COLUMN IF NOT EXISTS workshop_id uuid REFERENCES public.fleet_partner_workshops(id) ON DELETE SET NULL;

-- Add RLS policy so workshops can see/manage SOs assigned to them
CREATE POLICY "Workshops can manage assigned service orders"
  ON public.fleet_service_orders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fleet_partner_workshops w
      WHERE w.id = fleet_service_orders.workshop_id
        AND w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.fleet_partner_workshops w
      WHERE w.id = fleet_service_orders.workshop_id
        AND w.user_id = auth.uid()
    )
  );

-- Allow workshops to read vehicles from any fleet (for placa search)
CREATE POLICY "Workshops can read fleet vehicles"
  ON public.fleet_vehicles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fleet_partner_workshops w
      WHERE w.user_id = auth.uid()
        AND w.status = 'aprovado'
    )
  );

-- Allow workshops to manage budgets for their assigned service orders
CREATE POLICY "Workshops can manage budgets via assigned SO"
  ON public.fleet_budgets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fleet_service_orders so
      JOIN public.fleet_partner_workshops w ON w.id = so.workshop_id
      WHERE so.id = fleet_budgets.service_order_id
        AND w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.fleet_service_orders so
      JOIN public.fleet_partner_workshops w ON w.id = so.workshop_id
      WHERE so.id = fleet_budgets.service_order_id
        AND w.user_id = auth.uid()
    )
  );

-- Allow workshops to manage budget items via their assigned SO
CREATE POLICY "Workshops can manage budget items via assigned SO"
  ON public.fleet_budget_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fleet_budget_items bi
      JOIN public.fleet_budgets b ON b.id = bi.budget_id
      JOIN public.fleet_service_orders so ON so.id = b.service_order_id
      JOIN public.fleet_partner_workshops w ON w.id = so.workshop_id
      WHERE w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.fleet_budgets b
      JOIN public.fleet_service_orders so ON so.id = b.service_order_id
      JOIN public.fleet_partner_workshops w ON w.id = so.workshop_id
      WHERE b.id = fleet_budget_items.budget_id
        AND w.user_id = auth.uid()
    )
  );

-- Allow workshops to read/insert stage history for their assigned SOs
CREATE POLICY "Workshops can manage stage history via assigned SO"
  ON public.fleet_stage_history
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fleet_service_orders so
      JOIN public.fleet_partner_workshops w ON w.id = so.workshop_id
      WHERE so.id = fleet_stage_history.service_order_id
        AND w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.fleet_service_orders so
      JOIN public.fleet_partner_workshops w ON w.id = so.workshop_id
      WHERE so.id = fleet_stage_history.service_order_id
        AND w.user_id = auth.uid()
    )
  );