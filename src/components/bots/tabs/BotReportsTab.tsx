import { useState, useEffect, useCallback } from 'react';
import {
  Mail, Plus, Trash2, RefreshCw, Loader2, Clock, CalendarDays,
  Send, CheckCircle2, XCircle, BarChart3, Settings2, TestTube,
  ChevronDown, ChevronUp, Pencil, AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const sb = supabase as any;

interface ReportConfig {
  id: string;
  customer_product_id: string;
  is_active: boolean;
  frequency: string;
  send_day: number;
  send_hour: number;
  recipient_email: string;
  recipient_name: string | null;
  report_sections: string[];
  last_sent_at: string | null;
  created_at: string;
}

interface ReportLog {
  id: string;
  sent_at: string;
  recipient_email: string;
  frequency: string;
  period_start: string;
  period_end: string;
  status: string;
  error_message: string | null;
}

interface BotReportsTabProps {
  customerProductId: string;
}

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Diário', description: 'Todos os dias' },
  { value: 'weekly', label: 'Semanal', description: 'Uma vez por semana' },
  { value: 'monthly', label: 'Mensal', description: 'Uma vez por mês' },
];

const DAY_OF_WEEK = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const SECTION_OPTIONS = [
  { key: 'summary', label: 'Resumo Geral', description: 'Totais de mensagens, contatos e respostas' },
  { key: 'conversations', label: 'Conversas', description: 'Detalhes de mensagens recebidas/enviadas' },
  { key: 'faq_hits', label: 'FAQ Automático', description: 'FAQs mais usadas e economia de tokens' },
  { key: 'tokens', label: 'Uso de Tokens', description: 'Consumo de tokens e custo estimado' },
  { key: 'top_questions', label: 'Perguntas Frequentes', description: 'Perguntas mais feitas pelos clientes' },
];

export function BotReportsTab({ customerProductId }: BotReportsTabProps) {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<ReportConfig[]>([]);
  const [logs, setLogs] = useState<ReportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formFrequency, setFormFrequency] = useState('weekly');
  const [formDay, setFormDay] = useState(1);
  const [formHour, setFormHour] = useState(9);
  const [formSections, setFormSections] = useState<string[]>(['summary', 'conversations', 'faq_hits', 'tokens', 'top_questions']);

  const fetchData = useCallback(async () => {
    try {
      const [configRes, logRes] = await Promise.all([
        sb.from('bot_report_config').select('*').eq('customer_product_id', customerProductId).order('created_at', { ascending: false }),
        sb.from('bot_report_logs').select('*').eq('customer_product_id', customerProductId).order('sent_at', { ascending: false }).limit(20),
      ]);
      setConfigs(configRes.data || []);
      setLogs(logRes.data || []);
    } catch (e) {
      console.error('fetch reports error:', e);
    } finally {
      setLoading(false);
    }
  }, [customerProductId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getInvokeErrorMessage = async (error: any) => {
    try {
      if (typeof error?.context?.json === 'function') {
        const payload = await error.context.json();
        if (payload?.error) return payload.error;
        if (payload?.message) return payload.message;
      }

      if (typeof error?.context?.text === 'function') {
        const raw = await error.context.text();
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.error) return parsed.error;
          if (parsed?.message) return parsed.message;
        } catch {
          if (raw) return raw;
        }
      }
    } catch {
      // ignore parse errors
    }

    return error?.message || 'Falha ao executar a ação';
  };

  const resetForm = () => {
    setFormEmail(''); setFormName(''); setFormFrequency('weekly');
    setFormDay(1); setFormHour(9); setEditingId(null);
    setFormSections(['summary', 'conversations', 'faq_hits', 'tokens', 'top_questions']);
  };

  const openEdit = (c: ReportConfig) => {
    setFormEmail(c.recipient_email);
    setFormName(c.recipient_name || '');
    setFormFrequency(c.frequency);
    setFormDay(c.send_day);
    setFormHour(c.send_hour);
    setFormSections(c.report_sections || []);
    setEditingId(c.id);
    setAddDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formEmail.trim()) {
      toast({ title: 'Informe o e-mail', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        customer_product_id: customerProductId,
        recipient_email: formEmail.trim(),
        recipient_name: formName.trim() || null,
        frequency: formFrequency,
        send_day: formDay,
        send_hour: formHour,
        report_sections: formSections,
      };

      if (editingId) {
        const { error } = await sb.from('bot_report_config').update(payload).eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Relatório atualizado!' });
      } else {
        const { error } = await sb.from('bot_report_config').insert(payload);
        if (error) throw error;
        toast({ title: 'Relatório agendado!' });
      }

      resetForm();
      setAddDialogOpen(false);
      fetchData();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (c: ReportConfig) => {
    try {
      await sb.from('bot_report_config').update({ is_active: !c.is_active }).eq('id', c.id);
      setConfigs(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !x.is_active } : x));
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await sb.from('bot_report_config').delete().eq('id', id);
      toast({ title: 'Relatório removido!' });
      setConfigs(prev => prev.filter(x => x.id !== id));
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleSendTest = async (email: string) => {
    setSendingTest(true);
    try {
      const { data, error } = await sb.functions.invoke('bot-send-report', {
        body: {
          action: 'send_test',
          customer_product_id: customerProductId,
          email,
        },
      });
      if (error) throw error;
      toast({ title: '📧 E-mail de teste enviado!', description: `Verifique ${email}` });
    } catch (e: any) {
      const details = await getInvokeErrorMessage(e);
      toast({ title: 'Erro ao enviar teste', description: details, variant: 'destructive' });
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendNow = async (c: ReportConfig) => {
    setSendingTest(true);
    try {
      const { error } = await sb.functions.invoke('bot-send-report', {
        body: {
          action: 'send_report',
          customer_product_id: customerProductId,
          config_id: c.id,
        },
      });
      if (error) throw error;
      toast({ title: '📧 Relatório enviado!', description: `Enviado para ${c.recipient_email}` });
      fetchData();
    } catch (e: any) {
      const details = await getInvokeErrorMessage(e);
      toast({ title: 'Erro', description: details, variant: 'destructive' });
    } finally {
      setSendingTest(false);
    }
  };

  const toggleSection = (key: string) => {
    setFormSections(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
  };

  // Stats
  const activeConfigs = configs.filter(c => c.is_active).length;
  const totalSent = logs.filter(l => l.status === 'sent').length;
  const lastSent = logs.find(l => l.status === 'sent');

  const getFrequencyLabel = (freq: string) => {
    return FREQUENCY_OPTIONS.find(f => f.value === freq)?.label || freq;
  };

  const getScheduleLabel = (c: ReportConfig) => {
    const hour = `${c.send_hour}:00`;
    if (c.frequency === 'daily') return `Diário às ${hour}`;
    if (c.frequency === 'weekly') return `${DAY_OF_WEEK[c.send_day]} às ${hour}`;
    return `Dia ${c.send_day} às ${hour}`;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">{activeConfigs}</p>
              <p className="text-xs text-muted-foreground">Relatórios ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-500/10">
              <Send className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">{totalSent}</p>
              <p className="text-xs text-muted-foreground">E-mails enviados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10">
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">
                {lastSent ? new Date(lastSent.sent_at).toLocaleDateString('pt-BR') : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Último envio</p>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Configurações de Relatório
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="rounded-xl">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={(o) => { setAddDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl">
                <Plus className="h-4 w-4 mr-2" />
                Novo Relatório
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  {editingId ? 'Editar Relatório' : 'Novo Relatório'}
                </DialogTitle>
                <DialogDescription>
                  Configure o envio automático de relatórios por e-mail.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                {/* Recipient */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Destinatário
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">E-mail *</Label>
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        value={formEmail}
                        onChange={e => setFormEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nome (opcional)</Label>
                      <Input
                        placeholder="João"
                        value={formName}
                        onChange={e => setFormName(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Schedule */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    Agendamento
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Frequência</Label>
                      <Select value={formFrequency} onValueChange={setFormFrequency}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FREQUENCY_OPTIONS.map(f => (
                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {formFrequency === 'weekly' && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Dia da Semana</Label>
                        <Select value={String(formDay)} onValueChange={v => setFormDay(Number(v))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DAY_OF_WEEK.map((d, i) => (
                              <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {formFrequency === 'monthly' && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Dia do Mês</Label>
                        <Select value={String(formDay)} onValueChange={v => setFormDay(Number(v))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 28 }, (_, i) => (
                              <SelectItem key={i + 1} value={String(i + 1)}>Dia {i + 1}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Horário (UTC)</Label>
                      <Select value={String(formHour)} onValueChange={v => setFormHour(Number(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={String(i)}>{String(i).padStart(2, '0')}:00</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Sections */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                    Seções do Relatório
                  </h4>
                  <div className="space-y-2">
                    {SECTION_OPTIONS.map(s => (
                      <div
                        key={s.key}
                        className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:border-border transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium">{s.label}</p>
                          <p className="text-[10px] text-muted-foreground">{s.description}</p>
                        </div>
                        <Switch
                          checked={formSections.includes(s.key)}
                          onCheckedChange={() => toggleSection(s.key)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => { setAddDialogOpen(false); resetForm(); }} className="rounded-xl">
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={submitting} className="rounded-xl">
                  {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  {editingId ? 'Atualizar' : 'Agendar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Config List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : configs.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h4 className="text-lg font-semibold mb-2">Nenhum relatório configurado</h4>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Configure relatórios automáticos para receber resumos do desempenho do seu bot por e-mail.
            </p>
            <Button onClick={() => setAddDialogOpen(true)} className="rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro relatório
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {configs.map(c => {
            const isExpanded = expandedId === c.id;
            const configLogs = logs.filter(l => l.recipient_email === c.recipient_email);
            return (
              <Card key={c.id} className={`border-border/50 transition-all ${!c.is_active ? 'opacity-50' : 'hover:border-border'}`}>
                <CardContent className="p-0">
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  >
                    <div className="p-2 rounded-xl bg-primary/10 flex-shrink-0">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{c.recipient_email}</p>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {getFrequencyLabel(c.frequency)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {getScheduleLabel(c)}
                        {c.last_sent_at && ` • Último: ${new Date(c.last_sent_at).toLocaleDateString('pt-BR')}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch
                        checked={c.is_active}
                        onCheckedChange={() => handleToggle(c)}
                        onClick={e => e.stopPropagation()}
                      />
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border/30">
                      <div className="pt-3 space-y-4">
                        {/* Sections */}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Seções incluídas:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {(c.report_sections || []).map(s => {
                              const sec = SECTION_OPTIONS.find(x => x.key === s);
                              return (
                                <Badge key={s} variant="outline" className="text-[10px] px-2 py-0.5">
                                  {sec?.label || s}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>

                        {/* Recent logs */}
                        {configLogs.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">Histórico recente:</p>
                            <div className="space-y-1">
                              {configLogs.slice(0, 5).map(l => (
                                <div key={l.id} className="flex items-center gap-2 text-xs">
                                  {l.status === 'sent' ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <XCircle className="h-3 w-3 text-destructive" />
                                  )}
                                  <span className="text-muted-foreground">
                                    {new Date(l.sent_at).toLocaleDateString('pt-BR')} {new Date(l.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                                    {getFrequencyLabel(l.frequency)}
                                  </Badge>
                                  {l.error_message && (
                                    <span className="text-destructive truncate max-w-[200px]">{l.error_message}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2">
                          <p className="text-[10px] text-muted-foreground">
                            Criado em {new Date(c.created_at).toLocaleDateString('pt-BR')}
                          </p>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 text-xs rounded-lg"
                              disabled={sendingTest}
                              onClick={() => handleSendTest(c.recipient_email)}
                            >
                              <TestTube className="h-3 w-3 mr-1" />
                              Teste
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 text-xs rounded-lg"
                              disabled={sendingTest}
                              onClick={() => handleSendNow(c)}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Enviar Agora
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 text-xs rounded-lg"
                              onClick={() => openEdit(c)}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Editar
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 text-xs rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(c.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Excluir
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
