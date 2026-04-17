import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Heart, Activity, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface Props { customerProductId: string; }

const deals = [
  {
    deal: 'TechCorp - Plano Enterprise',
    contact: 'João Silva',
    value: 'R$ 8.500/mês',
    health: 92,
    trend: 'up',
    factors: [
      { label: 'Decisor identificado', positive: true },
      { label: 'Demo agendada', positive: true },
      { label: 'Orçamento confirmado', positive: true },
      { label: 'Champion engajado', positive: true },
    ],
    nextAction: 'Enviar proposta final hoje',
  },
  {
    deal: 'VendaMais - Upsell',
    contact: 'Maria Santos',
    value: 'R$ 4.200/mês',
    health: 68,
    trend: 'up',
    factors: [
      { label: 'Proposta enviada há 4 dias', positive: true },
      { label: 'Abriu PDF 6x', positive: true },
      { label: 'Sem resposta há 2 dias', positive: false },
    ],
    nextAction: 'Follow-up por WhatsApp com case de ROI',
  },
  {
    deal: 'StartupX - Plano Pro',
    contact: 'Carlos Lima',
    value: 'R$ 2.800/mês',
    health: 41,
    trend: 'down',
    factors: [
      { label: 'Pediu desconto agressivo', positive: false },
      { label: 'Consultando concorrente', positive: false },
      { label: 'Sumiu há 5 dias', positive: false },
    ],
    nextAction: 'URGENTE: Ligar e oferecer trial estendido',
  },
  {
    deal: 'ConsultBR - Renovação',
    contact: 'Ana Costa',
    value: 'R$ 3.600/mês',
    health: 23,
    trend: 'down',
    factors: [
      { label: 'Reclamação não resolvida', positive: false },
      { label: 'Decisor mudou de empresa', positive: false },
      { label: 'Uso da plataforma caiu 80%', positive: false },
    ],
    nextAction: 'CRÍTICO: Reunião executiva esta semana',
  },
];

const healthColor = (h: number) => {
  if (h >= 75) return { color: 'text-emerald-500', bg: 'bg-emerald-500', border: 'border-emerald-500/30 bg-emerald-500/5', label: 'Saudável' };
  if (h >= 50) return { color: 'text-yellow-500', bg: 'bg-yellow-500', border: 'border-yellow-500/30 bg-yellow-500/5', label: 'Atenção' };
  if (h >= 25) return { color: 'text-orange-500', bg: 'bg-orange-500', border: 'border-orange-500/30 bg-orange-500/5', label: 'Risco' };
  return { color: 'text-red-500', bg: 'bg-red-500', border: 'border-red-500/30 bg-red-500/5', label: 'Crítico' };
};

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

export function SalesHealthScore({ customerProductId }: Props) {
  const avg = Math.round(deals.reduce((s, d) => s + d.health, 0) / deals.length);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Health médio</p>
                <p className="text-2xl font-bold">{avg}</p>
              </div>
              <Heart className="h-7 w-7 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">💚 Saudáveis</p><p className="text-2xl font-bold text-emerald-500">8</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">⚠️ Em risco</p><p className="text-2xl font-bold text-orange-500">5</p></CardContent></Card>
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">🚨 Críticos</p>
                <p className="text-2xl font-bold text-red-500">2</p>
              </div>
              <AlertCircle className="h-7 w-7 text-red-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Deal Health Score em Tempo Real
          </CardTitle>
          <CardDescription>
            Pontuação 0-100 atualizada a cada interação. Vermelho = ação urgente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {deals.map((d, i) => {
            const c = healthColor(d.health);
            return (
              <Card key={i} className={c.border}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{d.deal}</p>
                        <Badge variant="outline" className={`${c.color} border-current`}>
                          {c.label}
                        </Badge>
                        <TrendIcon trend={d.trend} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{d.contact} · {d.value}</p>
                    </div>
                    <div className="text-right min-w-[140px]">
                      <div className="flex items-center justify-end gap-2 mb-1">
                        <Heart className={`h-4 w-4 ${c.color}`} />
                        <span className={`text-3xl font-bold ${c.color}`}>{d.health}</span>
                        <span className="text-xs text-muted-foreground">/100</span>
                      </div>
                      <Progress value={d.health} className="h-2" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {d.factors.map((f, j) => (
                      <div key={j} className="flex items-center gap-2 text-xs">
                        {f.positive ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        )}
                        <span className={f.positive ? 'text-foreground' : 'text-muted-foreground'}>
                          {f.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2 border-t flex-wrap">
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Próxima ação:</span>
                      <span className="font-medium">{d.nextAction}</span>
                    </div>
                    <Button size="sm" variant={d.health < 50 ? 'default' : 'outline'}>
                      {d.health < 50 ? 'Agir agora' : 'Ver detalhes'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Activity className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Como o Health Score é calculado</p>
            <p className="text-xs text-muted-foreground mt-1">
              IA combina 18 sinais: tempo de resposta, abertura de e-mails, presença de champion, decisor confirmado, orçamento, etapa, tempo no estágio, sentimento das mensagens, menções a concorrente, etc. Score recalcula a cada interação. CSMs já usam isso há anos — vendas finalmente também.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
