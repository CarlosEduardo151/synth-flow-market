import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminStats {
  monthlyRevenue: number;
  todayOrders: number;
  conversionRate: number;
  approvedOrdersRate: number;
  pendingOrdersCount: number;
  openTicketsCount: number;
  totalCustomers: number;
  totalReviews: number;
  loading: boolean;
}

export const useAdminStats = () => {
  const [stats, setStats] = useState<AdminStats>({
    monthlyRevenue: 0,
    todayOrders: 0,
    conversionRate: 0,
    approvedOrdersRate: 0,
    pendingOrdersCount: 0,
    openTicketsCount: 0,
    totalCustomers: 0,
    totalReviews: 0,
    loading: true,
  });

  const fetchStats = async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Vendas do mês
      const { data: monthlyOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('status', 'approved')
        .gte('created_at', startOfMonth.toISOString());

      const monthlyRevenue = monthlyOrders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;

      // Pedidos hoje
      const { data: todayOrdersData } = await supabase
        .from('orders')
        .select('id')
        .gte('created_at', startOfDay.toISOString());

      // Taxa de aprovação de pedidos
      const { data: allOrders } = await supabase
        .from('orders')
        .select('status');

      const totalOrders = allOrders?.length || 0;
      const approvedOrders = allOrders?.filter(order => order.status === 'approved').length || 0;
      const approvedOrdersRate = totalOrders > 0 ? (approvedOrders / totalOrders) * 100 : 0;

      // Pedidos pendentes
      const { data: pendingOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('status', 'pending');

      // Tickets abertos - não existe tabela support_tickets, usar 0
      const openTickets: any[] = [];

      // Total de clientes - contando user_roles com role = 'user'
      const { data: customerRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'user');

      // Total de avaliações
      const { data: reviews } = await supabase
        .from('customer_reviews')
        .select('id');

      // Taxa de conversão (simplificada: pedidos aprovados / total de clientes)
      const conversionRate = customerRoles?.length ? (approvedOrders / customerRoles.length) * 100 : 0;

      setStats({
        monthlyRevenue,
        todayOrders: todayOrdersData?.length || 0,
        conversionRate,
        approvedOrdersRate,
        pendingOrdersCount: pendingOrders?.length || 0,
        openTicketsCount: openTickets?.length || 0,
        totalCustomers: customerRoles?.length || 0,
        totalReviews: reviews?.length || 0,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, refetchStats: fetchStats };
};
