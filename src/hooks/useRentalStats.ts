import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RentalStats {
  activeRentals: number;
  expiringSoon: number;
  expired: number;
  totalMonthlyRevenue: number;
  loading: boolean;
}

export const useRentalStats = () => {
  const [stats, setStats] = useState<RentalStats>({
    activeRentals: 0,
    expiringSoon: 0,
    expired: 0,
    totalMonthlyRevenue: 0,
    loading: true,
  });

  const fetchStats = async () => {
    try {
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Buscar todos os produtos alugados
      const { data: rentals, error } = await supabase
        .from('customer_products')
        .select('*')
        .eq('acquisition_type', 'rental')
        .eq('is_active', true);

      if (error) throw error;

      let activeCount = 0;
      let expiringCount = 0;
      let expiredCount = 0;
      let monthlyRevenue = 0;

      rentals?.forEach((rental) => {
        if (rental.rental_end_date) {
          const endDate = new Date(rental.rental_end_date);
          
          if (endDate < now) {
            expiredCount++;
          } else if (endDate <= sevenDaysFromNow) {
            expiringCount++;
            activeCount++;
          } else {
            activeCount++;
          }

          if (rental.monthly_rental_price && rental.rental_payment_status === 'active') {
            monthlyRevenue += rental.monthly_rental_price;
          }
        }
      });

      setStats({
        activeRentals: activeCount,
        expiringSoon: expiringCount,
        expired: expiredCount,
        totalMonthlyRevenue: monthlyRevenue,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching rental stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, refetchStats: fetchStats };
};
