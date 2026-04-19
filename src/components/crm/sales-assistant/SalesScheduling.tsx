import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CalendarCheck, Video, Clock, CheckCircle, XCircle, Plus, Loader2, Inbox, Mail, Unlink, Sparkles } from 'lucide-react';
import { SalesSectionHeader } from './SalesSectionHeader';

interface Props { customerProductId: string; }

interface Meeting {
  id: string;
  title: string | null;
  lead_email: string | null;
  lead_phone: string | null;
  scheduled_at: string;
  status: string;
  duration_min: number | null;
  meeting_url: string | null;
  source: string | null;
  scheduled_by_ai: boolean | null;
}

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; className: string; icon: any }> = {
    confirmed: { label: 'Confirmada', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30', icon: CheckCircle },
    scheduled: { label: 'Agendada', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30', icon: Clock },
    pending: { label: 'Aguardando', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30', icon: Clock },
    cancelled: { label: 'Cancelada', className: 'bg-red-500/10 text-red-500 border-red-500/30', icon: XCircle },
    completed: { label: 'Concluída', className: 'bg-primary/10 text-primary border-primary/30', icon: CheckCircle },
  };
  return map[status] || map.pending;
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
};

export function SalesScheduling({ customerProductId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [connection, setConnection] = useState<{ connected: boolean; google_email?: string } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', lead_email: '', scheduled_at: '', duration_min: 30, notes: '' });

  const loadMeetings = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('sa_meetings')
      .select('id,title,lead_email,lead_phone,scheduled_at,status,duration_min,meeting_url,source,scheduled_by_ai')
      .eq('customer_product_id', customerProductId)
      .order('scheduled_at', { ascending: true })
      .limit(100);
    setMeetings(data || []);
    setLoading(false);
  }, [customerProductId]);

  const loadConnection = useCallback(async () => {
    const { data } = await supabase.functions.invoke('sa-google-oauth/status', {
      body: { customer_product_id: customerProductId },
    });
    setConnection(data || { connected: false });
  }, [customerProductId]);

  useEffect(() => {
    if (!customerProductId) return;
    loadMeetings();
    loadConnection();
  }, [customerProductId, loadMeetings, loadConnection]);

  // listen for popup callback
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'sa-google-oauth') {
        loadConnection();
        if (e.data.ok) toast({ title: 'Google Calendar conectado!' });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [loadConnection, toast]);

  const connectGoogle = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('sa-google-oauth/start', {
        body: { customer_product_id: customerProductId, redirect_to: window.location.href },
      });
      if (error || !data?.auth_url) throw error || new Error('Sem URL');
      const w = 520, h = 640;
      const left = window.screenX + (window.outerWidth - w) / 2;
      const top = window.screenY + (window.outerHeight - h) / 2;
      window.open(data.auth_url, 'google-oauth', `width=${w},height=${h},left=${left},top=${top}`);
    } catch (e: any) {
      toast({ title: 'Erro ao conectar', description: e.message, variant: 'destructive' });
    } finally {
      setConnecting(false);
    }
  };

  const disconnectGoogle = async () => {
    await supabase.functions.invoke('sa-google-oauth/disconnect', { body: { customer_product_id: customerProductId } });
    setConnection({ connected: false });
    toast({ title: 'Google desconectado' });
  };

  const saveManual = async () => {
    if (!form.title || !form.scheduled_at) {
      toast({ title: 'Preencha título e data', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from('sa_meetings').insert({
      customer_product_id: customerProductId,
      title: form.title,
      lead_email: form.lead_email || null,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration_min: form.duration_min,
      notes: form.notes || null,
      status: 'scheduled',
      source: 'manual',
      scheduled_by_ai: false,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao agendar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Reunião agendada' });
    setManualOpen(false);
    setForm({ title: '', lead_email: '', scheduled_at: '', duration_min: 30, notes: '' });
    loadMeetings();
  };

  const total = meetings.length;
  const completed = meetings.filter(m => m.status === 'completed').length;
  const cancelled = meetings.filter(m => m.status === 'cancelled').length;
  const aiBooked = meetings.filter(m => m.scheduled_by_ai).length;
  const attended = total ? Math.round(((total - cancelled) / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <SalesSectionHeader
        icon={CalendarCheck}
        title="Agendamento Autônomo"
        description="A IA negocia horário com o lead e cria evento no calendário"
        actions={
          <>
            {connection?.connected ? (
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {connection.google_email}
                </Badge>
                <Button variant="outline" size="sm" onClick={disconnectGoogle}>
                  <Unlink className="h-4 w-4 mr-2" />Desconectar
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="lg" onClick={connectGoogle} disabled={connecting} className="gap-2">
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                )}
                Conectar Google
              </Button>
            )}
            <Button size="lg" onClick={() => setManualOpen(true)} className="gap-2 shadow-lg">
              <Plus className="h-4 w-4" />Agendar manual
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
          <CardContent className="p-4 relative flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Reuniões</p>
              <p className="text-3xl font-bold">{total}</p>
            </div>
            <CalendarCheck className="h-8 w-8 text-primary opacity-60" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Comparecimento</p>
              <p className="text-3xl font-bold">{attended}%</p>
            </div>
            <CheckCircle className="h-8 w-8 text-emerald-500 opacity-60" />
          </CardContent>
        </Card>
        <Card className="border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Agendadas pela IA</p>
              <p className="text-3xl font-bold text-primary">{aiBooked}</p>
            </div>
            <Sparkles className="h-8 w-8 text-primary opacity-60" />
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Concluídas</p>
              <p className="text-3xl font-bold text-emerald-500">{completed}</p>
            </div>
            <Video className="h-8 w-8 text-emerald-500 opacity-60" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Video className="h-4 w-4 text-primary" />Próximas reuniões
          </CardTitle>
          <CardDescription className="text-xs">Ordenadas por data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-2 opacity-40" />
              Nenhuma reunião agendada. Conecte seu calendário para que a IA agende sozinha.
            </div>
          ) : (
            meetings.map((m) => {
              const s = statusBadge(m.status);
              const StatusIcon = s.icon;
              return (
                <Card key={m.id} className="hover:bg-muted/30 transition-colors">
                  <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Video className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{m.title || 'Reunião'}</p>
                        {m.scheduled_by_ai && (
                          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">IA agendou</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        {m.lead_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{m.lead_email}</span>}
                        {m.duration_min && <span>· {m.duration_min} min</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatDate(m.scheduled_at)}</p>
                      <Badge variant="outline" className={`${s.className} mt-1 gap-1`}>
                        <StatusIcon className="h-3 w-3" />
                        {s.label}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <CalendarCheck className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Como a IA agenda sozinha</p>
            <p className="text-xs text-muted-foreground mt-1">
              Quando um lead vira SQL, a IA puxa sua agenda do Google, sugere 3 horários no WhatsApp/e-mail, confirma o escolhido, cria o evento, envia o link da reunião e dispara lembretes automáticos.
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar reunião manual</DialogTitle>
            <DialogDescription>O convite será enviado por e-mail ao lead.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Demo do produto" />
            </div>
            <div>
              <Label>E-mail do lead</Label>
              <Input type="email" value={form.lead_email} onChange={(e) => setForm({ ...form, lead_email: e.target.value })} placeholder="lead@empresa.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data e hora</Label>
                <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
              </div>
              <div>
                <Label>Duração (min)</Label>
                <Input type="number" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: parseInt(e.target.value) || 30 })} />
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)}>Cancelar</Button>
            <Button onClick={saveManual} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Agendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
