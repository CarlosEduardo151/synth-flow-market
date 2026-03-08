import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAdminCheck } from '@/hooks/useAuth';
import type { ServiceStage } from '@/components/fleet/ServiceStagePipeline';

export interface FleetVehicle {
  id: string;
  customer_product_id: string;
  placa: string;
  marca: string | null;
  modelo: string | null;
  cor: string | null;
  ano: string | null;
  chassi: string | null;
  renavam: string | null;
  combustivel: string | null;
  potencia: string | null;
  ano_fabricacao: string | null;
  ano_modelo: string | null;
  foto_url: string | null;
  status: string;
  km_atual: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FleetServiceOrder {
  id: string;
  customer_product_id: string;
  vehicle_id: string;
  workshop_id: string | null;
  stage: ServiceStage;
  oficina_nome: string | null;
  descricao_servico: string | null;
  valor_orcamento: number | null;
  valor_aprovado: number | null;
  data_entrada: string | null;
  data_previsao_entrega: string | null;
  data_finalizacao: string | null;
  data_entrega: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  vehicle?: FleetVehicle;
}

export interface FleetStageHistory {
  id: string;
  service_order_id: string;
  from_stage: string | null;
  to_stage: string;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
}

interface NewVehicleData {
  placa: string;
  marca?: string;
  modelo?: string;
  cor?: string;
  ano?: string;
  chassi?: string;
  renavam?: string;
  combustivel?: string;
  potencia?: string;
  ano_fabricacao?: string;
  ano_modelo?: string;
  foto_url?: string;
  km_atual?: number;
  observacoes?: string;
}

interface NewServiceOrderData {
  vehicle_id: string;
  oficina_nome?: string;
  descricao_servico?: string;
  valor_orcamento?: number;
  /** Workshop performing the service — if set, the SO uses the vehicle owner's CP */
  workshop_id?: string;
}

interface UseFleetDataOptions {
  /** When set, the hook operates in workshop mode: loads SOs by workshop_id */
  workshopId?: string | null;
}

export function useFleetData(customerProductId: string | null, options?: UseFleetDataOptions) {
  const workshopId = options?.workshopId || null;
  const isWorkshopMode = !!workshopId;
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [serviceOrders, setServiceOrders] = useState<FleetServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  // ── LOAD VEHICLES ──
  const loadVehicles = useCallback(async () => {
    if (adminLoading) return;
    if (!customerProductId && !isAdmin && !isWorkshopMode) return;

    try {
      let query = supabase
        .from('fleet_vehicles')
        .select('*');

      // In workshop mode, RLS allows reading all vehicles (approved workshop policy)
      // In fleet mode, filter by own CP
      if (!isAdmin && !isWorkshopMode && customerProductId) {
        query = query.eq('customer_product_id', customerProductId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setVehicles((data as FleetVehicle[]) || []);
    } catch (err: any) {
      console.error('Error loading vehicles:', err);
    }
  }, [customerProductId, isAdmin, adminLoading, isWorkshopMode]);

  // ── LOAD SERVICE ORDERS ──
  const loadServiceOrders = useCallback(async () => {
    if (adminLoading) return;
    if (!customerProductId && !isAdmin && !isWorkshopMode) return;

    try {
      let query = supabase
        .from('fleet_service_orders')
        .select('*');

      if (isWorkshopMode) {
        // Workshop mode: load only SOs assigned to this workshop
        query = query.eq('workshop_id', workshopId!);
      } else if (!isAdmin && customerProductId) {
        // Fleet mode: load SOs owned by this fleet
        query = query.eq('customer_product_id', customerProductId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setServiceOrders((data as FleetServiceOrder[]) || []);
    } catch (err: any) {
      console.error('Error loading service orders:', err);
    }
  }, [customerProductId, isAdmin, adminLoading, isWorkshopMode, workshopId]);

  // ── INITIAL LOAD ──
  useEffect(() => {
    if (adminLoading) return;

    if (!customerProductId && !isAdmin && !isWorkshopMode) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      await Promise.all([loadVehicles(), loadServiceOrders()]);
      setLoading(false);
    };

    load();
  }, [customerProductId, isAdmin, adminLoading, loadVehicles, loadServiceOrders]);

  // ── ADD VEHICLE ──
  const addVehicle = useCallback(async (data: NewVehicleData): Promise<FleetVehicle | null> => {
    if (!customerProductId) return null;
    setSaving(true);
    try {
      const insertData: any = {
        customer_product_id: customerProductId,
        placa: data.placa.toUpperCase().trim(),
        marca: data.marca || null,
        modelo: data.modelo || null,
        cor: data.cor || null,
        ano: data.ano || null,
        chassi: data.chassi || null,
        renavam: data.renavam || null,
        combustivel: data.combustivel || null,
        potencia: data.potencia || null,
        ano_fabricacao: data.ano_fabricacao || null,
        ano_modelo: data.ano_modelo || null,
        foto_url: data.foto_url || null,
        km_atual: data.km_atual || 0,
        observacoes: data.observacoes || null,
        status: 'disponivel',
      };

      const { data: created, error } = await supabase
        .from('fleet_vehicles')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Veículo com essa placa já está cadastrado.');
        } else {
          throw error;
        }
        return null;
      }

      toast.success('Veículo cadastrado com sucesso!');
      await loadVehicles();
      return created as FleetVehicle;
    } catch (err: any) {
      console.error('Error adding vehicle:', err);
      toast.error('Erro ao cadastrar veículo.');
      return null;
    } finally {
      setSaving(false);
    }
  }, [customerProductId, loadVehicles]);

  // ── CREATE SERVICE ORDER (CHECK-IN) ──
  const createServiceOrder = useCallback(async (data: NewServiceOrderData): Promise<FleetServiceOrder | null> => {
    if (!customerProductId) return null;
    setSaving(true);
    try {
      // Update vehicle status
      await supabase
        .from('fleet_vehicles')
        .update({ status: 'em_servico' })
        .eq('id', data.vehicle_id);

      const { data: created, error } = await supabase
        .from('fleet_service_orders')
        .insert({
          customer_product_id: customerProductId,
          vehicle_id: data.vehicle_id,
          stage: 'checkin',
          oficina_nome: data.oficina_nome || null,
          descricao_servico: data.descricao_servico || null,
          valor_orcamento: data.valor_orcamento || null,
          data_entrada: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Log stage history
      await supabase.from('fleet_stage_history').insert({
        service_order_id: (created as any).id,
        from_stage: null,
        to_stage: 'checkin',
        changed_by: 'sistema',
        notes: 'Check-in do veículo',
      });

      toast.success('Check-in realizado com sucesso!');
      await Promise.all([loadVehicles(), loadServiceOrders()]);
      return created as FleetServiceOrder;
    } catch (err: any) {
      console.error('Error creating service order:', err);
      toast.error('Erro ao realizar check-in.');
      return null;
    } finally {
      setSaving(false);
    }
  }, [customerProductId, loadVehicles, loadServiceOrders]);

  // ── UPDATE STAGE ──
  const updateStage = useCallback(async (
    serviceOrderId: string,
    newStage: ServiceStage,
    changedBy?: string,
    notes?: string,
    extraData?: Partial<FleetServiceOrder>
  ): Promise<boolean> => {
    setSaving(true);
    try {
      // Get current stage
      const { data: current, error: fetchErr } = await supabase
        .from('fleet_service_orders')
        .select('stage, vehicle_id')
        .eq('id', serviceOrderId)
        .single();
      if (fetchErr) throw fetchErr;

      const updateData: any = { stage: newStage, ...extraData };

      if (newStage === 'veiculo_finalizado') {
        updateData.data_finalizacao = new Date().toISOString();
      }
      if (newStage === 'veiculo_entregue') {
        updateData.data_entrega = new Date().toISOString();
        // Update vehicle status back to available
        await supabase
          .from('fleet_vehicles')
          .update({ status: 'disponivel' })
          .eq('id', (current as any).vehicle_id);
      }

      const { error } = await supabase
        .from('fleet_service_orders')
        .update(updateData)
        .eq('id', serviceOrderId);

      if (error) throw error;

      // Log history
      await supabase.from('fleet_stage_history').insert({
        service_order_id: serviceOrderId,
        from_stage: (current as any).stage,
        to_stage: newStage,
        changed_by: changedBy || 'sistema',
        notes: notes || null,
      });

      const stageLabels: Record<ServiceStage, string> = {
        checkin: 'Check-In',
        orcamento_enviado: 'Orçamento Enviado',
        orcamento_analise: 'Orçamento em Análise',
        orcamento_aprovado: 'Orçamento Aprovado',
        veiculo_finalizado: 'Veículo Finalizado',
        veiculo_entregue: 'Veículo Entregue',
      };
      toast.success(`Etapa atualizada: ${stageLabels[newStage]}`);
      await Promise.all([loadVehicles(), loadServiceOrders()]);
      return true;
    } catch (err: any) {
      console.error('Error updating stage:', err);
      toast.error('Erro ao atualizar etapa.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [loadVehicles, loadServiceOrders]);

  // ── LOAD STAGE HISTORY ──
  const loadStageHistory = useCallback(async (serviceOrderId: string): Promise<FleetStageHistory[]> => {
    try {
      const { data, error } = await supabase
        .from('fleet_stage_history')
        .select('*')
        .eq('service_order_id', serviceOrderId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as FleetStageHistory[]) || [];
    } catch (err) {
      console.error('Error loading stage history:', err);
      return [];
    }
  }, []);

  // ── SEARCH VEHICLE BY PLACA ──
  const searchVehicleByPlaca = useCallback(async (placa: string): Promise<FleetVehicle | null> => {
    if (!customerProductId && !isAdmin) return null;
    try {
      let query = supabase
        .from('fleet_vehicles')
        .select('*')
        .eq('placa', placa.toUpperCase().trim());

      if (!isAdmin && customerProductId) {
        query = query.eq('customer_product_id', customerProductId);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data as FleetVehicle | null;
    } catch (err) {
      console.error('Error searching vehicle:', err);
      return null;
    }
  }, [customerProductId, isAdmin]);

  // ── GET ACTIVE SERVICE ORDER FOR VEHICLE ──
  const getActiveServiceOrder = useCallback((vehicleId: string): FleetServiceOrder | undefined => {
    return serviceOrders.find(
      so => so.vehicle_id === vehicleId && so.stage !== 'veiculo_entregue'
    );
  }, [serviceOrders]);

  // ── HELPER: vehicles with their active service order ──
  const vehiclesWithOrders = vehicles.map(v => {
    const activeOrder = getActiveServiceOrder(v.id);
    return {
      ...v,
      activeOrder,
      currentStage: activeOrder?.stage || null,
    };
  });

  const vehiclesInService = vehiclesWithOrders.filter(v => v.currentStage !== null);
  const vehiclesAvailable = vehiclesWithOrders.filter(v => v.currentStage === null);

  return {
    vehicles,
    serviceOrders,
    vehiclesWithOrders,
    vehiclesInService,
    vehiclesAvailable,
    loading,
    saving,
    addVehicle,
    createServiceOrder,
    updateStage,
    loadStageHistory,
    searchVehicleByPlaca,
    getActiveServiceOrder,
    refresh: () => Promise.all([loadVehicles(), loadServiceOrders()]),
  };
}
