import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck, Video, Clock, CheckCircle, XCircle, Plus, Link as LinkIcon, Loader2, Inbox } from 'lucide-react';

interface Props { customerProductId: string; }

interface Meeting {
  id: string;
  lead_name: string;
  company: string | null;
  scheduled_at: string;
  status: string;
  channel: string | null;
  ai_negotiated: boolean;
}

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; className: string; icon: any }> = {
    confirmed: { label: 'Confirmada', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30', icon: CheckCircle },
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
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    if (!customerProductId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from('sa_meetings')
        .select('id,lead_name,company,scheduled_at,status,channel,ai_negotiated')
        .eq('customer_product_id', customerProductId)
        .order('scheduled_at', { ascending: true })
        .limit(100);
      if (!active) return;
      setMeetings(data || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [customerProductId]);

  const total = meetings.length;
  const completed = meetings.filter(m => m.status === 'completed').length;
  const cancelled = meetings.filter(m => m.status === 'cancelled').length;
  const aiBooked = meetings.filter(m => m.ai_negotiated).length;
  const attended = total ? Math.round(((total - cancelled) / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Reuniões agendadas</p><p className="text-2xl font-bold">{total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Taxa de comparecimento</p><p className="text-2xl font-bold">{attended}%</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Agendadas pela IA</p><p className="text-2xl font-bold text-primary">{aiBooked}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Concluídas</p><p className="text-2xl font-bold text-emerald-500">{completed}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" />
                Agendamento Autônomo
              </CardTitle>
              <CardDescription>A IA negocia horário com o lead e cria evento no calendário</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm"><LinkIcon className="h-4 w-4 mr-2" />Conectar Google</Button>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Agendar manual</Button>
            </div>
          </div>
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
                        <p className="font-semibold text-sm">{m.lead_name}</p>
                        {m.ai_negotiated && (
                          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">IA negociou</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{[m.company, m.channel].filter(Boolean).join(' · ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatDate(m.scheduled_at)}</p>
                      <Badge variant="outline" className={`${s.className} mt-1 gap-1`}>
                        <StatusIcon className="h-3 w-3" />
                        {s.label}
                      </Badge>
                    </div>
                    <Button size="sm" variant="ghost">Detalhes</Button>
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
              Quando um lead vira SQL, a IA puxa sua agenda do Google/Outlook, sugere 3 horários no WhatsApp/e-mail, confirma o escolhido, cria o evento, envia o link da reunião e dispara lembretes automáticos. Você só aparece na hora.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
