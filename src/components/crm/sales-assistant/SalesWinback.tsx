import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HeartCrack, Sparkles, Send, Clock, TrendingUp, RefreshCw, Brain } from 'lucide-react';

interface Props { customerProductId: string; }

const lostDeals = [
  {
    lead: 'João Silva',
    company: 'TechCorp',
    lostReason: 'Preço',
    daysAgo: 45,
    value: 'R$ 3.200/mês',
    suggestedTrigger: 'FOMO + escassez',
    suggestedMessage: 'João, lembra daquele projeto que você adiou em outubro? Tô liberando 3 vagas no plano Pro com 30% off só pra clientes que voltaram nesse Q4. Quer que segura uma pra você até sexta?',
    successProb: 64,
  },
  {
    lead: 'Marcos Brito',
    company: 'EcomRápido',
    lostReason: 'Timing ruim',
    daysAgo: 67,
    value: 'R$ 1.800/mês',
    suggestedTrigger: 'Prova social',
    suggestedMessage: 'Marcos, lembrei de você porque a Loja Y (que tava na mesma situação que vocês em setembro) acabou de bater R$ 200k/mês usando a gente. 5 minutinhos pra te mostrar o que mudou?',
    successProb: 51,
  },
  {
    lead: 'Letícia Ramos',
    company: 'ModaBR',
    lostReason: 'Escolheu concorrente',
    daysAgo: 90,
    value: 'R$ 2.400/mês',
    suggestedTrigger: 'Quebra de objeção',
    suggestedMessage: 'Oi Letícia! Sei que vocês foram pro [concorrente]. Várias clientes que fizeram isso me chamaram 3 meses depois reclamando do mesmo problema (suporte travado). Caso queira ver como resolvemos isso, deixo aberto.',
    successProb: 38,
  },
];

const successColor = (p: number) => {
  if (p >= 60) return 'text-emerald-500';
  if (p >= 40) return 'text-yellow-500';
  return 'text-orange-500';
};

export function SalesWinback({ customerProductId }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Deals perdidos (90d)</p><p className="text-2xl font-bold">47</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Recuperáveis (IA)</p><p className="text-2xl font-bold text-primary">19</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Recuperados</p><p className="text-2xl font-bold text-emerald-500">6</p><p className="text-[10px] text-muted-foreground mt-1">R$ 14.200 MRR</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Taxa win-back</p><p className="text-2xl font-bold">31%</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <HeartCrack className="h-5 w-5 text-pink-500" />
                Win-back Automático
              </CardTitle>
              <CardDescription>
                IA identifica leads perdidos com chance de voltar e gera mensagem psicologicamente otimizada
              </CardDescription>
            </div>
            <Button size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />Reanalisar perdidos
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {lostDeals.map((d, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{d.lead}</p>
                      <Badge variant="outline" className="text-[10px]">Perdido por: {d.lostReason}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {d.company} · {d.value} · há {d.daysAgo} dias
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Prob. recuperar</p>
                    <p className={`text-2xl font-bold ${successColor(d.successProb)}`}>{d.successProb}%</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Gatilho psicológico: {d.suggestedTrigger}
                    </p>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50 border text-sm italic">
                    "{d.suggestedMessage}"
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1">
                    <Send className="h-4 w-4 mr-2" />Enviar agora
                  </Button>
                  <Button size="sm" variant="outline">
                    <Clock className="h-4 w-4 mr-2" />Agendar
                  </Button>
                  <Button size="sm" variant="outline">
                    <Brain className="h-4 w-4 mr-2" />Gerar variação
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Mensagens que NÃO parecem desespero</p>
            <p className="text-xs text-muted-foreground mt-1">
              A IA usa gatilhos psicológicos validados (escassez, prova social, FOMO, quebra de objeção) calibrados pelo motivo de perda + tempo decorrido. Cada lead recebe uma abordagem única — nunca template "voltei a falar com você".
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
