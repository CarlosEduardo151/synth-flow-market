import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Target, TrendingUp, Search, Plus, Filter, Brain, Zap, Loader2, Inbox } from 'lucide-react';

interface Props { customerProductId: string; }

interface Prospect {
  id: string;
  name: string;
  company: string | null;
  role: string | null;
  ai_score: number | null;
  stage: string | null;
  source: string | null;
  intent: string | null;
}

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
  const [loading, setLoading] = useState(true);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!customerProductId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from('sa_prospects')
        .select('id,name,company,role,ai_score,stage,source,intent')
        .eq('customer_product_id', customerProductId)
        .order('ai_score', { ascending: false })
        .limit(200);
      if (!active) return;
      setProspects(data || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [customerProductId]);

  const total = prospects.length;
  const sqls = prospects.filter(p => (p.stage || '').toUpperCase() === 'SQL');
  const mqls = prospects.filter(p => (p.stage || '').toUpperCase() === 'MQL');
  const cold = prospects.filter(p => !['SQL', 'MQL'].includes((p.stage || '').toUpperCase()));
  const avgScore = total ? Math.round(prospects.reduce((s, p) => s + (p.ai_score || 0), 0) / total) : 0;
  const conversion = mqls.length ? Math.round((sqls.length / mqls.length) * 100) : 0;

  const filtered = (list: Prospect[]) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.company || '').toLowerCase().includes(q) ||
      (p.role || '').toLowerCase().includes(q)
    );
  };

  const renderList = (list: Prospect[]) => {
    const items = filtered(list);
    if (loading) {
      return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
    }
    if (!items.length) {
      return (
        <div className="text-center py-12 text-sm text-muted-foreground">
          <Inbox className="h-10 w-10 mx-auto mb-2 opacity-40" />
          Nenhum lead encontrado. Capture leads via WhatsApp, formulários ou importe sua base.
        </div>
      );
    }
    return items.map((lead) => (
      <Card key={lead.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{lead.name}</p>
                {lead.stage && <Badge variant="outline" className={stageBadge(lead.stage)}>{lead.stage}</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {[lead.role, lead.company].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
            <div className="flex items-center gap-2 min-w-[140px] flex-wrap">
              {lead.source && <Badge variant="secondary" className="text-[10px]">{lead.source}</Badge>}
              {lead.intent && <Badge variant="outline" className="text-[10px]">Intenção: {lead.intent}</Badge>}
            </div>
            <div className="min-w-[180px]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">Score IA</span>
                <span className={`text-sm font-bold ${scoreColor(lead.ai_score || 0)}`}>{lead.ai_score ?? 0}</span>
              </div>
              <Progress value={lead.ai_score || 0} className="h-1.5" />
            </div>
            <Button size="sm" variant="ghost">Ver detalhes</Button>
          </div>
        </CardContent>
      </Card>
    ));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Leads capturados</p><p className="text-2xl font-bold">{total}</p></div><Target className="h-8 w-8 text-primary opacity-60" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">SQLs (qualificados)</p><p className="text-2xl font-bold text-emerald-500">{sqls.length}</p></div><TrendingUp className="h-8 w-8 text-emerald-500 opacity-60" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Score médio IA</p><p className="text-2xl font-bold">{avgScore}</p></div><Brain className="h-8 w-8 text-primary opacity-60" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Taxa MQL → SQL</p><p className="text-2xl font-bold">{conversion}%</p></div><Zap className="h-8 w-8 text-yellow-500 opacity-60" /></div></CardContent></Card>
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
                <TabsTrigger value="todos">Todos ({total})</TabsTrigger>
                <TabsTrigger value="sql">SQL ({sqls.length})</TabsTrigger>
                <TabsTrigger value="mql">MQL ({mqls.length})</TabsTrigger>
                <TabsTrigger value="frio">Frios ({cold.length})</TabsTrigger>
              </TabsList>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar lead..." className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <TabsContent value="todos" className="space-y-2">{renderList(prospects)}</TabsContent>
            <TabsContent value="sql" className="space-y-2">{renderList(sqls)}</TabsContent>
            <TabsContent value="mql" className="space-y-2">{renderList(mqls)}</TabsContent>
            <TabsContent value="frio" className="space-y-2">{renderList(cold)}</TabsContent>
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
