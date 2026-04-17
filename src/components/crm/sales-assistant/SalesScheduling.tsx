import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck, Video, Clock, CheckCircle, XCircle, Plus, Link as LinkIcon } from 'lucide-react';

interface Props {
  customerProductId: string;
}

const mockMeetings = [
  { lead: 'João Silva', company: 'TechCorp', date: 'Hoje, 15:00', status: 'confirmed', channel: 'Google Meet', negotiated: true },
  { lead: 'Maria Santos', company: 'VendaMais', date: 'Amanhã, 10:30', status: 'confirmed', channel: 'Google Meet', negotiated: true },
  { lead: 'Carlos Lima', company: 'StartupX', date: 'Sex, 14:00', status: 'pending', channel: 'Zoom', negotiated: true },
  { lead: 'Ana Costa', company: 'ConsultBR', date: 'Segunda, 09:00', status: 'cancelled', channel: 'Google Meet', negotiated: false },
];

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; className: string; icon: any }> = {
    confirmed: { label: 'Confirmada', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30', icon: CheckCircle },
    pending: { label: 'Aguardando', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30', icon: Clock },
    cancelled: { label: 'Cancelada', className: 'bg-red-500/10 text-red-500 border-red-500/30', icon: XCircle },
  };
  return map[status] || map.pending;
};

export function SalesScheduling({ customerProductId }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Reuniões agendadas</p>
            <p className="text-2xl font-bold">12</p>
            <p className="text-[10px] text-emerald-500 mt-1">+34% vs mês anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Taxa de comparecimento</p>
            <p className="text-2xl font-bold">87%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Agendadas pela IA</p>
            <p className="text-2xl font-bold text-primary">9</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Conversão pós-reunião</p>
            <p className="text-2xl font-bold text-emerald-500">42%</p>
          </CardContent>
        </Card>
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
          {mockMeetings.map((m, i) => {
            const s = statusBadge(m.status);
            const StatusIcon = s.icon;
            return (
              <Card key={i} className="hover:bg-muted/30 transition-colors">
                <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Video className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{m.lead}</p>
                      {m.negotiated && (
                        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                          IA negociou
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{m.company} · {m.channel}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{m.date}</p>
                    <Badge variant="outline" className={`${s.className} mt-1 gap-1`}>
                      <StatusIcon className="h-3 w-3" />
                      {s.label}
                    </Badge>
                  </div>
                  <Button size="sm" variant="ghost">Detalhes</Button>
                </CardContent>
              </Card>
            );
          })}
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
