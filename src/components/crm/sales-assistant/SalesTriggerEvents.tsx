import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Radio, Briefcase, TrendingUp, DollarSign, Users, Newspaper, Bell, Zap, ArrowUpRight } from 'lucide-react';

interface Props { customerProductId: string; }

const triggers = [
  { id: 'job', label: 'Mudança de cargo', icon: Briefcase, desc: 'Lead/contato muda de empresa ou recebe promoção', enabled: true },
  { id: 'funding', label: 'Captação de investimento', icon: DollarSign, desc: 'Empresa do lead recebe rodada de investimento', enabled: true },
  { id: 'hiring', label: 'Onda de contratações', icon: Users, desc: 'Empresa abre +5 vagas em uma área', enabled: true },
  { id: 'news', label: 'Menção em notícia', icon: Newspaper, desc: 'Empresa do lead vira manchete (positivo ou crise)', enabled: false },
  { id: 'expansion', label: 'Expansão geográfica', icon: TrendingUp, desc: 'Anuncia abertura de filial/mercado novo', enabled: true },
];

const mockEvents = [
  {
    lead: 'João Silva',
    company: 'TechCorp',
    type: 'job',
    title: 'Promovido a CTO',
    detail: 'Saiu de Head of Engineering para CTO na TechCorp',
    time: '2h atrás',
    action: 'Parabenizar e oferecer reunião sobre nova stack',
    hot: true,
  },
  {
    lead: 'Maria Santos',
    company: 'VendaMais',
    type: 'funding',
    title: 'Captou R$ 12M Série A',
    detail: 'VendaMais anunciou rodada Série A liderada pela Kaszek',
    time: '1d atrás',
    action: 'Enviar proposta de plano enterprise (orçamento liberado)',
    hot: true,
  },
  {
    lead: 'Pedro Alves',
    company: 'Logística+',
    type: 'hiring',
    title: 'Abriu 8 vagas comerciais',
    detail: 'Logística+ contratou 8 SDRs nas últimas 2 semanas',
    time: '3d atrás',
    action: 'Pitchar como ferramenta essencial pro novo time',
    hot: false,
  },
  {
    lead: 'Carlos Lima',
    company: 'StartupX',
    type: 'expansion',
    title: 'Vai abrir filial em SP',
    detail: 'StartupX anunciou expansão para São Paulo em janeiro',
    time: '5d atrás',
    action: 'Oferecer onboarding para o novo time SP',
    hot: false,
  },
];

const typeIcon = (type: string) => {
  const map: Record<string, any> = { job: Briefcase, funding: DollarSign, hiring: Users, news: Newspaper, expansion: TrendingUp };
  return map[type] || Bell;
};

const typeColor = (type: string) => {
  const map: Record<string, string> = {
    job: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
    funding: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
    hiring: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
    news: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
    expansion: 'text-pink-500 bg-pink-500/10 border-pink-500/30',
  };
  return map[type] || 'text-muted-foreground';
};

export function SalesTriggerEvents({ customerProductId }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Eventos hoje</p><p className="text-2xl font-bold text-primary">14</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Eventos quentes 🔥</p><p className="text-2xl font-bold text-red-500">5</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Conversão pós-trigger</p><p className="text-2xl font-bold text-emerald-500">38%</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Leads monitorados</p><p className="text-2xl font-bold">247</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary animate-pulse" />
            Trigger Events — Sinais de Compra Externos
          </CardTitle>
          <CardDescription>
            A IA monitora LinkedIn, notícias e bases públicas e te avisa nos momentos de ouro pra abordar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {mockEvents.map((ev, i) => {
            const Icon = typeIcon(ev.type);
            return (
              <Card key={i} className={ev.hot ? 'border-red-500/30 bg-red-500/5' : ''}>
                <CardContent className="p-4 flex items-start gap-3 flex-wrap">
                  <div className={`w-10 h-10 rounded-md border flex items-center justify-center shrink-0 ${typeColor(ev.type)}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{ev.title}</p>
                      {ev.hot && <Badge className="bg-red-500/10 text-red-500 border-red-500/30 text-[10px]">🔥 QUENTE</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{ev.lead} · {ev.company} · {ev.time}</p>
                    <p className="text-xs mt-2">{ev.detail}</p>
                    <div className="flex items-start gap-1.5 mt-2 p-2 rounded bg-primary/5 border border-primary/20">
                      <Zap className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <p className="text-xs"><span className="font-medium">Sugestão IA:</span> {ev.action}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">Abordar <ArrowUpRight className="h-3 w-3 ml-1" /></Button>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tipos de evento monitorados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {triggers.map(t => {
            const Icon = t.icon;
            return (
              <div key={t.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/30">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground">{t.desc}</p>
                </div>
                <Switch checked={t.enabled} />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
