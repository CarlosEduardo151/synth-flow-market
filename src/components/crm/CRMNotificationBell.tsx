import { useEffect, useState, useCallback } from 'react';
import { Bell, CheckCheck, X, Flame, Calendar, UserPlus, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

interface Notification {
  id: string;
  type: 'new_lead' | 'followup_overdue' | 'hot_opportunity' | 'meeting_soon' | 'meeting_starting' | 'reminder_sent';
  title: string;
  message: string | null;
  link_path: string | null;
  metadata: any;
  is_read: boolean;
  created_at: string;
}

const ICON_MAP = {
  new_lead: { Icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  followup_overdue: { Icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  hot_opportunity: { Icon: Flame, color: 'text-red-500', bg: 'bg-red-500/10' },
  meeting_soon: { Icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  meeting_starting: { Icon: Calendar, color: 'text-green-500', bg: 'bg-green-500/10' },
  reminder_sent: { Icon: Bell, color: 'text-muted-foreground', bg: 'bg-muted' },
};

interface CRMNotificationBellProps {
  customerProductId: string;
  onNavigate?: (path: string) => void;
}

export function CRMNotificationBell({ customerProductId, onNavigate }: CRMNotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  const load = useCallback(async () => {
    if (!customerProductId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from('crm_notifications')
      .select('*')
      .eq('customer_product_id', customerProductId)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications(data || []);
    setLoading(false);
  }, [customerProductId]);

  const triggerScan = useCallback(async () => {
    setScanning(true);
    try {
      await supabase.functions.invoke('crm-notifications-scan', {
        body: { customer_product_id: customerProductId },
      });
      await load();
    } catch (e) {
      console.error('scan error', e);
    } finally {
      setScanning(false);
    }
  }, [customerProductId, load]);

  useEffect(() => {
    if (!customerProductId) return;
    load();
    triggerScan();

    // Realtime subscription
    const channel = supabase
      .channel(`crm_notifications:${customerProductId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_notifications',
          filter: `customer_product_id=eq.${customerProductId}`,
        },
        () => load(),
      )
      .subscribe();

    // Re-scan every 5 minutes while bell is mounted
    const scanInterval = setInterval(triggerScan, 5 * 60 * 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(scanInterval);
    };
  }, [customerProductId, load, triggerScan]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    await (supabase as any)
      .from('crm_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('customer_product_id', customerProductId)
      .eq('is_read', false);
    load();
  };

  const markRead = async (id: string) => {
    await (supabase as any)
      .from('crm_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id);
    load();
  };

  const dismiss = async (id: string) => {
    await (supabase as any).from('crm_notifications').delete().eq('id', id);
    load();
  };

  const handleClick = (n: Notification) => {
    markRead(n.id);
    if (n.link_path && onNavigate) {
      const tab = new URLSearchParams(n.link_path.replace(/^\?/, '')).get('tab');
      if (tab) onNavigate(tab);
      setOpen(false);
    }
  };

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return 'agora';
    if (diff < 3600) return `${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[9px] flex items-center justify-center rounded-full"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <div>
            <p className="text-sm font-semibold">Notificações</p>
            <p className="text-[11px] text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} nova${unreadCount > 1 ? 's' : ''}` : 'Tudo em dia'}
            </p>
          </div>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={markAllRead}>
                <CheckCheck className="h-3 w-3" />
                Marcar todas
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[480px]">
          {loading && notifications.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Você será avisado sobre novos leads, follow-ups e oportunidades quentes.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(n => {
                const { Icon, color, bg } = ICON_MAP[n.type] || ICON_MAP.reminder_sent;
                return (
                  <div
                    key={n.id}
                    role="button"
                    onClick={() => handleClick(n)}
                    className={`flex gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors group ${!n.is_read ? 'bg-primary/5' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs ${!n.is_read ? 'font-semibold' : ''} leading-snug`}>
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/70 mt-1">{fmtTime(n.created_at)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-2 flex items-center justify-between">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={triggerScan} disabled={scanning}>
            {scanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
            Verificar agora
          </Button>
          <span className="text-[10px] text-muted-foreground">Atualiza a cada 5min</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
