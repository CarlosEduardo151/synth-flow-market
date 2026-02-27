
-- Veículos da frota (isolados por customer_product_id)
CREATE TABLE public.fleet_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id uuid NOT NULL,
  placa text NOT NULL,
  marca text,
  modelo text,
  cor text,
  ano text,
  chassi text,
  renavam text,
  combustivel text,
  potencia text,
  ano_fabricacao text,
  ano_modelo text,
  foto_url text,
  status text NOT NULL DEFAULT 'disponivel',
  km_atual integer DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(customer_product_id, placa)
);

ALTER TABLE public.fleet_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fleet_vehicles"
  ON public.fleet_vehicles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can manage fleet_vehicles"
  ON public.fleet_vehicles FOR ALL
  USING (owns_customer_product(customer_product_id))
  WITH CHECK (owns_customer_product(customer_product_id));

-- Ordens de serviço com pipeline de 6 etapas
CREATE TABLE public.fleet_service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_product_id uuid NOT NULL,
  vehicle_id uuid NOT NULL REFERENCES public.fleet_vehicles(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'checkin',
  oficina_nome text,
  descricao_servico text,
  valor_orcamento numeric,
  valor_aprovado numeric,
  data_entrada timestamptz DEFAULT now(),
  data_previsao_entrega timestamptz,
  data_finalizacao timestamptz,
  data_entrega timestamptz,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fleet_service_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fleet_service_orders"
  ON public.fleet_service_orders FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can manage fleet_service_orders"
  ON public.fleet_service_orders FOR ALL
  USING (owns_customer_product(customer_product_id))
  WITH CHECK (owns_customer_product(customer_product_id));

-- Histórico de mudanças de etapa
CREATE TABLE public.fleet_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES public.fleet_service_orders(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  changed_by text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fleet_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fleet_stage_history"
  ON public.fleet_stage_history FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can view fleet_stage_history"
  ON public.fleet_stage_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.fleet_service_orders so
    WHERE so.id = fleet_stage_history.service_order_id
    AND owns_customer_product(so.customer_product_id)
  ));

CREATE POLICY "Owners can insert fleet_stage_history"
  ON public.fleet_stage_history FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.fleet_service_orders so
    WHERE so.id = fleet_stage_history.service_order_id
    AND owns_customer_product(so.customer_product_id)
  ));

-- Triggers de updated_at
CREATE TRIGGER update_fleet_vehicles_updated_at
  BEFORE UPDATE ON public.fleet_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fleet_service_orders_updated_at
  BEFORE UPDATE ON public.fleet_service_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
