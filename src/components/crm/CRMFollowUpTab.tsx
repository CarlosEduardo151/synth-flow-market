import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, Clock, Loader2, Trash2, Pencil, Send, MessageCircle,
  Timer, Target, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Zap, Bell, BarChart3, Phone
} from "lucide-react";

interface CRMFollowUpTabProps {
  customerProductId: string;
}

interface FollowUpRule {
  id: string;
  name: string;
  trigger_type: string;
  delay_hours: number;
  max_attempts: number;
  message_template: string;
  is_active: boolean;
  channel: string;
  target_stage: string | null;
  created_at: string;
  updated_at: string;
}

interface FollowUpLog {
  id: string;
  rule_id: string | null;
  client_name: string;
  client_phone: string | null;
  message_sent: string;
  status: string;
  attempt_number: number;
  opportunity_id: string | null;
  sent_at: string | null;
  created_at: string;
}

const triggerTypes = [
  { value: "sem_resposta", label: "Sem Resposta", icon: Clock, description: "Cliente não respondeu após X horas" },
  { value: "oportunidade_parada", label: "Oportunidade Parada", icon: Target, description: "Oportunidade sem movimentação no pipeline" },
  { value: "pos_venda", label: "Pós-Venda", icon: CheckCircle2, description: "Após fechar uma venda" },
  { value: "lead_novo", label: "Lead Novo", icon: Zap, description: "Quando um novo lead entra no CRM" },
  { value: "personalizado", label: "Personalizado", icon: Bell, description: "Gatilho customizado" },
];

const stages = [
  { value: "novo_lead", label: "Novo Lead" },
  { value: "qualificacao", label: "Qualificação" },
  { value: "contato", label: "Contato Feito" },
  { value: "proposta", label: "Proposta" },
  { value: "negociacao", label: "Negociação" },
  { value: "compromisso", label: "Compromisso" },
];

const statusColors: Record<string, string> = {
  pendente: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  enviado: "bg-green-500/10 text-green-700 border-green-500/20",
  falha: "bg-red-500/10 text-red-700 border-red-500/20",
  respondido: "bg-blue-500/10 text-blue-700 border-blue-500/20",
};

const emptyForm = {
  name: "",
  trigger_type: "sem_resposta",
  delay_hours: 24,
  max_attempts: 3,
  message_template: "",
  channel: "whatsapp",
  target_stage: "",
  is_active: true,
};

export function CRMFollowUpTab({ customerProductId }: CRMFollowUpTabProps) {
  const [rules, setRules] = useState<FollowUpRule[]>([]);
  const [logs, setLogs] = useState<FollowUpLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<FollowUpRule | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [rulesRes, logsRes] = await Promise.all([
        supabase
          .from("crm_follow_up_rules" as any)
          .select("*")
          .eq("customer_product_id", customerProductId)
          .order("created_at", { ascending: false }),
        supabase
          .from("crm_follow_up_logs" as any)
          .select("*")
          .eq("customer_product_id", customerProductId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      setRules((rulesRes.data as any) || []);
      setLogs((logsRes.data as any) || []);
    } catch (err) {
      console.error("Error loading follow-up data:", err);
    } finally {
      setLoading(false);
    }
  }, [customerProductId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveRule = async () => {
    if (!form.name || !form.message_template) {
      toast.error("Preencha o nome e o template da mensagem");
      return;
    }
    setSaving(true);

    try {
      const payload = {
        customer_product_id: customerProductId,
        name: form.name,
        trigger_type: form.trigger_type,
        delay_hours: form.delay_hours,
        max_attempts: form.max_attempts,
        message_template: form.message_template,
        channel: form.channel,
        target_stage: form.target_stage || null,
        is_active: form.is_active,
      };

      if (editingRule) {
        await (supabase
          .from("crm_follow_up_rules" as any)
          .update(payload)
          .eq("id", editingRule.id) as any);
        toast.success("Regra atualizada!");
      } else {
        await (supabase.from("crm_follow_up_rules" as any).insert(payload) as any);
        toast.success("Regra criada!");
      }

      setFormOpen(false);
      setEditingRule(null);
      setForm(emptyForm);
      loadData();
    } catch {
      toast.error("Erro ao salvar regra");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await (supabase.from("crm_follow_up_rules" as any).delete().eq("id", id) as any);
      toast.success("Regra removida!");
      loadData();
    } catch {
      toast.error("Erro ao remover regra");
    }
  };

  const handleToggleRule = async (rule: FollowUpRule) => {
    try {
      await (supabase
        .from("crm_follow_up_rules" as any)
        .update({ is_active: !rule.is_active })
        .eq("id", rule.id) as any);
      loadData();
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  const handleEditRule = (rule: FollowUpRule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      trigger_type: rule.trigger_type,
      delay_hours: rule.delay_hours,
      max_attempts: rule.max_attempts,
      message_template: rule.message_template,
      channel: rule.channel,
      target_stage: rule.target_stage || "",
      is_active: rule.is_active,
    });
    setFormOpen(true);
  };

  const handleExecuteNow = async () => {
    setExecuting(true);
    try {
      const { data, error } = await supabase.functions.invoke("crm-follow-up", {
        body: { action: "execute", customerProductId },
      });
      if (error) throw error;
      toast.success(data?.message || "Follow-ups executados!");
      loadData();
    } catch {
      toast.error("Erro ao executar follow-ups");
    } finally {
      setExecuting(false);
    }
  };

  const getTriggerInfo = (type: string) =>
    triggerTypes.find((t) => t.value === type) || triggerTypes[4];

  const stats = {
    totalRules: rules.length,
    activeRules: rules.filter((r) => r.is_active).length,
    totalSent: logs.filter((l) => l.status === "enviado").length,
    totalPending: logs.filter((l) => l.status === "pendente").length,
    totalFailed: logs.filter((l) => l.status === "falha").length,
    totalReplied: logs.filter((l) => l.status === "respondido").length,
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Timer className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Follow-Up Automático</h2>
            <p className="text-sm text-muted-foreground">
              Configure regras de acompanhamento automático via WhatsApp
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExecuteNow}
            disabled={executing}
            className="gap-2"
          >
            {executing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Executar Agora
          </Button>
          <Dialog open={formOpen} onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) { setEditingRule(null); setForm(emptyForm); }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-3.5 w-3.5" />
                Nova Regra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingRule ? "Editar Regra" : "Nova Regra de Follow-Up"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                <div className="space-y-2">
                  <Label>Nome da Regra *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Lembrete 24h sem resposta"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Gatilho</Label>
                  <Select value={form.trigger_type} onValueChange={(v) => setForm({ ...form, trigger_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          <div className="flex items-center gap-2">
                            <t.icon className="h-3.5 w-3.5" />
                            {t.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {getTriggerInfo(form.trigger_type).description}
                  </p>
                </div>

                {(form.trigger_type === "oportunidade_parada") && (
                  <div className="space-y-2">
                    <Label>Estágio Alvo (opcional)</Label>
                    <Select value={form.target_stage} onValueChange={(v) => setForm({ ...form, target_stage: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Qualquer estágio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Qualquer estágio</SelectItem>
                        {stages.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Espera (horas)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={720}
                      value={form.delay_hours}
                      onChange={(e) => setForm({ ...form, delay_hours: parseInt(e.target.value) || 24 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {form.delay_hours >= 24 ? `${Math.floor(form.delay_hours / 24)} dia(s)` : `${form.delay_hours}h`}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Máx. Tentativas</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={form.max_attempts}
                      onChange={(e) => setForm({ ...form, max_attempts: parseInt(e.target.value) || 3 })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Template da Mensagem *</Label>
                  <Textarea
                    value={form.message_template}
                    onChange={(e) => setForm({ ...form, message_template: e.target.value })}
                    placeholder={`Olá {{nome}}, tudo bem?\n\nNotei que ainda não tivemos retorno sobre {{assunto}}.\n\nPosso ajudar em algo?`}
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Variáveis disponíveis: {"{{nome}}"}, {"{{empresa}}"}, {"{{assunto}}"}, {"{{dias}}"}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Canal de Envio</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">WhatsApp</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Ativar regra</Label>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button onClick={handleSaveRule} disabled={saving || !form.name || !form.message_template}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                  {editingRule ? "Salvar Alterações" : "Criar Regra"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totalRules}</p>
              <p className="text-xs text-muted-foreground">Regras</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.activeRules}</p>
              <p className="text-xs text-muted-foreground">Ativas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Send className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totalSent}</p>
              <p className="text-xs text-muted-foreground">Enviados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totalPending}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totalFailed}</p>
              <p className="text-xs text-muted-foreground">Falhas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <MessageCircle className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totalReplied}</p>
              <p className="text-xs text-muted-foreground">Respondidos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Regras de Follow-Up</CardTitle>
            <Badge variant="secondary" className="text-xs">{rules.length}</Badge>
          </div>
          <CardDescription>Configure quando e como acompanhar seus clientes automaticamente</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {rules.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground px-6">
              <Timer className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-sm">Nenhuma regra de follow-up configurada</p>
              <p className="text-xs mt-1">Clique em "Nova Regra" para começar a automatizar seus acompanhamentos.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {rules.map((rule) => {
                const trigger = getTriggerInfo(rule.trigger_type);
                const TriggerIcon = trigger.icon;
                return (
                  <div key={rule.id} className="px-4 py-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg ${rule.is_active ? "bg-primary/10" : "bg-muted"} shrink-0 mt-0.5`}>
                          <TriggerIcon className={`h-4 w-4 ${rule.is_active ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">{rule.name}</span>
                            <Badge variant={rule.is_active ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                              {rule.is_active ? "Ativa" : "Inativa"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{trigger.description}</p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              {rule.delay_hours}h de espera
                            </Badge>
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <RefreshCw className="h-2.5 w-2.5" />
                              Máx. {rule.max_attempts}x
                            </Badge>
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <Phone className="h-2.5 w-2.5" />
                              WhatsApp
                            </Badge>
                            {rule.target_stage && (
                              <Badge variant="outline" className="text-[10px] gap-1">
                                <Target className="h-2.5 w-2.5" />
                                {stages.find((s) => s.value === rule.target_stage)?.label || rule.target_stage}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-2 bg-muted/30 rounded-md p-2">
                            <p className="text-xs text-muted-foreground line-clamp-2 italic">"{rule.message_template}"</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={() => handleToggleRule(rule)}
                          className="scale-75"
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditRule(rule)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteRule(rule.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">Histórico de Follow-Ups</CardTitle>
            <Badge variant="secondary" className="text-xs">{logs.length}</Badge>
          </div>
          <CardDescription>Registro de todas as mensagens de acompanhamento enviadas</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground px-6">
              <Send className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-sm">Nenhum follow-up executado ainda</p>
              <p className="text-xs mt-1">Os logs aparecerão aqui quando as regras forem acionadas.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {logs.map((log) => (
                <div key={log.id} className="px-4 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{log.client_name}</span>
                        {log.client_phone && (
                          <span className="text-xs text-muted-foreground">{log.client_phone}</span>
                        )}
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColors[log.status] || ""}`}>
                          {log.status === "enviado" && <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />}
                          {log.status === "falha" && <XCircle className="h-2.5 w-2.5 mr-0.5" />}
                          {log.status === "pendente" && <Clock className="h-2.5 w-2.5 mr-0.5" />}
                          {log.status === "respondido" && <MessageCircle className="h-2.5 w-2.5 mr-0.5" />}
                          {log.status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Tentativa {log.attempt_number}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{log.message_sent}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {log.sent_at
                          ? new Date(log.sent_at).toLocaleString("pt-BR")
                          : new Date(log.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
