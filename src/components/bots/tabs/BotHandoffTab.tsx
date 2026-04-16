import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserCheck, Clock, MessageSquare, Bell, X, Plus, Save, Loader2, Phone, Users } from 'lucide-react';

interface BotHandoffTabProps {
  customerProductId: string;
}

interface HandoffConfig {
  id?: string;
  is_enabled: boolean;
  trigger_keywords: string[];
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
  trigger_keywords: ['atendente', 'humano', 'pessoa', 'atendimento humano', 'falar com alguém', 'falar com humano'],
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
  const [newKeyword, setNewKeyword] = useState('');

  const sb = supabase as any;

  useEffect(() => {
    loadConfig();
    loadSessions();
  }, [customerProductId]);

  const loadConfig = async () => {
    try {
      const { data, error } = await sb
        .from('bot_handoff_config')
        .select('*')
        .eq('customer_product_id', customerProductId)
        .maybeSingle();

      if (data) {
        setConfig({
          id: data.id,
          is_enabled: data.is_enabled,
          trigger_keywords: data.trigger_keywords || DEFAULT_CONFIG.trigger_keywords,
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
        trigger_keywords: config.trigger_keywords,
        pause_minutes: config.pause_minutes,
        notification_phone: config.notification_phone || null,
        notification_message: config.notification_message,
        auto_message: config.auto_message,
        return_message: config.return_message,
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

  const addKeyword = () => {
    const kw = newKeyword.trim().toLowerCase();
    if (!kw || config.trigger_keywords.includes(kw)) return;
    setConfig(prev => ({ ...prev, trigger_keywords: [...prev.trigger_keywords, kw] }));
    setNewKeyword('');
  };

  const removeKeyword = (kw: string) => {
    setConfig(prev => ({ ...prev, trigger_keywords: prev.trigger_keywords.filter(k => k !== kw) }));
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <UserCheck className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Atendimento Humano</h2>
            <p className="text-sm text-muted-foreground">
              Transferência automática para atendente quando o cliente solicitar
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </div>

      {/* Active Sessions */}
      {sessions.length > 0 && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-500" />
              Atendimentos Ativos ({sessions.length})
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

      {/* Enable/Disable */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Ativar transferência para humano</p>
                <p className="text-sm text-muted-foreground">
                  O bot pausa quando o cliente pedir atendimento humano
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
          {/* Trigger Keywords */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Palavras-chave de Ativação
              </CardTitle>
              <CardDescription>
                Quando o cliente enviar uma mensagem contendo estas palavras, o bot transfere para humano
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {config.trigger_keywords.map(kw => (
                  <Badge key={kw} variant="secondary" className="px-3 py-1.5 gap-1.5">
                    {kw}
                    <button onClick={() => removeKeyword(kw)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Nova palavra-chave..."
                  value={newKeyword}
                  onChange={e => setNewKeyword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                />
                <Button variant="outline" size="icon" onClick={addKeyword}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pause Duration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Tempo de Pausa
              </CardTitle>
              <CardDescription>
                O bot fica pausado por este tempo após a ÚLTIMA mensagem na conversa.
                Se o atendente continuar conversando, o timer reinicia a cada mensagem.
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
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">minutos</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Mínimo 5 min, máximo 24h (1440 min). Recomendado: 30 min.
              </p>
            </CardContent>
          </Card>

          {/* Notification */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notificação do Atendente
              </CardTitle>
              <CardDescription>
                Número que receberá uma notificação quando o cliente pedir humano (opcional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Telefone do atendente (com DDD)</Label>
                <Input
                  placeholder="5599999999999"
                  value={config.notification_phone}
                  onChange={e => setConfig(prev => ({ ...prev, notification_phone: e.target.value }))}
                />
              </div>
              <div>
                <Label>Mensagem de notificação</Label>
                <Textarea
                  rows={2}
                  value={config.notification_message}
                  onChange={e => setConfig(prev => ({ ...prev, notification_message: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mensagens Automáticas</CardTitle>
              <CardDescription>
                Personalize as mensagens enviadas durante a transferência
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Mensagem ao iniciar transferência</Label>
                <Textarea
                  rows={2}
                  value={config.auto_message}
                  onChange={e => setConfig(prev => ({ ...prev, auto_message: e.target.value }))}
                  placeholder="Mensagem enviada quando o cliente pede atendimento humano"
                />
              </div>
              <div>
                <Label>Mensagem ao retomar bot</Label>
                <Textarea
                  rows={2}
                  value={config.return_message}
                  onChange={e => setConfig(prev => ({ ...prev, return_message: e.target.value }))}
                  placeholder="Mensagem enviada quando o bot volta a responder"
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
