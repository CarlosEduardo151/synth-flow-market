import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Webhook, Copy, Check, Link, ExternalLink } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LoyaltyIntegrationProps {
  customerProductId: string;
}

export function LoyaltyIntegration({ customerProductId }: LoyaltyIntegrationProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookToken, setWebhookToken] = useState('');
  
  const fullWebhookUrl = webhookToken
    ? `https://agndhravgmcwpdjkozka.supabase.co/functions/v1/loyalty-webhook?token=${webhookToken}`
    : "Carregando...";

  useEffect(() => {
    fetchSettings();
  }, [customerProductId]);

  const fetchSettings = async () => {
    // Carregar token do customer_product
    const { data: cpData } = await supabase
      .from('customer_products')
      .select('webhook_token')
      .eq('id', customerProductId)
      .single();

    if (cpData?.webhook_token) {
      setWebhookToken(cpData.webhook_token);
    }

    // Carregar webhook de saída
    const { data } = await supabase
      .from('loyalty_settings')
      .select('webhook_url')
      .eq('customer_product_id', customerProductId)
      .single();

    if (data?.webhook_url) {
      setWebhookUrl(data.webhook_url);
    }
  };

  const handleCopyUrl = () => {
    if (!webhookToken) return;
    navigator.clipboard.writeText(fullWebhookUrl);
    setCopied(true);
    toast({ title: "Copiado!", description: "URL copiada para a área de transferência" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveWebhook = async () => {
    const { data: existing } = await supabase
      .from('loyalty_settings')
      .select('id')
      .eq('customer_product_id', customerProductId)
      .single();

    const dataToSave = {
      customer_product_id: customerProductId,
      webhook_url: webhookUrl || null
    };

    let error;
    if (existing) {
      const result = await supabase
        .from('loyalty_settings')
        .update(dataToSave)
        .eq('customer_product_id', customerProductId);
      error = result.error;
    } else {
      const result = await supabase
        .from('loyalty_settings')
        .insert({ ...dataToSave, conversion_rate: 1.0, auto_send_messages: true });
      error = result.error;
    }

    if (error) {
      toast({ title: "Erro", description: "Erro ao salvar configuração", variant: "destructive" });
      return;
    }

    toast({ title: "Sucesso", description: "Configuração salva com sucesso!" });
  };

  const examplePayload = `{
  "cliente": "Carlos Eduardo",
  "telefone": "99 99999-9999",
  "operacao": "adicionar",
  "pontos": 50,
  "motivo": "Compra acima de R$100",
  "data": "2025-10-19"
}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Webhook className="w-6 h-6 text-primary" />
          Integração via HTTP Request
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure webhooks para automatizar operações de fidelidade
        </p>
      </div>

      <Alert>
        <Link className="w-4 h-4" />
        <AlertDescription>
          <strong>Customer Product ID:</strong>
          <code className="ml-2 bg-muted px-2 py-1 rounded text-sm">{customerProductId}</code>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>URL do Webhook de Entrada</CardTitle>
          <CardDescription>
            Use esta URL para enviar dados ao sistema de fidelidade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={fullWebhookUrl}
              readOnly
              className="font-mono text-sm"
            />
            <Button onClick={handleCopyUrl} variant="outline" disabled={!webhookToken}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
            ⚠️ Esta URL contém seu token exclusivo. Não compartilhe publicamente.
          </p>

          <div>
            <Label>Método HTTP</Label>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-3 py-1 bg-primary text-primary-foreground rounded font-mono text-sm font-bold">
                POST
              </span>
              <span className="text-sm text-muted-foreground">
                Envie requisições POST com JSON no body
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Formato do JSON</CardTitle>
          <CardDescription>
            Estrutura esperada para processar operações de pontos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2">Exemplo de Payload</Label>
            <Textarea
              value={examplePayload}
              readOnly
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2 text-sm">
            <h4 className="font-semibold">Campos Obrigatórios:</h4>
            <ul className="space-y-1 ml-4">
              <li><code className="bg-muted px-1 rounded">cliente</code> - Nome do cliente</li>
              <li><code className="bg-muted px-1 rounded">telefone</code> - Telefone do cliente</li>
              <li><code className="bg-muted px-1 rounded">operacao</code> - Tipo de operação</li>
              <li><code className="bg-muted px-1 rounded">pontos</code> - Quantidade de pontos</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              ℹ️ O token já está na URL, não precisa enviar customer_product_id
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <h4 className="font-semibold">Operações Disponíveis:</h4>
            <ul className="space-y-1 ml-4">
              <li><code className="bg-muted px-1 rounded">adicionar</code> - Adiciona pontos ao cliente</li>
              <li><code className="bg-muted px-1 rounded">remover</code> - Remove pontos do cliente</li>
              <li><code className="bg-muted px-1 rounded">resgatar</code> - Troca pontos por recompensa</li>
              <li><code className="bg-muted px-1 rounded">zerar</code> - Zera os pontos do cliente</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook de Saída (Opcional)</CardTitle>
          <CardDescription>
            URL para receber notificações quando transações ocorrerem
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="webhook_url">URL do seu Webhook de Saída</Label>
            <Input
              id="webhook_url"
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://seu-webhook.com/..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              O sistema enviará notificações para esta URL quando houver novas transações
            </p>
          </div>

          <Button onClick={handleSaveWebhook}>
            Salvar Configuração
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fluxo de Integração Completo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <p className="font-semibold">WhatsApp → Z-API</p>
                <p className="text-muted-foreground">Cliente interage via WhatsApp</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <p className="font-semibold">Z-API → Automação</p>
                <p className="text-muted-foreground">Sistema processa e formata dados</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div className="flex-1">
                <p className="font-semibold">Automação → Sistema de Fidelidade</p>
                <p className="text-muted-foreground">HTTP Request para o webhook acima</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                4
              </div>
              <div className="flex-1">
                <p className="font-semibold">Sistema Atualiza Pontos</p>
                <p className="text-muted-foreground">Transação processada automaticamente</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recursos e Documentação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full justify-start" asChild>
            <a href="https://docs.starai.com.br/webhooks" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Documentação de Webhooks
            </a>
          </Button>
          <Button variant="outline" className="w-full justify-start" asChild>
            <a href="https://www.z-api.io" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Z-API para WhatsApp
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}