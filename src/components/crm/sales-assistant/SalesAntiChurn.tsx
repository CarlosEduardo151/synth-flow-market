import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingDown, Activity, Shield, Zap, Clock, Eye } from 'lucide-react';

interface Props { customerProductId: string; }

const atRisk = [
  {
    name: 'Maria Santos',
    company: 'VendaMais',
    churnProb: 87,
    daysSinceContact: 14,
    signals: ['Não abriu últimos 3 e-mails', 'Visitou página de cancelamento', 'Login caiu 70%'],
    suggestedAction: 'Ligar HOJE oferecendo desconto de retenção + treinamento gratuito',
    value: 'R$ 4.500/mês',
  },
  {
    name: 'Carlos Lima',
    company: 'StartupX',
    churnProb: 72,
    daysSinceContact: 9,
    signals: ['Reduziu uso da plataforma', 'Mencionou concorrente em ticket'],
    suggestedAction: 'Enviar case de sucesso de empresa similar + agendar QBR',
    value: 'R$ 2.800/mês',
  },
  {
    name: 'Ana Costa',
    company: 'ConsultBR',
    churnProb: 58,
    daysSinceContact: 21,
    signals: ['Sem login há 3 semanas'],
    suggestedAction: 'Reativar com tutorial novo + oferecer call de sucesso',
    value: 'R$ 1.900/mês',
  },
];

const churnColor = (p: number) => {
  if (p >= 75) return 'text-red-500 bg-red-500/10 border-red-500/30';
  if (p >= 50) return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
  return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
};

export function SalesAntiChurn({ customerProductId }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Risco crítico</p>
                <p className="text-2xl font-bold text-red-500">7</p>
                <p className="text-[10px] text-muted-foreground mt-1">R$ 23.400 em risco</p>
              </div>
              <AlertTriangle className="h-7 w-7 text-red-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Risco médio</p>
                <p className="text-2xl font-bold text-orange-500">12</p>
              </div>
              <TrendingDown className="h-7 w-7 text-orange-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Recuperados (30d)</p>
                <p className="text-2xl font-bold text-emerald-500">9</p>
                <p className="text-[10px] text-muted-foreground mt-1">R$ 18.700 salvos</p>
              </div>
              <Shield className="h-7 w-7 text-emerald-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Precisão IA</p>
                <p className="text-2xl font-bold">82%</p>
                <p className="text-[10px] text-muted-foreground mt-1">vs churn real</p>
              </div>
              <Activity className="h-7 w-7 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Anti-Churn Preditivo
          </CardTitle>
          <CardDescription>
            IA analisa comportamento dos últimos 30 dias e identifica clientes prestes a cancelar — antes deles sumirem
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {atRisk.map((c, i) => (
            <Card key={i} className={c.churnProb >= 75 ? 'border-red-500/30' : ''}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{c.name}</p>
                      <Badge variant="outline" className={churnColor(c.churnProb)}>
                        {c.churnProb}% prob. churn
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.company} · {c.value} · Sem contato há {c.daysSinceContact} dias
                    </p>
                  </div>
                  <div className="min-w-[160px]">
                    <Progress value={c.churnProb} className="h-2" />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sinais detectados</p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.signals.map((s, j) => (
                      <Badge key={j} variant="secondary" className="text-[10px] gap-1">
                        <Eye className="h-2.5 w-2.5" />
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2.5 rounded bg-primary/5 border border-primary/20">
                  <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Ação recomendada IA</p>
                    <p className="text-xs mt-0.5">{c.suggestedAction}</p>
                  </div>
                  <Button size="sm">Executar</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Por que isso muda o jogo</p>
            <p className="text-xs text-muted-foreground mt-1">
              99% das ferramentas só te avisam que o cliente CANCELOU. Aqui você recebe alerta dias/semanas antes — com tempo pra agir e salvar a receita. Cada % a menos de churn = milhares de reais salvos por mês.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
