import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, AlertTriangle, Lightbulb, FileText, Target, DollarSign, ArrowUpRight } from 'lucide-react';

interface Props {
  customerProductId: string;
}

const mockSuggestions = [
  { lead: 'João Silva', tip: 'Lead abriu seu e-mail 4x nas últimas 24h. Hora de ligar!', priority: 'alta' },
  { lead: 'Maria Santos', tip: 'Mencionou orçamento na última call — envie proposta com desconto agressivo agora.', priority: 'alta' },
  { lead: 'Carlos Lima', tip: 'Sem resposta há 5 dias. Tente WhatsApp com pergunta aberta.', priority: 'media' },
];

const mockLossReasons = [
  { reason: 'Preço alto', percent: 38, count: 14 },
  { reason: 'Sem orçamento agora', percent: 24, count: 9 },
  { reason: 'Escolheu concorrente', percent: 19, count: 7 },
  { reason: 'Timing ruim', percent: 12, count: 4 },
  { reason: 'Outros', percent: 7, count: 3 },
];

const priorityColor = (p: string) => {
  if (p === 'alta') return 'bg-red-500/10 text-red-500 border-red-500/30';
  if (p === 'media') return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
  return 'bg-muted';
};

export function SalesCopilot({ customerProductId }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Forecast do mês</p>
                <p className="text-2xl font-bold text-emerald-500">R$ 87.450</p>
                <p className="text-[10px] text-muted-foreground mt-1">Probabilidade média 72%</p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Deals em risco</p>
                <p className="text-2xl font-bold text-red-500">7</p>
                <p className="text-[10px] text-muted-foreground mt-1">Sem movimento há 10+ dias</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Sugestões IA hoje</p>
                <p className="text-2xl font-bold text-primary">14</p>
                <p className="text-[10px] text-muted-foreground mt-1">3 prioridade alta</p>
              </div>
              <Lightbulb className="h-8 w-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Próximas ações sugeridas pela IA
          </CardTitle>
          <CardDescription>Sugestões em tempo real baseadas no comportamento de cada lead</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {mockSuggestions.map((s, i) => (
            <Card key={i} className="hover:bg-muted/30 transition-colors">
              <CardContent className="p-4 flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold text-sm">{s.lead}</p>
                    <Badge variant="outline" className={priorityColor(s.priority)}>
                      Prioridade {s.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{s.tip}</p>
                </div>
                <Button size="sm" variant="outline">
                  Executar <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-primary" />
              Forecast por estágio
            </CardTitle>
            <CardDescription>Receita projetada x probabilidade IA</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { stage: 'Proposta enviada', value: 'R$ 42.000', prob: 78 },
              { stage: 'Negociação', value: 'R$ 28.500', prob: 65 },
              { stage: 'Qualificado', value: 'R$ 16.950', prob: 45 },
            ].map((f, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{f.stage}</span>
                  <span className="text-muted-foreground">{f.value} · {f.prob}%</span>
                </div>
                <Progress value={f.prob} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5 text-red-500" />
              Análise de perdas
            </CardTitle>
            <CardDescription>Padrões identificados pela IA nos deals perdidos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockLossReasons.map((r, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{r.reason}</span>
                  <span className="text-muted-foreground">{r.count} deals · {r.percent}%</span>
                </div>
                <Progress value={r.percent} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <FileText className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Resumo automático de reuniões</p>
            <p className="text-xs text-muted-foreground mt-1">
              Após cada reunião, a IA gera transcrição completa, action items, objeções identificadas e próximos passos sugeridos — tudo já anexado ao card do lead no CRM.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
