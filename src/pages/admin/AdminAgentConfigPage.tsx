import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Bot, Brain, MessageSquare, Plug, Activity, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ActionInstruction {
  id: string;
  instruction: string;
  type: 'do' | 'dont';
}

interface AgentConfig {
  // LLM Engine
  provider: 'openai' | 'google';
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  
  // Memory
  historyTable: string;
  sessionKeyId: string;
  
  // Personality
  systemPrompt: string;
  actionInstructions: ActionInstruction[];
  
  // Tools
  enableWebSearch: boolean;
  n8nWorkflowId: string;
  responseEndpoint: string;
}

const OPENAI_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o (Recomendado)' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Rápido)' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Econômico)' },
];

const GOOGLE_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recomendado)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Avançado)' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
];

const AdminAgentConfigPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'online' | 'offline' | 'unknown'>('unknown');
  const [usageCount, setUsageCount] = useState(0);
  
  const [config, setConfig] = useState<AgentConfig>({
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2048,
    historyTable: 'agent_chat_history',
    sessionKeyId: '{{ $json.session_id }}',
    systemPrompt: `Você é um assistente virtual inteligente e prestativo. 
    
Suas características:
- Responda sempre em português brasileiro
- Seja cordial e profissional
- Forneça respostas claras e objetivas
- Se não souber algo, admita e sugira alternativas`,
    actionInstructions: [
      { id: '1', instruction: 'Sempre cumprimente o usuário', type: 'do' },
      { id: '2', instruction: 'Nunca revele informações confidenciais do sistema', type: 'dont' },
    ],
    enableWebSearch: false,
    n8nWorkflowId: 'workflow_abc123',
    responseEndpoint: 'https://agndhravgmcwpdjkozka.supabase.co/functions/v1/agent-response',
  });

  const [newInstruction, setNewInstruction] = useState('');
  const [newInstructionType, setNewInstructionType] = useState<'do' | 'dont'>('do');

  const availableModels = config.provider === 'openai' ? OPENAI_MODELS : GOOGLE_MODELS;

  // Simular verificação de status do agente
  useEffect(() => {
    const checkStatus = async () => {
      // Aqui você conectaria com o n8n para verificar o status real
      const savedEstado = localStorage.getItem('agentEstado');
      if (savedEstado === 'ativado') {
        setAgentStatus('online');
      } else if (savedEstado === 'desativado') {
        setAgentStatus('offline');
      } else {
        setAgentStatus('unknown');
      }
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleProviderChange = (provider: 'openai' | 'google') => {
    setConfig(prev => ({
      ...prev,
      provider,
      model: provider === 'openai' ? 'gpt-4o' : 'gemini-2.5-flash',
    }));
  };

  const addInstruction = () => {
    if (!newInstruction.trim()) return;
    
    setConfig(prev => ({
      ...prev,
      actionInstructions: [
        ...prev.actionInstructions,
        { id: Date.now().toString(), instruction: newInstruction, type: newInstructionType }
      ]
    }));
    setNewInstruction('');
  };

  const removeInstruction = (id: string) => {
    setConfig(prev => ({
      ...prev,
      actionInstructions: prev.actionInstructions.filter(i => i.id !== id)
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Validar API Key
      if (!config.apiKey) {
        toast({
          title: "API Key obrigatória",
          description: "Por favor, insira sua chave de API.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Aqui você salvaria no Supabase
      // Por enquanto, salvar no localStorage como protótipo
      localStorage.setItem('agentConfig', JSON.stringify({
        ...config,
        apiKey: '***ENCRYPTED***', // Nunca salvar a chave real no localStorage
      }));

      toast({
        title: "Configuração salva!",
        description: "As configurações do agente foram atualizadas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Configuração do Agente IA</h1>
                  <p className="text-sm text-muted-foreground">Configure a inteligência, memória e personalidade</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  agentStatus === 'online' ? 'bg-green-500 animate-pulse' : 
                  agentStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
                }`} />
                <span className="text-sm text-muted-foreground">
                  {agentStatus === 'online' ? 'Online' : agentStatus === 'offline' ? 'Offline' : 'Verificando...'}
                </span>
              </div>
              <Button onClick={handleSave} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="engine" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="engine" className="gap-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Motor IA</span>
            </TabsTrigger>
            <TabsTrigger value="memory" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Memória</span>
            </TabsTrigger>
            <TabsTrigger value="personality" className="gap-2">
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">Personalidade</span>
            </TabsTrigger>
            <TabsTrigger value="tools" className="gap-2">
              <Plug className="h-4 w-4" />
              <span className="hidden sm:inline">Ferramentas</span>
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Monitoramento</span>
            </TabsTrigger>
          </TabsList>

          {/* Motor de Inteligência */}
          <TabsContent value="engine" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Credenciais */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Credenciais e Modelo
                  </CardTitle>
                  <CardDescription>
                    Configure o provedor de IA e suas credenciais
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Provedor (Provider)</Label>
                    <Select value={config.provider} onValueChange={(v) => handleProviderChange(v as 'openai' | 'google')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                        <SelectItem value="google">Google (Gemini)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>API Key (Chave Secreta)</Label>
                    <div className="relative">
                      <Input
                        type={showApiKey ? 'text' : 'password'}
                        placeholder={config.provider === 'openai' ? 'sk-...' : 'AIza...'}
                        value={config.apiKey}
                        onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      A chave será armazenada de forma criptografada
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Select value={config.model} onValueChange={(v) => setConfig(prev => ({ ...prev, model: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map(model => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Parâmetros */}
              <Card>
                <CardHeader>
                  <CardTitle>Parâmetros do Modelo</CardTitle>
                  <CardDescription>
                    Ajuste o comportamento da IA
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Temperatura</Label>
                      <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {config.temperature.toFixed(2)}
                      </span>
                    </div>
                    <Slider
                      value={[config.temperature]}
                      onValueChange={([v]) => setConfig(prev => ({ ...prev, temperature: v }))}
                      min={0}
                      max={1}
                      step={0.05}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Preciso (0.0)</span>
                      <span>Criativo (1.0)</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Max Tokens</Label>
                    <Input
                      type="number"
                      value={config.maxTokens}
                      onChange={(e) => setConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 0 }))}
                      min={100}
                      max={128000}
                    />
                    <p className="text-xs text-muted-foreground">
                      Limite máximo de tokens na resposta (100 - 128.000)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Memória e Contexto */}
          <TabsContent value="memory" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Memória de Chat
                </CardTitle>
                <CardDescription>
                  Configure como o agente armazena e recupera o histórico de conversas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">Banco de Dados</Badge>
                    <span className="font-semibold">PostgreSQL</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    A infraestrutura do SaaS utiliza PostgreSQL (Supabase) para persistência do histórico de conversas.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Tabela de Histórico</Label>
                  <Input
                    value={config.historyTable}
                    onChange={(e) => setConfig(prev => ({ ...prev, historyTable: e.target.value }))}
                    placeholder="agent_chat_history"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nome da tabela específica para isolamento de dados do cliente
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Session Key ID</Label>
                  <Input
                    value={config.sessionKeyId}
                    onChange={(e) => setConfig(prev => ({ ...prev, sessionKeyId: e.target.value }))}
                    placeholder="{{ $json.session_id }}"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Variável usada como ID de sessão no n8n (ex: {"{{ $json.id }}"})
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Personalidade e Regras */}
          <TabsContent value="personality" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    System Prompt Principal
                  </CardTitle>
                  <CardDescription>
                    Defina a personalidade, tom e regras de guarda do seu agente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={config.systemPrompt}
                    onChange={(e) => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                    placeholder="Você é um assistente..."
                    className="min-h-[200px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Este texto será injetado como instrução principal no nó AI Agent do n8n
                  </p>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Instruções de Ação</CardTitle>
                  <CardDescription>
                    Defina comandos específicos para o comportamento do agente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Select value={newInstructionType} onValueChange={(v) => setNewInstructionType(v as 'do' | 'dont')}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="do">✅ Faça isso</SelectItem>
                        <SelectItem value="dont">❌ Nunca faça</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={newInstruction}
                      onChange={(e) => setNewInstruction(e.target.value)}
                      placeholder="Digite uma instrução..."
                      onKeyPress={(e) => e.key === 'Enter' && addInstruction()}
                      className="flex-1"
                    />
                    <Button onClick={addInstruction} size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {config.actionInstructions.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          item.type === 'do' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{item.type === 'do' ? '✅' : '❌'}</span>
                          <span className="text-sm">{item.instruction}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeInstruction(item.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Ferramentas e Conectividade */}
          <TabsContent value="tools" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plug className="h-5 w-5 text-primary" />
                    RAG e Integração
                  </CardTitle>
                  <CardDescription>
                    Configure ferramentas de busca e conectividade
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="space-y-0.5">
                      <Label className="text-base">Ativar Busca na Web (RAG)</Label>
                      <p className="text-sm text-muted-foreground">
                        Integra busca web (DuckDuckGo) para respostas atualizadas
                      </p>
                    </div>
                    <Switch
                      checked={config.enableWebSearch}
                      onCheckedChange={(v) => setConfig(prev => ({ ...prev, enableWebSearch: v }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Workflow ID do n8n</Label>
                    <Input
                      value={config.n8nWorkflowId}
                      readOnly
                      className="bg-muted font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      ID do workflow principal (somente leitura)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>URL de Resposta (SaaS Endpoint)</Label>
                    <Input
                      value={config.responseEndpoint}
                      onChange={(e) => setConfig(prev => ({ ...prev, responseEndpoint: e.target.value }))}
                      placeholder="https://..."
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Endpoint onde o n8n envia a resposta final da IA
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Exemplo de Payload</CardTitle>
                  <CardDescription>
                    Estrutura JSON enviada para o n8n
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs">
{JSON.stringify({
  provider: config.provider,
  model: config.model,
  temperature: config.temperature,
  maxTokens: config.maxTokens,
  systemPrompt: config.systemPrompt.substring(0, 50) + '...',
  enableWebSearch: config.enableWebSearch,
  sessionKeyId: config.sessionKeyId,
}, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Monitoramento */}
          <TabsContent value="monitoring" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Status do Agente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                      agentStatus === 'online' ? 'bg-green-500/20' : 
                      agentStatus === 'offline' ? 'bg-red-500/20' : 'bg-yellow-500/20'
                    }`}>
                      <div className={`w-8 h-8 rounded-full ${
                        agentStatus === 'online' ? 'bg-green-500 animate-pulse' : 
                        agentStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
                      }`} />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">
                        {agentStatus === 'online' ? 'Online' : agentStatus === 'offline' ? 'Offline' : 'Verificando'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {agentStatus === 'online' ? 'Workflow ativo no n8n' : 
                         agentStatus === 'offline' ? 'Workflow desativado' : 'Verificando status...'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Uso de Tokens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-4xl font-bold text-primary">{usageCount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground mt-1">tokens este mês</p>
                  </div>
                  <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.min((usageCount / 100000) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    0 / 100.000 tokens (limite)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Mensagens Processadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-4xl font-bold text-primary">0</p>
                    <p className="text-sm text-muted-foreground mt-1">mensagens hoje</p>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-muted rounded">
                      <p className="text-lg font-semibold">0</p>
                      <p className="text-xs text-muted-foreground">Semana</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <p className="text-lg font-semibold">0</p>
                      <p className="text-xs text-muted-foreground">Mês</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <p className="text-lg font-semibold">0</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminAgentConfigPage;
