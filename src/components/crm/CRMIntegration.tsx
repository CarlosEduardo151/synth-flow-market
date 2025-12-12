import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CRMIntegrationProps {
  customerProductId: string;
}

export const CRMIntegration = ({ customerProductId }: CRMIntegrationProps) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [webhookToken, setWebhookToken] = useState('');

  const projectId = 'agndhravgmcwpdjkozka';
  const endpointUrl = webhookToken 
    ? `https://${projectId}.supabase.co/functions/v1/crm-webhook?token=${webhookToken}`
    : "Carregando...";

  useEffect(() => {
    loadConfig();
  }, [customerProductId]);

  const loadConfig = async () => {
    // Carregar token do customer_product
    const { data: cpData } = await supabase
      .from('customer_products')
      .select('webhook_token')
      .eq('id', customerProductId)
      .single();

    if (cpData?.webhook_token) {
      setWebhookToken(cpData.webhook_token);
    }

    // Carregar config do webhook
    const { data } = await supabase
      .from('crm_webhook_config')
      .select('*')
      .eq('customer_product_id', customerProductId)
      .maybeSingle();

    if (data) {
      setWebhookUrl(data.webhook_url || '');
      setIsActive(data.is_active || false);
    }
  };

  const handleSaveConfig = async () => {
    const { error } = await supabase
      .from('crm_webhook_config')
      .upsert({
        customer_product_id: customerProductId,
        webhook_url: webhookUrl,
        is_active: true
      }, { onConflict: 'customer_product_id' });

    if (!error) {
      toast({ title: "Configuração salva com sucesso!" });
      setIsActive(true);
    } else {
      toast({ title: "Erro ao salvar configuração", variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado para área de transferência!" });
  };

  const examplePayload = {
    cliente: "João Silva",
    telefone: "11 99999-9999",
    email: "joao@email.com",
    status: "em_negociacao",
    empresa: "Empresa XYZ",
    cargo: "Gerente",
    descricao: "Cliente interessado em nossos serviços premium",
    operacao: "adicionar"
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Integração com Agente de IA</CardTitle>
              <CardDescription>Configure o webhook para receber dados automaticamente</CardDescription>
            </div>
            {isActive && (
              <Badge className="bg-green-500">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Ativo
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Endpoint do Webhook (Use esta URL exclusiva)</Label>
            <div className="flex gap-2">
              <Input value={endpointUrl} readOnly className="font-mono text-sm" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(endpointUrl)}
                disabled={!webhookToken}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure para enviar requisições HTTP POST para este endpoint
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              ⚠️ Esta URL contém seu token exclusivo. Não compartilhe publicamente.
            </p>
          </div>

          <div className="space-y-2">
            <Label>URL do seu Webhook (opcional)</Label>
            <Input
              placeholder="https://seu-webhook.com/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Se você quiser receber notificações de volta
            </p>
          </div>

          <Button onClick={handleSaveConfig} className="w-full">
            Salvar Configuração
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Formato do Payload JSON</CardTitle>
          <CardDescription>Use este formato ao enviar dados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
              <pre>{JSON.stringify(examplePayload, null, 2)}</pre>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Campos Obrigatórios:</h4>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li><code className="bg-muted px-1 rounded">cliente</code>: Nome do cliente</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                ℹ️ O token já está na URL, não precisa enviar customer_product_id
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Campos Opcionais:</h4>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li><code className="bg-muted px-1 rounded">telefone</code>: Telefone do cliente</li>
                <li><code className="bg-muted px-1 rounded">email</code>: E-mail do cliente</li>
                <li><code className="bg-muted px-1 rounded">empresa</code>: Nome da empresa</li>
                <li><code className="bg-muted px-1 rounded">cargo</code>: Cargo do cliente</li>
                <li><code className="bg-muted px-1 rounded">status</code>: lead, prospect, customer, inactive</li>
                <li><code className="bg-muted px-1 rounded">descricao</code>: Observações sobre o cliente</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Operações Disponíveis:</h4>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li><code className="bg-muted px-1 rounded">adicionar</code>: Adiciona novo cliente (padrão)</li>
                <li><code className="bg-muted px-1 rounded">substituir</code>: Atualiza cliente existente (por email ou telefone)</li>
                <li><code className="bg-muted px-1 rounded">zerar</code>: Remove todos os clientes (use com cuidado!)</li>
              </ul>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
};