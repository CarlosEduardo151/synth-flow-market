import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { AIAgentConfig } from '@/components/AIAgentConfig';
import { TokenUsageStats } from '@/components/agent/TokenUsageStats';
import { 
  Settings, 
  Webhook, 
  PlayCircle, 
  PauseCircle,
  RefreshCw,
  Activity,
  BookOpen,
  Copy,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Bot,
  BarChart3
} from 'lucide-react';

interface AIConfig {
  id: string;
  customer_product_id: string;
  is_active: boolean;
  n8n_webhook_url: string | null;
  auto_restart: boolean;
  max_requests_per_day: number | null;
  current_requests_count: number;
  last_activity: string | null;
  configuration: any;
  n8n_workflow_id?: string | null;
}

const AIControlSystem = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { productId } = useParams();
  const { toast } = useToast();

  const [config, setConfig] = useState<AIConfig | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [autoRestart, setAutoRestart] = useState(false);
  const [maxRequests, setMaxRequests] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [workflowId, setWorkflowId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (user && productId) {
      fetchConfig();
    }
  }, [user, loading, productId]);

  const fetchConfig = async () => {
    if (!user || !productId) return;

    try {
      // Fetch workflow ID from customer_products
      const { data: productData } = await supabase
        .from('customer_products')
        .select('n8n_workflow_id')
        .eq('id', productId)
        .single();
      
      if (productData?.n8n_workflow_id) {
        setWorkflowId(productData.n8n_workflow_id);
      }

      const { data, error } = await supabase
        .from('ai_control_config')
        .select('*')
        .eq('customer_product_id', productId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching config:', error);
        return;
      }

      if (data) {
        const configData = data as unknown as AIConfig;
        setConfig(configData);
        setWebhookUrl(configData.n8n_webhook_url || '');
        setIsActive(configData.is_active);
        setAutoRestart(configData.auto_restart);
        setMaxRequests(configData.max_requests_per_day?.toString() || '');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const saveConfig = async () => {
    if (!user || !productId) return;

    setIsSaving(true);
    try {
      const configData = {
        customer_product_id: productId,
        is_active: isActive,
        n8n_webhook_url: webhookUrl || null,
        auto_restart: autoRestart,
        max_requests_per_day: maxRequests ? parseInt(maxRequests) : null,
        configuration: {}
      };

      const { error } = await supabase
        .from('ai_control_config' as any)
        .upsert(configData);

      if (error) throw error;

      toast({
        title: "Configurações salvas",
        description: "Suas configurações foram salvas com sucesso!",
      });

      fetchConfig();
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const testWebhook = async () => {
    if (!webhookUrl) {
      toast({
        title: "URL necessária",
        description: "Configure a URL do webhook primeiro.",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'test',
          timestamp: new Date().toISOString(),
          product_id: productId,
          message: 'Teste de conexão'
        }),
      });

      toast({
        title: "Webhook testado",
        description: "Verifique o histórico do seu workflow para confirmar o recebimento.",
      });
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast({
        title: "Erro no teste",
        description: "Não foi possível enviar o teste. Verifique a URL.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const sendCommand = async (command: string, data: any = {}) => {
    if (!webhookUrl) {
      toast({
        title: "Configure o webhook",
        description: "Você precisa configurar a URL do webhook primeiro.",
        variant: "destructive",
      });
      return;
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: command,
          timestamp: new Date().toISOString(),
          product_id: productId,
          data
        }),
      });

      toast({
        title: "Comando enviado",
        description: `Comando "${command}" enviado com sucesso!`,
      });
    } catch (error) {
      console.error('Error sending command:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o comando.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Conteúdo copiado para a área de transferência.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Controle de IA
              </h1>
              <p className="text-muted-foreground">
                Gerencie sua IA - Pause, ative e controle tudo remotamente
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="agent" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="agent" className="flex items-center gap-1">
              <Bot className="h-4 w-4" />
              Agente IA
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              Monitoramento
            </TabsTrigger>
            <TabsTrigger value="config">Webhook</TabsTrigger>
            <TabsTrigger value="control">Controle</TabsTrigger>
            <TabsTrigger value="tutorial">Tutorial</TabsTrigger>
          </TabsList>

          <TabsContent value="agent">
            {productId && (
              <AIAgentConfig 
                customerProductId={productId} 
                workflowId={workflowId}
              />
            )}
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-4">
            {workflowId ? (
              <TokenUsageStats workflowId={workflowId} />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Workflow não configurado</p>
                  <p className="text-sm">Configure um workflow para visualizar as estatísticas de uso.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  Configuração de Webhook
                </CardTitle>
                <CardDescription>
                  Configure a URL do webhook do seu workflow
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">URL do Webhook</Label>
                  <div className="flex gap-2">
                    <Input
                      id="webhook-url"
                      placeholder="https://seu-servidor.com/webhook/sua-url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={testWebhook}
                      disabled={isTesting || !webhookUrl}
                    >
                      {isTesting ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Activity className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Cole aqui a URL do webhook do seu sistema de automação
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>IA Ativa</Label>
                    <p className="text-sm text-muted-foreground">
                      Ativa ou desativa completamente sua IA
                    </p>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Reiniciar</Label>
                    <p className="text-sm text-muted-foreground">
                      Reinicia automaticamente em caso de erro
                    </p>
                  </div>
                  <Switch
                    checked={autoRestart}
                    onCheckedChange={setAutoRestart}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-requests">Limite de Requisições/Dia</Label>
                  <Input
                    id="max-requests"
                    type="number"
                    placeholder="1000"
                    value={maxRequests}
                    onChange={(e) => setMaxRequests(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Deixe vazio para ilimitado
                  </p>
                </div>

                <Button onClick={saveConfig} disabled={isSaving} className="w-full">
                  {isSaving ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {config && (
              <Card>
                <CardHeader>
                  <CardTitle>Status Atual</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={config.is_active ? "default" : "secondary"}>
                      {config.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Requisições Hoje</span>
                    <span className="font-medium">{config.current_requests_count}</span>
                  </div>
                  {config.last_activity && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Última Atividade</span>
                      <span className="text-sm">
                        {new Date(config.last_activity).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="control" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Comandos Rápidos</CardTitle>
                <CardDescription>
                  Envie comandos diretos para sua IA via n8n
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Button
                  variant="outline"
                  className="h-24"
                  onClick={() => sendCommand('start')}
                  disabled={!webhookUrl}
                >
                  <div className="flex flex-col items-center gap-2">
                    <PlayCircle className="h-8 w-8 text-green-600" />
                    <span>Iniciar IA</span>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-24"
                  onClick={() => sendCommand('stop')}
                  disabled={!webhookUrl}
                >
                  <div className="flex flex-col items-center gap-2">
                    <PauseCircle className="h-8 w-8 text-orange-600" />
                    <span>Pausar IA</span>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-24"
                  onClick={() => sendCommand('restart')}
                  disabled={!webhookUrl}
                >
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="h-8 w-8 text-blue-600" />
                    <span>Reiniciar IA</span>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-24"
                  onClick={() => sendCommand('status')}
                  disabled={!webhookUrl}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Activity className="h-8 w-8 text-purple-600" />
                    <span>Verificar Status</span>
                  </div>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Eventos Disponíveis</CardTitle>
                <CardDescription>
                  Eventos que sua IA pode enviar para o n8n
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { event: 'ai_started', desc: 'Quando a IA é iniciada' },
                    { event: 'ai_stopped', desc: 'Quando a IA é pausada' },
                    { event: 'ai_error', desc: 'Quando ocorre um erro' },
                    { event: 'message_received', desc: 'Quando recebe uma mensagem' },
                    { event: 'message_sent', desc: 'Quando envia uma resposta' },
                    { event: 'limit_reached', desc: 'Quando atinge o limite de requisições' },
                    { event: 'config_updated', desc: 'Quando as configurações são alteradas' },
                  ].map((item) => (
                    <div key={item.event} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <code className="text-sm font-mono">{item.event}</code>
                        <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tutorial" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Tutorial Completo - n8n
                </CardTitle>
                <CardDescription>
                  Siga este guia passo a passo para configurar sua integração
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-bold text-lg mb-2">1. Criar Conta no n8n</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Acesse <a href="https://n8n.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                        n8n.io <ExternalLink className="h-3 w-3" />
                      </a> e crie uma conta gratuita.
                    </p>
                  </div>

                  <Separator />

                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-bold text-lg mb-2">2. Criar Novo Workflow</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Clique em "New Workflow" no painel do n8n</li>
                      <li>• Dê um nome descritivo, por exemplo: "Controle IA - [Nome do Produto]"</li>
                    </ul>
                  </div>

                  <Separator />

                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-bold text-lg mb-2">3. Adicionar Webhook Trigger</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground mb-3">
                      <li>• Clique no "+" para adicionar um novo nó</li>
                      <li>• Busque por "Webhook"</li>
                      <li>• Selecione "Webhook" (não o "Webhook Response")</li>
                      <li>• Configure o método HTTP como "POST"</li>
                      <li>• Clique em "Listen for Test Event"</li>
                      <li>• Copie a URL que aparece (ela será algo como: https://seu-n8n.com/webhook/xxxxx)</li>
                    </ul>
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm font-medium mb-2">⚠️ Importante:</p>
                      <p className="text-sm text-muted-foreground">
                        Cole esta URL no campo "URL do Webhook" na aba de Configuração acima
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-bold text-lg mb-2">4. Adicionar Lógica de Controle</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Agora você vai criar a lógica para processar os comandos. Adicione um nó "Switch" após o Webhook:
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground mb-3">
                      <li>• Clique no "+" após o Webhook</li>
                      <li>• Busque e adicione "Switch"</li>
                      <li>• Configure para verificar o campo: <code className="bg-muted px-1 rounded">{'{{ $json.event }}'}</code></li>
                    </ul>
                    <div className="bg-muted p-3 rounded-lg space-y-2">
                      <p className="text-sm font-medium">Adicione estas condições:</p>
                      <div className="space-y-1 text-sm font-mono">
                        <p>• Rota 0: event = "start"</p>
                        <p>• Rota 1: event = "stop"</p>
                        <p>• Rota 2: event = "restart"</p>
                        <p>• Rota 3: event = "status"</p>
                        <p>• Rota 4: event = "test"</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-bold text-lg mb-2">5. Configurar Ações para Cada Comando</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Para cada rota do Switch, adicione as ações desejadas:
                    </p>
                    
                    <div className="space-y-4">
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium text-sm mb-2">📩 Comando "start"</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Adicione um nó "HTTP Request"</li>
                          <li>• Configure para chamar sua API de IA (se aplicável)</li>
                          <li>• Ou adicione "Set" para marcar status como ativo</li>
                        </ul>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium text-sm mb-2">⏸️ Comando "stop"</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Adicione "HTTP Request" para pausar sua IA</li>
                          <li>• Ou use "Set" para marcar como inativo</li>
                        </ul>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium text-sm mb-2">🔄 Comando "restart"</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Combine stop + start</li>
                          <li>• Ou adicione lógica customizada de reinício</li>
                        </ul>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium text-sm mb-2">📊 Comando "status"</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Adicione "HTTP Request" para verificar status da IA</li>
                          <li>• Retorne informações de health check</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-bold text-lg mb-2">6. Adicionar Notificações (Opcional)</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Você pode enviar notificações quando comandos são executados:
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Adicione um nó "Email" para enviar notificações por email</li>
                      <li>• Ou "Telegram" para receber mensagens no Telegram</li>
                      <li>• Ou "Slack" para notificações no Slack</li>
                    </ul>
                  </div>

                  <Separator />

                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-bold text-lg mb-2">7. Salvar e Ativar</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Clique em "Save" no canto superior direito</li>
                      <li>• Ative o workflow clicando no toggle "Active"</li>
                      <li>• Teste usando o botão "Testar Webhook" na aba Configuração</li>
                    </ul>
                  </div>

                  <Separator />

                  <div className="border-l-4 border-green-600 pl-4 bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                    <h3 className="font-bold text-lg mb-2 text-green-600">✅ Exemplo de Payload que você receberá</h3>
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`{
  "event": "start",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "product_id": "${productId}",
  "data": {}
}`}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => copyToClipboard(`{
  "event": "start",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "product_id": "${productId}",
  "data": {}
}`)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Exemplo
                    </Button>
                  </div>

                  <Separator />

                  <div className="border-l-4 border-blue-600 pl-4 bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                    <h3 className="font-bold text-lg mb-2 text-blue-600">💡 Dicas Avançadas</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Use "Function" nodes para lógica JavaScript customizada</li>
                      <li>• Adicione "Error Trigger" para capturar e tratar erros</li>
                      <li>• Use "Schedule Trigger" para executar tarefas periódicas</li>
                      <li>• Integre com Google Sheets para logging de eventos</li>
                      <li>• Use "IF" nodes para lógica condicional complexa</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default AIControlSystem;
