import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Mail, MessageSquare, Phone, Plus, Play, Pause, Clock, Zap, ArrowRight } from 'lucide-react';

interface Props {
  customerProductId: string;
}

const mockCadences = [
  {
    name: 'Pós-cadastro (lead frio → quente)',
    active: true,
    leads: 47,
    openRate: 64,
    replyRate: 18,
    steps: [
      { day: 0, channel: 'email', desc: 'Boas-vindas + descoberta' },
      { day: 2, channel: 'whatsapp', desc: 'Mensagem personalizada IA' },
      { day: 5, channel: 'email', desc: 'Caso de sucesso' },
      { day: 8, channel: 'whatsapp', desc: 'Convite para call' },
    ],
  },
  {
    name: 'Reengajamento (lead frio 30+ dias)',
    active: true,
    leads: 23,
    openRate: 41,
    replyRate: 9,
    steps: [
      { day: 0, channel: 'email', desc: 'Re-quebra de gelo IA' },
      { day: 4, channel: 'whatsapp', desc: 'Oferta personalizada' },
    ],
  },
  {
    name: 'Pós-reunião sem decisão',
    active: false,
    leads: 0,
    openRate: 0,
    replyRate: 0,
    steps: [
      { day: 1, channel: 'email', desc: 'Resumo + próximos passos' },
      { day: 3, channel: 'whatsapp', desc: 'Lembrete suave' },
      { day: 7, channel: 'email', desc: 'Quebra de objeção IA' },
    ],
  },
];

const channelIcon = (channel: string) => {
  if (channel === 'email') return <Mail className="h-3.5 w-3.5" />;
  if (channel === 'whatsapp') return <MessageSquare className="h-3.5 w-3.5" />;
  return <Phone className="h-3.5 w-3.5" />;
};

export function SalesCadences({ customerProductId }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Cadências de Follow-up
              </CardTitle>
              <CardDescription>
                Sequências automáticas multi-canal com mensagens geradas pela IA
              </CardDescription>
            </div>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nova cadência</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockCadences.map((cad, i) => (
            <Card key={i} className={cad.active ? 'border-primary/30' : 'opacity-70'}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-md flex items-center justify-center ${cad.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {cad.active ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{cad.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cad.leads} leads ativos · {cad.steps.length} passos
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Abertura</p>
                      <p className="text-sm font-semibold">{cad.openRate}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Resposta</p>
                      <p className="text-sm font-semibold text-emerald-500">{cad.replyRate}%</p>
                    </div>
                    <Switch checked={cad.active} />
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
                  {cad.steps.map((step, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1.5 py-1">
                        <Clock className="h-3 w-3" />
                        D+{step.day}
                        {channelIcon(step.channel)}
                        <span className="text-[10px]">{step.desc}</span>
                      </Badge>
                      {j < cad.steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Zap className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Mensagens 100% personalizadas pela IA</p>
            <p className="text-xs text-muted-foreground mt-1">
              Cada e-mail e mensagem WhatsApp é gerada na hora pela IA com base no contexto do lead (empresa, cargo, interações anteriores, objeções). Nada de template genérico — cada lead recebe algo único.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
