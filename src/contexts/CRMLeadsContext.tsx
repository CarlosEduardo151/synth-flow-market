import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CRMLead {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  source: string | null;
  source_url: string | null;
  detected_at: string;
  relevance_score: number | null;
  status: string;
  metadata: any;
}

interface CRMLeadsContextValue {
  leads: CRMLead[];
  loading: boolean;
  refresh: () => Promise<void>;
  updateStatus: (id: string, status: string) => Promise<void>;
  removeLead: (id: string) => Promise<void>;
  stats: {
    total: number;
    hot: number;
    today: number;
    new: number;
    qualified: number;
    contacted: number;
  };
}

const CRMLeadsContext = createContext<CRMLeadsContextValue | null>(null);

export function CRMLeadsProvider({
  customerProductId,
  children,
}: {
  customerProductId: string | null;
  children: ReactNode;
}) {
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!customerProductId) {
      setLeads([]);
      return;
    }
    setLoading(true);
    const { data } = await (supabase as any)
      .from('sa_trigger_events')
      .select(
        'id,event_type,title,description,source,source_url,detected_at,relevance_score,status,metadata'
      )
      .eq('customer_product_id', customerProductId)
      .order('relevance_score', { ascending: false, nullsFirst: false })
      .order('detected_at', { ascending: false })
      .limit(500);
    setLeads(data || []);
    setLoading(false);
  }, [customerProductId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!customerProductId) return;
    const channel = (supabase as any)
      .channel(`crm-leads-${customerProductId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sa_trigger_events',
          filter: `customer_product_id=eq.${customerProductId}`,
        },
        () => refresh()
      )
      .subscribe();
    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, [customerProductId, refresh]);

  const updateStatus = useCallback(async (id: string, status: string) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    await (supabase as any).from('sa_trigger_events').update({ status }).eq('id', id);
  }, []);

  const removeLead = useCallback(async (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    await (supabase as any).from('sa_trigger_events').delete().eq('id', id);
  }, []);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      total: leads.length,
      hot: leads.filter((l) => (l.relevance_score || 0) >= 75).length,
      today: leads.filter((l) => new Date(l.detected_at) >= today).length,
      new: leads.filter((l) => l.status === 'new').length,
      qualified: leads.filter((l) => l.status === 'qualified').length,
      contacted: leads.filter((l) => l.status === 'contacted').length,
    };
  }, [leads]);

  const value = useMemo(
    () => ({ leads, loading, refresh, updateStatus, removeLead, stats }),
    [leads, loading, refresh, updateStatus, removeLead, stats]
  );

  return <CRMLeadsContext.Provider value={value}>{children}</CRMLeadsContext.Provider>;
}

export function useCRMLeads() {
  const ctx = useContext(CRMLeadsContext);
  if (!ctx) {
    return {
      leads: [] as CRMLead[],
      loading: false,
      refresh: async () => {},
      updateStatus: async () => {},
      removeLead: async () => {},
      stats: { total: 0, hot: 0, today: 0, new: 0, qualified: 0, contacted: 0 },
    } as CRMLeadsContextValue;
  }
  return ctx;
}
