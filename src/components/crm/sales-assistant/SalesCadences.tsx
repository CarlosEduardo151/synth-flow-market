import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Mail, MessageSquare, Phone, Plus, Play, Pause, Clock, Zap, ArrowRight, Loader2, Inbox } from 'lucide-react';

interface Props { customerProductId: string; }

interface Cadence {
  id: string;
  name: string;
  is_active: boolean;
  steps: any;
  open_rate: number | null;
  reply_rate: number | null;
  active_leads: number | null;
}

const channelIcon = (channel: string) => {
  if (channel === 'email') return <Mail className="h-3.5 w-3.5" />;
  if (channel === 'whatsapp') return <MessageSquare className="h-3.5 w-3.5" />;
  return <Phone className="h-3.5 w-3.5" />;
};

export function SalesCadences({ customerProductId }: Props) {
  const [loading, setLoading] = useState(true);
  const [cadences, setCadences] = useState<Cadence[]>([]);

  useEffect(() => {
    if (!customerProductId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from('sa_cadences')
        .select('id,name,is_active,steps,open_rate,reply_rate,active_leads')
        .eq('customer_product_id', customerProductId)
        .order('created_at', { ascending: false });
      if (!active) return;
      setCadences(data || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [customerProductId]);

  const toggleCadence = async (id: string, value: boolean) => {
    setCadences(prev => prev.map(c => c.id === id ? { ...c, is_active: value } : c));
    await (supabase as any).from('sa_cadences').update({ is_active: value }).eq('id', id);
  };

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
              <CardDescription>Sequências automáticas multi-canal com mensagens geradas pela IA</CardDescription>
            </div>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nova cadência</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : cadences.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-2 opacity-40" />
              Nenhuma cadência criada ainda. Crie sua primeira sequência multi-canal.
            </div>
          ) : (
            cadences.map((cad) => {
              const steps: any[] = Array.isArray(cad.steps) ? cad.steps : [];
              return (
                <Card key={cad.id} className={cad.is_active ? 'border-primary/30' : 'opacity-70'}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-md flex items-center justify-center ${cad.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {cad.is_active ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{cad.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {cad.active_leads ?? 0} leads ativos · {steps.length} passos
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground">Abertura</p>
                          <p className="text-sm font-semibold">{cad.open_rate ?? 0}%</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground">Resposta</p>
                          <p className="text-sm font-semibold text-emerald-500">{cad.reply_rate ?? 0}%</p>
                        </div>
                        <Switch checked={cad.is_active} onCheckedChange={(v) => toggleCadence(cad.id, v)} />
                      </div>
                    </div>
                    {steps.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
                        {steps.map((step, j) => (
                          <div key={j} className="flex items-center gap-2">
                            <Badge variant="outline" className="gap-1.5 py-1">
                              <Clock className="h-3 w-3" />
                              D+{step.day ?? 0}
                              {channelIcon(step.channel || '')}
                              <span className="text-[10px]">{step.desc || ''}</span>
                            </Badge>
                            {j < steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
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
