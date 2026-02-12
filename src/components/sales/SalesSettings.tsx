import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Settings,
  Zap,
  Clock,
  Brain,
  Link,
  Save,
  RefreshCw,
  Copy
} from 'lucide-react';

interface SalesSettingsProps {
  customerProductId: string;
}

interface Config {
  auto_follow_up_enabled: boolean;
  follow_up_delay_hours: number;
  lead_scoring_enabled: boolean;
  auto_prioritization_enabled: boolean;
  webhook_url: string;
  crm_integration_enabled: boolean;
  crm_api_key: string;
  ai_prospecting_enabled: boolean;
}

export function SalesSettings({ customerProductId }: SalesSettingsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [webhookToken, setWebhookToken] = useState<string>('');
  const [config, setConfig] = useState<Config>({
    auto_follow_up_enabled: true,
    follow_up_delay_hours: 24,
    lead_scoring_enabled: true,
    auto_prioritization_enabled: true,
    webhook_url: '',
    crm_integration_enabled: false,
    crm_api_key: '',
    ai_prospecting_enabled: false
  });

  useEffect(() => {
    loadConfig();
    loadWebhookToken();
  }, [customerProductId]);

  const loadWebhookToken = async () => {
    const { data } = await (supabase as any)
      .from('customer_products')
      .select('webhook_token')
      .eq('id', customerProductId)
      .single();
    
    if (data?.webhook_token) {
      setWebhookToken(data.webhook_token);
    }
  };

  const loadConfig = async () => {
    setIsLoading(true);
    const { data, error } = await (supabase as any)
      .from('sales_assistant_config')
      .select('*')
      .eq('customer_product_id', customerProductId)
      .single();

    if (data) {
      setConfig({
        auto_follow_up_enabled: data.auto_follow_up_enabled ?? true,
        follow_up_delay_hours: data.follow_up_delay_hours ?? 24,
        lead_scoring_enabled: data.lead_scoring_enabled ?? true,
        auto_prioritization_enabled: data.auto_prioritization_enabled ?? true,
        webhook_url: data.webhook_url ?? '',
        crm_integration_enabled: data.crm_integration_enabled ?? false,
        crm_api_key: data.crm_api_key ?? '',
        ai_prospecting_enabled: data.ai_prospecting_enabled ?? false
      });
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);

    const { error } = await (supabase as any)
      .from('sales_assistant_config')
      .upsert({
        customer_product_id: customerProductId,
        ...config
      }, {
        onConflict: 'customer_product_id'
      });

    if (error) {
      toast({ title: 'Erro ao salvar configurações', variant: 'destructive' });
    } else {
      toast({ title: 'Configurações salvas com sucesso!' });
    }
    setIsSaving(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado para a área de transferência!' });
  };

  const webhookEndpoint = `https://agndhravgmcwpdjkozka.supabase.co/functions/v1/sales-webhook?token=${webhookToken}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Configurações</h2>
        <p className="text-muted-foreground">Configure o comportamento do assistente de vendas</p>
      </div>

      {/* Automação */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <CardTitle>Automação</CardTitle>
          </div>
          <CardDescription>Configure as automações do assistente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Follow-up Automático</Label>
              <p className="text-sm text-muted-foreground">
                Agendar follow-ups automaticamente após contato inicial
              </p>
            </div>
            <Switch
              checked={config.auto_follow_up_enabled}
              onCheckedChange={(v) => setConfig({ ...config, auto_follow_up_enabled: v })}
            />
          </div>

          {config.auto_follow_up_enabled && (
            <div className="space-y-2 pl-4 border-l-2 border-primary/20">
              <Label>Tempo de espera (horas)</Label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={config.follow_up_delay_hours}
                  onChange={(e) => setConfig({ ...config, follow_up_delay_hours: parseInt(e.target.value) || 24 })}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">horas após último contato</span>
              </div>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Priorização Automática</Label>
              <p className="text-sm text-muted-foreground">
                Ajustar prioridade dos leads com base em comportamento
              </p>
            </div>
            <Switch
              checked={config.auto_prioritization_enabled}
              onCheckedChange={(v) => setConfig({ ...config, auto_prioritization_enabled: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* IA */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <CardTitle>Inteligência Artificial</CardTitle>
          </div>
          <CardDescription>Configure os recursos de IA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Score de Leads por IA</Label>
              <p className="text-sm text-muted-foreground">
                Calcular automaticamente o score de qualificação
              </p>
            </div>
            <Switch
              checked={config.lead_scoring_enabled}
              onCheckedChange={(v) => setConfig({ ...config, lead_scoring_enabled: v })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Prospecção com IA</Label>
              <p className="text-sm text-muted-foreground">
                Sugestões automáticas de novos leads (em breve)
              </p>
            </div>
            <Switch
              checked={config.ai_prospecting_enabled}
              onCheckedChange={(v) => setConfig({ ...config, ai_prospecting_enabled: v })}
              disabled
            />
          </div>
        </CardContent>
      </Card>

      {/* Integrações */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link className="h-5 w-5 text-blue-500" />
            <CardTitle>Integrações</CardTitle>
          </div>
          <CardDescription>Conecte com outras ferramentas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label>Webhook para Receber Leads</Label>
            <div className="flex gap-2">
              <Input
                value={webhookEndpoint}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(webhookEndpoint)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Use este endpoint para enviar leads de outras fontes (n8n, Zapier, etc.)
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label>Webhook n8n (Notificações)</Label>
            <Input
              value={config.webhook_url}
              onChange={(e) => setConfig({ ...config, webhook_url: e.target.value })}
              placeholder="https://seu-n8n.com/webhook/..."
            />
            <p className="text-sm text-muted-foreground">
              Receba notificações de novos leads e eventos no n8n
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Integração CRM Externo</Label>
              <p className="text-sm text-muted-foreground">
                Sincronizar leads com CRM externo (em breve)
              </p>
            </div>
            <Switch
              checked={config.crm_integration_enabled}
              onCheckedChange={(v) => setConfig({ ...config, crm_integration_enabled: v })}
              disabled
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
