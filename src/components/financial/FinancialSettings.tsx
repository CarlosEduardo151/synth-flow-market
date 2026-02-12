import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save, Building, User, Bell, Copy, Key, ShieldCheck } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  customerProductId: string;
  mode: 'personal' | 'business';
  onModeChange: (mode: 'personal' | 'business') => void;
}

interface Config {
  id: string;
  mode: string;
  business_name: string | null;
  currency: string;
  monthly_budget: number | null;
  alert_threshold: number;
  n8n_webhook_url: string | null;
  webhook_token: string;
}

export function FinancialSettings({ customerProductId, mode, onModeChange }: Props) {
  void mode;
  const { user } = useAuth();
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agentPermissions, setAgentPermissions] = useState<{ goals: { create: boolean; update: boolean; delete: boolean } }>(
    { goals: { create: true, update: true, delete: true } }
  );
  const { toast } = useToast();

  useEffect(() => {
    fetchConfig();
    fetchPermissions();
  }, [customerProductId]);

  const fetchConfig = async () => {
    setLoading(true);
    const { data, error } = await (supabase
      .from('financial_agent_config' as any)
      .select('*')
      .eq('customer_product_id', customerProductId)
      .single() as any);

    if (error && error.code !== 'PGRST116') {
      toast({ title: "Erro ao carregar configurações", variant: "destructive" });
    } else if (data) {
      setConfig(data as Config);
    }
    setLoading(false);
  };

  const fetchPermissions = async () => {
    if (!user) return;
    const { data, error } = await (supabase
      .from('financial_agent_permissions' as any)
      .select('permissions')
      .eq('customer_product_id', customerProductId)
      .eq('user_id', user.id)
      .maybeSingle() as any);

    if (error) {
      console.error('Error loading permissions:', error);
      return;
    }

    const perms = (data?.permissions || {}) as any;
    const goals = perms?.goals;
    if (goals) {
      setAgentPermissions({
        goals: {
          create: goals.create !== false,
          update: goals.update !== false,
          delete: goals.delete !== false,
        },
      });
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);

    const { error } = await (supabase
      .from('financial_agent_config' as any)
      .update({
        mode: config.mode,
        business_name: config.business_name,
        currency: config.currency,
        monthly_budget: config.monthly_budget,
        alert_threshold: config.alert_threshold,
        n8n_webhook_url: config.n8n_webhook_url
      })
      .eq('id', config.id) as any);

    if (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
      setSaving(false);
      return;
    }

    // Save permissions (goals)
    if (user) {
      const { error: permErr } = await supabase
        .from('financial_agent_permissions' as any)
        .upsert(
          {
            user_id: user.id,
            customer_product_id: customerProductId,
            permissions: agentPermissions,
          },
          { onConflict: 'customer_product_id' }
        );

      if (permErr) {
        console.error('Error saving permissions:', permErr);
        toast({ title: 'Permissões não foram salvas', variant: 'destructive' });
      }
    }

    toast({ title: "Configurações salvas!" });
    onModeChange(config.mode as 'personal' | 'business');
    setSaving(false);
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[...Array(4)].map((_, i) => <Card key={i} className="h-24 bg-muted/50" />)}
    </div>;
  }

  if (!config) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Configurações não encontradas</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Configurações</h2>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      {/* Mode Selection */}
      <Card className="p-6 bg-card/80 backdrop-blur-sm">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          {config.mode === 'business' ? <Building className="h-5 w-5" /> : <User className="h-5 w-5" />}
          Modo de Uso
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setConfig({ ...config, mode: 'personal' })}
            className={`p-6 rounded-lg border-2 transition-all text-left ${
              config.mode === 'personal'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <User className={`h-8 w-8 mb-3 ${config.mode === 'personal' ? 'text-primary' : 'text-muted-foreground'}`} />
            <h4 className="font-semibold mb-1">Pessoa Física</h4>
            <p className="text-sm text-muted-foreground">
              Controle suas finanças pessoais, contas de casa, gastos do dia a dia.
            </p>
          </button>

          <button
            onClick={() => setConfig({ ...config, mode: 'business' })}
            className={`p-6 rounded-lg border-2 transition-all text-left ${
              config.mode === 'business'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <Building className={`h-8 w-8 mb-3 ${config.mode === 'business' ? 'text-primary' : 'text-muted-foreground'}`} />
            <h4 className="font-semibold mb-1">Empresarial</h4>
            <p className="text-sm text-muted-foreground">
              Gerencie as finanças da sua empresa, fluxo de caixa, DRE.
            </p>
          </button>
        </div>
      </Card>

      {/* Business Settings */}
      {config.mode === 'business' && (
        <Card className="p-6 bg-card/80 backdrop-blur-sm">
          <h3 className="text-lg font-semibold mb-4">Dados da Empresa</h3>
          <div className="space-y-4">
            <div>
              <Label>Nome da Empresa</Label>
              <Input
                placeholder="Minha Empresa LTDA"
                value={config.business_name || ''}
                onChange={(e) => setConfig({ ...config, business_name: e.target.value })}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Budget & Alerts */}
      <Card className="p-6 bg-card/80 backdrop-blur-sm">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Orçamento e Alertas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>Orçamento Mensal (R$)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={config.monthly_budget || ''}
              onChange={(e) => setConfig({ ...config, monthly_budget: parseFloat(e.target.value) || null })}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Defina um limite de gastos mensais
            </p>
          </div>

          <div>
            <Label>Alerta de Limite (%)</Label>
            <Select 
              value={config.alert_threshold.toString()}
              onValueChange={(v) => setConfig({ ...config, alert_threshold: parseInt(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50%</SelectItem>
                <SelectItem value="70">70%</SelectItem>
                <SelectItem value="80">80%</SelectItem>
                <SelectItem value="90">90%</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              Receba alertas ao atingir este percentual do orçamento
            </p>
          </div>
        </div>
      </Card>

      {/* API Token */}
      <Card className="p-6 bg-card/80 backdrop-blur-sm border-primary/30">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          API do Agente Financeiro
        </h3>
        <div className="space-y-4">
          <div>
            <Label>Seu Token de API</Label>
            <div className="flex gap-2 mt-1">
              <Input
                readOnly
                value={config.webhook_token}
                className="font-mono text-sm bg-muted"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(config.webhook_token);
                  toast({ title: "Token copiado!" });
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Use este token para autenticar chamadas à API do Agente Financeiro.
            </p>
          </div>

          <div>
            <Label>URL da API</Label>
            <div className="flex gap-2 mt-1">
              <Input
                readOnly
                value="https://agndhravgmcwpdjkozka.supabase.co/functions/v1/financial-agent-api"
                className="font-mono text-xs bg-muted"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText("https://agndhravgmcwpdjkozka.supabase.co/functions/v1/financial-agent-api");
                  toast({ title: "URL copiada!" });
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg mt-4">
            <p className="text-sm font-medium mb-2">Exemplo de uso no n8n (HTTP Request):</p>
            <pre className="text-xs bg-background p-3 rounded overflow-x-auto">
{`POST https://agndhravgmcwpdjkozka.supabase.co/functions/v1/financial-agent-api
Content-Type: application/json

{
  "webhook_token": "${config.webhook_token}",
  "recurso": "transacoes",
  "operacao": "criar",
  "dados": {
    "type": "expense",
    "amount": 150.00,
    "description": "Compra de material"
  }
}`}
            </pre>
          </div>
        </div>
      </Card>

      {/* Integration Settings */}
      <Card className="p-6 bg-card/80 backdrop-blur-sm">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Permissões do Agente
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Controle o que o agente pode <strong>propor</strong> para aprovação (nada é executado sem você aprovar).
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
            <div>
              <div className="font-medium">Metas: criar</div>
              <div className="text-sm text-muted-foreground">Permitir que o agente proponha criação de metas.</div>
            </div>
            <Switch
              checked={agentPermissions.goals.create}
              onCheckedChange={(checked) =>
                setAgentPermissions((p) => ({ ...p, goals: { ...p.goals, create: checked } }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
            <div>
              <div className="font-medium">Metas: editar</div>
              <div className="text-sm text-muted-foreground">Permitir que o agente proponha alteração de metas.</div>
            </div>
            <Switch
              checked={agentPermissions.goals.update}
              onCheckedChange={(checked) =>
                setAgentPermissions((p) => ({ ...p, goals: { ...p.goals, update: checked } }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
            <div>
              <div className="font-medium">Metas: apagar</div>
              <div className="text-sm text-muted-foreground">Permitir que o agente proponha exclusão de metas.</div>
            </div>
            <Switch
              checked={agentPermissions.goals.delete}
              onCheckedChange={(checked) =>
                setAgentPermissions((p) => ({ ...p, goals: { ...p.goals, delete: checked } }))
              }
            />
          </div>

          <div className="pt-2">
            <Label className="text-xs text-muted-foreground">(Opcional) Webhook externo</Label>
            <Input
              placeholder="https://..."
              value={config.n8n_webhook_url || ''}
              onChange={(e) => setConfig({ ...config, n8n_webhook_url: e.target.value })}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
