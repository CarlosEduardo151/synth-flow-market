import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface FleetNotification {
  id: string;
  title: string;
  message: string;
  stage: string | null;
  channel: string;
  is_read: boolean;
  created_at: string;
  service_order_id: string | null;
  recipient_role: string;
}

export function useFleetNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<FleetNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('fleet_notifications' as any)
      .select('*')
      .eq('recipient_user_id', user.id)
      .eq('channel', 'in_app')
      .order('created_at', { ascending: false })
      .limit(50) as any;
    setNotifications((data || []) as FleetNotification[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('fleet-notifications')
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'fleet_notifications',
          filter: `recipient_user_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (payload.new?.channel === 'in_app') {
            setNotifications(prev => [payload.new as FleetNotification, ...prev]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase
      .from('fleet_notifications' as any)
      .update({ is_read: true })
      .eq('id', id) as any;
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from('fleet_notifications' as any)
      .update({ is_read: true })
      .eq('recipient_user_id', user.id)
      .eq('is_read', false) as any;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }, [user]);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh: fetchNotifications };
}
