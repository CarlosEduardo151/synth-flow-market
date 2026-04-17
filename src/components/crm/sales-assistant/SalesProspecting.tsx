import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Target, TrendingUp, Search, Plus, Filter, Brain, Zap } from 'lucide-react';

interface Props {
  customerProductId: string;
}

const mockLeads = [
  { name: 'João Silva', company: 'TechCorp', role: 'CTO', score: 92, stage: 'SQL', source: 'LinkedIn', intent: 'Alto' },
  { name: 'Maria Santos', company: 'VendaMais', role: 'Diretora Comercial', score: 87, stage: 'SQL', source: 'Site', intent: 'Alto' },
  { name: 'Carlos Lima', company: 'StartupX', role: 'CEO', score: 74, stage: 'MQL', source: 'WhatsApp', intent: 'Médio' },
  { name: 'Ana Costa', company: 'ConsultBR', role: 'Gerente', score: 58, stage: 'MQL', source: 'Indicação', intent: 'Médio' },
  { name: 'Pedro Alves', company: 'Logística+', role: 'Sócio', score: 31, stage: 'Lead', source: 'Formulário', intent: 'Baixo' },
];

const scoreColor = (score: number) => {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-muted-foreground';
};

const stageBadge = (stage: string) => {
  const map: Record<string, string> = {
    'SQL': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    'MQL': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
    'Lead': 'bg-muted text-muted-foreground',
  };
  return map[stage] || 'bg-muted';
};

export function SalesProspecting({ customerProductId }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Leads capturados</p>
                <p className="text-2xl font-bold">247</p>
              </div>
              <Target className="h-8 w-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">SQLs (qualificados)</p>
                <p className="text-2xl font-bold text-emerald-500">38</p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Score médio IA</p>
                <p className="text-2xl font-bold">68</p>
              </div>
              <Brain className="h-8 w-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Taxa MQL → SQL</p>
                <p className="text-2xl font-bold">42%</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Prospecção & Qualificação IA
              </CardTitle>
              <CardDescription>Leads capturados, enriquecidos e pontuados automaticamente</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" />Filtros</Button>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Novo lead</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="todos">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <TabsList>
                <TabsTrigger value="todos">Todos (247)</TabsTrigger>
                <TabsTrigger value="sql">SQL (38)</TabsTrigger>
                <TabsTrigger value="mql">MQL (94)</TabsTrigger>
                <TabsTrigger value="frio">Frios (115)</TabsTrigger>
              </TabsList>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar lead..." className="pl-8 h-9" />
              </div>
            </div>

            <TabsContent value="todos" className="space-y-2">
              {mockLeads.map((lead, i) => (
                <Card key={i} className="hover:bg-muted/30 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{lead.name}</p>
                          <Badge variant="outline" className={stageBadge(lead.stage)}>{lead.stage}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{lead.role} · {lead.company}</p>
                      </div>

                      <div className="flex items-center gap-2 min-w-[140px]">
                        <Badge variant="secondary" className="text-[10px]">{lead.source}</Badge>
                        <Badge variant="outline" className="text-[10px]">Intenção: {lead.intent}</Badge>
                      </div>

                      <div className="min-w-[180px]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-muted-foreground">Score IA</span>
                          <span className={`text-sm font-bold ${scoreColor(lead.score)}`}>{lead.score}</span>
                        </div>
                        <Progress value={lead.score} className="h-1.5" />
                      </div>

                      <Button size="sm" variant="ghost">Ver detalhes</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="sql" className="text-center py-8 text-sm text-muted-foreground">
              Filtragem por SQL — em breve.
            </TabsContent>
            <TabsContent value="mql" className="text-center py-8 text-sm text-muted-foreground">
              Filtragem por MQL — em breve.
            </TabsContent>
            <TabsContent value="frio" className="text-center py-8 text-sm text-muted-foreground">
              Leads frios para reengajamento — em breve.
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Brain className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Como funciona o Lead Scoring IA</p>
            <p className="text-xs text-muted-foreground mt-1">
              A IA analisa perfil (cargo, empresa, segmento) + comportamento (visitas ao site, abertura de e-mails, respostas no WhatsApp) e atribui uma nota de 0-100. Leads &gt;80 viram SQL automaticamente e entram na cadência de fechamento.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
