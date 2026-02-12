import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface FreeTrial {
  id: string;
  product_slug: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export function useFreeTrial() {
  const { user } = useAuth();
  const [trials, setTrials] = useState<FreeTrial[]>([]);
  const [activeTrials, setActiveTrials] = useState<FreeTrial[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  const fetchTrials = useCallback(async () => {
    if (!user) {
      setTrials([]);
      setActiveTrials([]);
      setLoading(false);
      return;
    }

    try {
      // Update expired trials first
      await supabase.rpc('update_expired_trials');

      const { data, error } = await supabase
        .from('free_trials')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching trials:', error);
        setTrials([]);
        setActiveTrials([]);
      } else {
        const allTrials = (data || []) as FreeTrial[];
        setTrials(allTrials);
        setActiveTrials(allTrials.filter(t => t.status === 'active'));
      }
    } catch (error) {
      console.error('Error fetching trials:', error);
      setTrials([]);
      setActiveTrials([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTrials();
  }, [fetchTrials]);

  const canAddMoreTrials = activeTrials.length < 2;

  const hasActiveTrial = (productSlug: string) => {
    return activeTrials.some(t => t.product_slug === productSlug);
  };

  const hasAnyTrialForProduct = (productSlug: string) => {
    return trials.some(t => t.product_slug === productSlug);
  };

  const activateTrial = async (productSlug: string, productTitle: string) => {
    if (!user) {
      toast.error('Você precisa estar logado para ativar um teste grátis');
      return false;
    }

    if (!canAddMoreTrials) {
      toast.error('Você já possui 2 produtos em teste grátis ativo');
      return false;
    }

    if (hasAnyTrialForProduct(productSlug)) {
      toast.error('Você já utilizou o teste grátis deste produto');
      return false;
    }

    setActivating(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 2); // 2 days trial

      const { error } = await supabase
        .from('free_trials')
        .insert({
          user_id: user.id,
          product_slug: productSlug,
          expires_at: expiresAt.toISOString(),
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Você já utilizou o teste grátis deste produto');
        } else {
          toast.error('Erro ao ativar teste grátis');
        }
        return false;
      }

      toast.success(`Teste grátis de "${productTitle}" ativado por 2 dias!`);
      await fetchTrials();
      return true;
    } catch (error) {
      console.error('Error activating trial:', error);
      toast.error('Erro ao ativar teste grátis');
      return false;
    } finally {
      setActivating(false);
    }
  };

  const getTrialTimeRemaining = (trial: FreeTrial) => {
    const now = new Date();
    const expiresAt = new Date(trial.expires_at);
    const diffMs = expiresAt.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expirado';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h restantes`;
    }
    
    return `${hours}h ${minutes}m restantes`;
  };

  return {
    trials,
    activeTrials,
    loading,
    activating,
    canAddMoreTrials,
    hasActiveTrial,
    hasAnyTrialForProduct,
    activateTrial,
    getTrialTimeRemaining,
    refetch: fetchTrials,
  };
}
