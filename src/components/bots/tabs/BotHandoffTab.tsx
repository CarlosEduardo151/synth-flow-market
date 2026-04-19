import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserCheck, Clock, Bell, Save, Loader2, Phone, Users, Sparkles, MessageCircle, ShieldCheck } from 'lucide-react';

interface BotHandoffTabProps {
  customerProductId: string;
}

interface HandoffConfig {
  id?: string;
  is_enabled: boolean;
  pause_minutes: number;
  notification_phone: string;
  notification_message: string;
  auto_message: string;
  return_message: string;
}

interface HandoffSession {
  id: string;
  phone: string;
  started_at: string;
  last_activity_at: string;
  status: string;
}

const DEFAULT_CONFIG: HandoffConfig = {
  is_enabled: false,
  pause_minutes: 30,
  notification_phone: '',
  notification_message: 'Um cliente solicitou atendimento humano.',
  auto_message: '✅ Entendi! Estou transferindo você para um atendente humano. Aguarde um momento, por favor.',
  return_message: '🤖 O atendimento humano foi encerrado. Estou de volta! Como posso ajudar?',
};

export function BotHandoffTab({ customerProductId }: BotHandoffTabProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<HandoffConfig>(DEFAULT_CONFIG);
  const [sessions, setSessions] = useState<HandoffSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const sb = supabase as any;

  useEffect(() => {
    loadConfig();
    loadSessions();
  }, [customerProductId]);

  const loadConfig = async () => {
    try {
      const { data } = await sb
        .from('bot_handoff_config')
        .select('*')
        .eq('customer_product_id', customerProductId)
        .maybeSingle();

      if (data) {
        setConfig({
          id: data.id,
          is_enabled: data.is_enabled,
          pause_minutes: data.pause_minutes,
          notification_phone: data.notification_phone || '',
          notification_message: data.notification_message || DEFAULT_CONFIG.notification_message,
          auto_message: data.auto_message || DEFAULT_CONFIG.auto_message,
          return_message: data.return_message || DEFAULT_CONFIG.return_message,
        });
      }
    } catch (e) {
      console.error('Error loading handoff config:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const { data } = await sb
        .from('bot_handoff_sessions')
        .select('*')
        .eq('customer_product_id', customerProductId)
        .eq('status', 'active')
        .order('started_at', { ascending: false });

      setSessions(data || []);
    } catch (e) {
      console.error('Error loading handoff sessions:', e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        customer_product_id: customerProductId,
        is_enabled: config.is_enabled,
        pause_minutes: config.pause_minutes,
        notification_phone: config.notification_phone || null,
        notification_message: config.notification_message,
        auto_message: config.auto_message,
        return_message: config.return_message,
        // Keep DB column happy (it's NOT NULL with default). We send empty array since AI handles detection now.
        trigger_keywords: [] as string[],
      };

      if (config.id) {
        await sb.from('bot_handoff_config').update(payload).eq('id', config.id);
      } else {
        const { data } = await sb.from('bot_handoff_config').insert(payload).select('id').single();
        if (data) setConfig(prev => ({ ...prev, id: data.id }));
      }

      toast({ title: '✅ Salvo!', description: 'Configuração de atendimento humano atualizada.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const endSession = async (sessionId: string) => {
    try {
      await sb.from('bot_handoff_sessions').update({ status: 'expired' }).eq('id', sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast({ title: 'Sessão encerrada', description: 'O bot voltará a responder este cliente.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const formatPhone = (phone: string) => {
    if (phone.length >= 12) {
      return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
    }
    return phone;
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min atrás`;
    const hours = Math.floor(mins / 60);
    return `${hours}h atrás`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-orange-500/10 flex items-center justify-center ring-1 ring-orange-500/20">
            <UserCheck className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Atendimento Humano</h2>
            <p className="text-sm text-muted-foreground">
              A IA detecta automaticamente quando o cliente precisa falar com uma pessoa
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar alterações
        </Button>
      </div>

      {/* AI Detection Highlight */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">Detecção inteligente por IA</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A IA analisa cada mensagem e decide sozinha quando transferir para um humano —
                identifica pedidos explícitos ("quero falar com um atendente"), reclamações sérias,
                frustração ou situações delicadas que o bot não deve resolver. Sem precisar configurar palavras-chave.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      {sessions.length > 0 && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-500" />
              Atendimentos ativos ({sessions.length})
            </CardTitle>
            <CardDescription>
              O bot está pausado para estes clientes. Você pode encerrar manualmente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {sessions.map(session => (
              <div key={session.id} className="flex items-center justify-between p-3 rounded-lg bg-background border">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{formatPhone(session.phone)}</p>
                    <p className="text-xs text-muted-foreground">
                      Iniciado {timeAgo(session.started_at)} · Última msg {timeAgo(session.last_activity_at)}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => endSession(session.id)}>
                  Encerrar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Master Switch */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Ativar transferência para humano</p>
                <p className="text-sm text-muted-foreground">
                  Enquanto desativado, o bot responde tudo sozinho
                </p>
              </div>
            </div>
            <Switch
              checked={config.is_enabled}
              onCheckedChange={(v) => setConfig(prev => ({ ...prev, is_enabled: v }))}
            />
          </div>
        </CardContent>
      </Card>

      {config.is_enabled && (
        <>
          {/* Notification — primary now */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-orange-500" />
                Atendente que vai receber a notificação
              </CardTitle>
              <CardDescription>
                Quando a IA detectar que precisa transferir, este número recebe um WhatsApp avisando
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Telefone do atendente (com DDI + DDD)</Label>
                <Input
                  placeholder="5599999999999"
                  value={config.notification_phone}
                  onChange={e => setConfig(prev => ({ ...prev, notification_phone: e.target.value.replace(/\D/g, '') }))}
                />
                <p className="text-xs text-muted-foreground">
                  Formato: 55 (Brasil) + DDD + número, sem espaços ou símbolos. Ex: 5511988887777
                </p>
              </div>
              <div className="space-y-2">
                <Label>Mensagem que o atendente vai receber</Label>
                <Textarea
                  rows={2}
                  value={config.notification_message}
                  onChange={e => setConfig(prev => ({ ...prev, notification_message: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  O telefone do cliente e a mensagem dele são adicionados automaticamente ao final.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Pause Duration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Tempo de pausa do bot
              </CardTitle>
              <CardDescription>
                O bot fica em silêncio por este tempo após a última mensagem da conversa.
                Cada nova mensagem (cliente ou atendente) reinicia o cronômetro.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={5}
                  max={1440}
                  value={config.pause_minutes}
                  onChange={e => setConfig(prev => ({ ...prev, pause_minutes: Number(e.target.value) || 30 }))}
                  className="w-28"
                />
                <span className="text-sm text-muted-foreground">minutos</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Mínimo 5 min · Máximo 24h (1440 min) · Recomendado: 30 min
              </p>
            </CardContent>
          </Card>

          <Separator />

          {/* Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Mensagens automáticas
              </CardTitle>
              <CardDescription>
                Personalize o que o cliente vê durante e depois da transferência
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Mensagem ao iniciar a transferência</Label>
                <Textarea
                  rows={2}
                  value={config.auto_message}
                  onChange={e => setConfig(prev => ({ ...prev, auto_message: e.target.value }))}
                  placeholder="Enviada para o cliente quando a IA decidir transferir"
                />
              </div>
              <div className="space-y-2">
                <Label>Mensagem ao retomar o bot</Label>
                <Textarea
                  rows={2}
                  value={config.return_message}
                  onChange={e => setConfig(prev => ({ ...prev, return_message: e.target.value }))}
                  placeholder="Enviada quando o tempo de pausa acabar e o bot voltar a responder"
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
