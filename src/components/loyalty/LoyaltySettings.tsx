import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Settings, Save } from 'lucide-react';

interface LoyaltySettingsProps {
  customerProductId: string;
}

export function LoyaltySettings({ customerProductId }: LoyaltySettingsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    conversion_rate: '1.00',
    points_expiry_days: '',
    welcome_message: '',
    auto_send_messages: true
  });

  useEffect(() => {
    fetchSettings();
  }, [customerProductId]);

  const fetchSettings = async () => {
    const { data, error } = await (supabase
      .from('loyalty_settings' as any)
      .select('*')
      .eq('customer_product_id', customerProductId)
      .single() as any);

    if (error && error.code !== 'PGRST116') {
      toast({ title: "Erro", description: "Erro ao buscar configurações", variant: "destructive" });
      return;
    }

    if (data) {
      setSettings({
        conversion_rate: data.conversion_rate?.toString() || '1.00',
        points_expiry_days: data.points_expiry_days?.toString() || '',
        welcome_message: data.welcome_message || '',
        auto_send_messages: data.auto_send_messages
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const dataToSave = {
      customer_product_id: customerProductId,
      conversion_rate: parseFloat(settings.conversion_rate),
      points_expiry_days: settings.points_expiry_days ? parseInt(settings.points_expiry_days) : null,
      welcome_message: settings.welcome_message || null,
      auto_send_messages: settings.auto_send_messages
    };

    // Verificar se já existe configuração
    const { data: existing } = await (supabase
      .from('loyalty_settings' as any)
      .select('id')
      .eq('customer_product_id', customerProductId)
      .single() as any);

    let error;
    if (existing) {
      const result = await (supabase
        .from('loyalty_settings' as any)
        .update(dataToSave)
        .eq('customer_product_id', customerProductId) as any);
      error = result.error;
    } else {
      const result = await (supabase
        .from('loyalty_settings' as any)
        .insert(dataToSave) as any);
      error = result.error;
    }

    setLoading(false);

    if (error) {
      toast({ title: "Erro", description: "Erro ao salvar configurações", variant: "destructive" });
      return;
    }

    toast({ title: "Sucesso", description: "Configurações salvas com sucesso!" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          Configurações do Programa
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure as regras e parâmetros do seu programa de fidelidade
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Regras de Pontuação</CardTitle>
            <CardDescription>
              Defina como os pontos são acumulados e expiram
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="conversion_rate">
                Taxa de Conversão (R$ para Pontos)
              </Label>
              <Input
                id="conversion_rate"
                type="number"
                step="0.01"
                value={settings.conversion_rate}
                onChange={(e) => setSettings({ ...settings, conversion_rate: e.target.value })}
                placeholder="1.00"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Exemplo: 1.00 = R$1,00 equivale a 1 ponto
              </p>
            </div>

            <div>
              <Label htmlFor="points_expiry_days">
                Validade dos Pontos (dias)
              </Label>
              <Input
                id="points_expiry_days"
                type="number"
                value={settings.points_expiry_days}
                onChange={(e) => setSettings({ ...settings, points_expiry_days: e.target.value })}
                placeholder="Deixe vazio para pontos sem validade"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Pontos expirarão após este período de inatividade
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mensagens</CardTitle>
            <CardDescription>
              Configure mensagens automáticas do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="welcome_message">Mensagem de Boas-vindas</Label>
              <Textarea
                id="welcome_message"
                value={settings.welcome_message}
                onChange={(e) => setSettings({ ...settings, welcome_message: e.target.value })}
                rows={4}
                placeholder="Olá {cliente}! Bem-vindo ao nosso programa de fidelidade..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {'{cliente}'} para inserir o nome do cliente
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="auto_send_messages"
                checked={settings.auto_send_messages}
                onCheckedChange={(checked) => setSettings({ ...settings, auto_send_messages: checked })}
              />
              <Label htmlFor="auto_send_messages">
                Enviar mensagens automáticas via WhatsApp
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informações Adicionais</CardTitle>
            <CardDescription>
              Dicas para melhor utilização do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-semibold mb-1">💡 Dica de Conversão</p>
              <p className="text-muted-foreground">
                Uma taxa de conversão de 1:1 (R$1 = 1 ponto) é simples para os clientes entenderem.
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-semibold mb-1">⏰ Validade dos Pontos</p>
              <p className="text-muted-foreground">
                Recomendamos entre 180 e 365 dias para incentivar uso regular sem pressionar demais.
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-semibold mb-1">📱 Mensagens Automáticas</p>
              <p className="text-muted-foreground">
                Configure os templates na aba "Mensagens" para personalizar cada tipo de notificação.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </form>
    </div>
  );
}
