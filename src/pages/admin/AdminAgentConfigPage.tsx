import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Bot, Brain, MessageSquare, Plug, Activity, Plus, Trash2, Eye, EyeOff, 
  Power, RefreshCw, Wifi, WifiOff, AlertCircle, Settings2, Shield, Zap, Clock, Database,
  ExternalLink, Copy, CheckCircle2, XCircle
} from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ActionInstruction {
  id: string;
  instruction: string;
  type: 'do' | 'dont';
}

interface CustomTool {
  id: string;
  name: string;
  description: string;
  endpoint: string;
}

interface AgentConfig {
  // Status Control
  isActive: boolean;
  n8nWorkflowId: string;
  errorWebhookUrl: string;
  
  // LLM Engine
  provider: 'openai' | 'google';
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  stopSequences: string[];
  
  // Memory
  contextWindowSize: number;
  retentionPolicy: '7days' | '30days' | '90days' | 'unlimited';
  historyTable: string;
  sessionKeyId: string;
  
  // Personality
  systemPrompt: string;
  actionInstructions: ActionInstruction[];
  
  // Tools
  enableWebSearch: boolean;
  customTools: CustomTool[];
  
  // Integration
  responseEndpoint: string;
  responseAuthHeader: string;
  responseAuthToken: string;
}

interface AgentMetrics {
  totalMessages: number;
  todayMessages: number;
  weekMessages: number;
  monthMessages: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  errorRate: number;
  lastActivity: string | null;
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

const RETENTION_OPTIONS = [
  { value: '7days', label: '7 dias' },
  { value: '30days', label: '30 dias' },
  { value: '90days', label: '90 dias' },
  { value: 'unlimited', label: 'Ilimitado' },
];

const AdminAgentConfigPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'online' | 'offline' | 'loading' | 'unknown'>('unknown');
  const [togglingAgent, setTogglingAgent] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  
  const [metrics, setMetrics] = useState<AgentMetrics>({
    totalMessages: 0,
    todayMessages: 0,
    weekMessages: 0,
    monthMessages: 0,
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    errorRate: 0,
    lastActivity: null,
  });
  
  const [config, setConfig] = useState<AgentConfig>({
    // Status
    isActive: false,
    n8nWorkflowId: 'wf_' + Math.random().toString(36).substring(2, 10),
    errorWebhookUrl: '',
    
    // LLM Engine
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1.0,
    frequencyPenalty: 0,
    stopSequences: [],
    
    // Memory
    contextWindowSize: 10,
    retentionPolicy: '30days',
    historyTable: 'agent_chat_history',
    sessionKeyId: '{{ $json.session_id }}',
    
    // Personality
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
    
    // Tools
    enableWebSearch: false,
    customTools: [],
    
    // Integration
    responseEndpoint: 'https://agndhravgmcwpdjkozka.supabase.co/functions/v1/agent-response',
    responseAuthHeader: 'Authorization',
    responseAuthToken: '',
  });

  const [newInstruction, setNewInstruction] = useState('');
  const [newInstructionType, setNewInstructionType] = useState<'do' | 'dont'>('do');
  const [newStopSequence, setNewStopSequence] = useState('');
  const [newTool, setNewTool] = useState({ name: '', description: '', endpoint: '' });

  const availableModels = config.provider === 'openai' ? OPENAI_MODELS : GOOGLE_MODELS;

  // Verificar status do agente
  useEffect(() => {
    const checkStatus = async () => {
      const savedEstado = localStorage.getItem('agentEstado');
      if (savedEstado === 'ativado') {
        setAgentStatus('online');
        setConfig(prev => ({ ...prev, isActive: true }));
      } else if (savedEstado === 'desativado') {
        setAgentStatus('offline');
        setConfig(prev => ({ ...prev, isActive: false }));
      } else {
        setAgentStatus('unknown');
      }
    };
    
    checkStatus();
    
    // Ouvir mudanças de estado
    const handleEstadoChange = (e: CustomEvent) => {
      const { estado } = e.detail;
      if (estado === 'ativado') {
        setAgentStatus('online');
        setConfig(prev => ({ ...prev, isActive: true }));
      } else if (estado === 'desativado') {
        setAgentStatus('offline');
        setConfig(prev => ({ ...prev, isActive: false }));
      } else if (estado === 'reiniciando') {
        setAgentStatus('loading');
      }
    };
    
    window.addEventListener('agentEstadoChanged', handleEstadoChange as EventListener);
    const interval = setInterval(checkStatus, 10000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('agentEstadoChanged', handleEstadoChange as EventListener);
    };
  }, []);

  // Simular métricas (em produção viria do banco)
  useEffect(() => {
    const simulatedMetrics: AgentMetrics = {
      totalMessages: Math.floor(Math.random() * 5000),
      todayMessages: Math.floor(Math.random() * 50),
      weekMessages: Math.floor(Math.random() * 300),
      monthMessages: Math.floor(Math.random() * 1200),
      totalTokens: Math.floor(Math.random() * 500000),
      inputTokens: Math.floor(Math.random() * 300000),
      outputTokens: Math.floor(Math.random() * 200000),
      errorRate: Math.random() * 5,
      lastActivity: new Date().toISOString(),
    };
    setMetrics(simulatedMetrics);
  }, []);

  const handleProviderChange = (provider: 'openai' | 'google') => {
    setConfig(prev => ({
      ...prev,
      provider,
      model: provider === 'openai' ? 'gpt-4o' : 'gemini-2.5-flash',
    }));
  };

  const toggleAgentStatus = async () => {
    setTogglingAgent(true);
    const action = config.isActive ? 'desativar' : 'ativar';
    
    try {
      const { data, error } = await supabase.functions.invoke('n8n-control', {
        body: { agentId: config.n8nWorkflowId, action }
      });
      
      if (error) throw error;
      
      const newStatus = !config.isActive;
      setConfig(prev => ({ ...prev, isActive: newStatus }));
      setAgentStatus(newStatus ? 'online' : 'offline');
      localStorage.setItem('agentEstado', newStatus ? 'ativado' : 'desativado');
      
      toast({
        title: newStatus ? "Agente Ativado" : "Agente Desativado",
        description: `O workflow foi ${newStatus ? 'ativado' : 'desativado'} com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do agente.",
        variant: "destructive",
      });
    } finally {
      setTogglingAgent(false);
    }
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

  const addStopSequence = () => {
    if (!newStopSequence.trim()) return;
    setConfig(prev => ({
      ...prev,
      stopSequences: [...prev.stopSequences, newStopSequence]
    }));
    setNewStopSequence('');
  };

  const removeStopSequence = (index: number) => {
    setConfig(prev => ({
      ...prev,
      stopSequences: prev.stopSequences.filter((_, i) => i !== index)
    }));
  };

  const addCustomTool = () => {
    if (!newTool.name.trim() || !newTool.endpoint.trim()) return;
    setConfig(prev => ({
      ...prev,
      customTools: [
        ...prev.customTools,
        { id: Date.now().toString(), ...newTool }
      ]
    }));
    setNewTool({ name: '', description: '', endpoint: '' });
  };

  const removeCustomTool = (id: string) => {
    setConfig(prev => ({
      ...prev,
      customTools: prev.customTools.filter(t => t.id !== id)
    }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Copiado!", description: `${label} copiado para a área de transferência.` });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (!config.apiKey) {
        toast({
          title: "API Key obrigatória",
          description: "Por favor, insira sua chave de API.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      localStorage.setItem('agentConfig', JSON.stringify({
        ...config,
        apiKey: '***ENCRYPTED***',
        responseAuthToken: '***ENCRYPTED***',
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
                  <p className="text-sm text-muted-foreground">Configure inteligência, memória, status e integração</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Status Indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  agentStatus === 'online' ? 'bg-green-500 animate-pulse' : 
                  agentStatus === 'offline' ? 'bg-red-500' : 
                  agentStatus === 'loading' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'
                }`} />
                <span className="text-sm font-medium">
                  {agentStatus === 'online' ? 'Online' : 
                   agentStatus === 'offline' ? 'Offline' : 
                   agentStatus === 'loading' ? 'Processando...' : 'Desconhecido'}
                </span>
              </div>
              <Button onClick={handleSave} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="status" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="status" className="gap-2">
              <Power className="h-4 w-4" />
              <span className="hidden sm:inline">Status</span>
            </TabsTrigger>
            <TabsTrigger value="engine" className="gap-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Motor IA</span>
            </TabsTrigger>
            <TabsTrigger value="memory" className="gap-2">
              <Database className="h-4 w-4" />
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

          {/* ======== STATUS E ATIVAÇÃO ======== */}
          <TabsContent value="status" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Controle de Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Power className="h-5 w-5 text-primary" />
                    Controle do Agente
                  </CardTitle>
                  <CardDescription>
                    Ative ou desative o workflow do agente no n8n
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Toggle Principal */}
                  <div className="flex items-center justify-between p-6 rounded-xl border-2 transition-colors duration-300" style={{
                    borderColor: config.isActive ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                    backgroundColor: config.isActive ? 'hsl(var(--primary) / 0.05)' : 'transparent'
                  }}>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full transition-colors ${
                        config.isActive ? 'bg-green-500/20' : 'bg-muted'
                      }`}>
                        {config.isActive ? (
                          <Wifi className="h-6 w-6 text-green-500" />
                        ) : (
                          <WifiOff className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <Label className="text-lg font-semibold">Agente Ativo</Label>
                        <p className="text-sm text-muted-foreground">
                          {config.isActive ? 'O agente está respondendo mensagens' : 'O agente está desativado'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={config.isActive}
                      onCheckedChange={toggleAgentStatus}
                      disabled={togglingAgent}
                      className="scale-125"
                    />
                  </div>

                  {/* Status de Saúde */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-2 mb-2">
                        {agentStatus === 'online' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : agentStatus === 'offline' ? (
                          <XCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <RefreshCw className="h-5 w-5 text-yellow-500 animate-spin" />
                        )}
                        <span className="font-medium">Status n8n</span>
                      </div>
                      <p className="text-2xl font-bold">
                        {agentStatus === 'online' ? 'Ativo' : 
                         agentStatus === 'offline' ? 'Inativo' : 'Verificando'}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">Última Atividade</span>
                      </div>
                      <p className="text-sm">
                        {metrics.lastActivity 
                          ? new Date(metrics.lastActivity).toLocaleString('pt-BR')
                          : 'Nenhuma atividade'}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Botões de Ação */}
                  <div className="flex gap-2">
                    <Button 
                      variant={config.isActive ? "destructive" : "default"}
                      className="flex-1"
                      onClick={toggleAgentStatus}
                      disabled={togglingAgent}
                    >
                      {togglingAgent ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : config.isActive ? (
                        <Power className="h-4 w-4 mr-2" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      {config.isActive ? 'Desativar Agente' : 'Ativar Agente'}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={async () => {
                        setTogglingAgent(true);
                        try {
                          await supabase.functions.invoke('n8n-control', {
                            body: { agentId: config.n8nWorkflowId, action: 'reiniciar' }
                          });
                          toast({ title: "Reiniciando...", description: "O agente está sendo reiniciado." });
                        } catch {
                          toast({ title: "Erro", description: "Falha ao reiniciar.", variant: "destructive" });
                        } finally {
                          setTogglingAgent(false);
                        }
                      }}
                      disabled={togglingAgent || !config.isActive}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reiniciar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* IDs de Integração */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5 text-primary" />
                    IDs de Integração
                  </CardTitle>
                  <CardDescription>
                    Identificadores para conexão com o n8n
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Workflow ID do n8n</Label>
                    <div className="flex gap-2">
                      <Input
                        value={config.n8nWorkflowId}
                        readOnly
                        className="bg-muted font-mono text-sm"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => copyToClipboard(config.n8nWorkflowId, 'Workflow ID')}
                      >
                        {copied === 'Workflow ID' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Preenchido automaticamente pelo sistema
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>URL do Webhook de Erro</Label>
                    <Input
                      value={config.errorWebhookUrl}
                      onChange={(e) => setConfig(prev => ({ ...prev, errorWebhookUrl: e.target.value }))}
                      placeholder="https://seu-servico.com/webhook/erros"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Receba notificações de erros críticos do n8n
                    </p>
                  </div>

                  <Separator />

                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-700 dark:text-amber-400">Atenção</p>
                        <p className="text-sm text-muted-foreground">
                          Alterações no Workflow ID podem afetar integrações existentes. 
                          Use com cuidado em ambientes de produção.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ======== MOTOR DE INTELIGÊNCIA ======== */}
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
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Armazenamento criptografado (Vault)
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

              {/* Parâmetros Básicos */}
              <Card>
                <CardHeader>
                  <CardTitle>Parâmetros do Modelo</CardTitle>
                  <CardDescription>
                    Ajuste o comportamento da IA
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Temperatura */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Temperatura (Criatividade)</Label>
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
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Preciso (0.0)</span>
                      <span>Criativo (1.0)</span>
                    </div>
                  </div>

                  {/* Max Tokens */}
                  <div className="space-y-2">
                    <Label>Max Tokens (Limite de Resposta)</Label>
                    <Input
                      type="number"
                      value={config.maxTokens}
                      onChange={(e) => setConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 0 }))}
                      min={100}
                      max={128000}
                    />
                    <p className="text-xs text-muted-foreground">
                      Limite: 100 - 128.000 tokens
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Parâmetros Avançados */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Parâmetros Avançados</CardTitle>
                  <CardDescription>
                    Controle fino sobre a geração de texto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Top P */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Top P (Foco de Amostragem)</Label>
                        <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {config.topP.toFixed(2)}
                        </span>
                      </div>
                      <Slider
                        value={[config.topP]}
                        onValueChange={([v]) => setConfig(prev => ({ ...prev, topP: v }))}
                        min={0}
                        max={1}
                        step={0.05}
                      />
                      <p className="text-xs text-muted-foreground">
                        Controla a diversidade da resposta (nucleus sampling)
                      </p>
                    </div>

                    {/* Frequency Penalty */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Frequência Penalidade</Label>
                        <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {config.frequencyPenalty.toFixed(2)}
                        </span>
                      </div>
                      <Slider
                        value={[config.frequencyPenalty]}
                        onValueChange={([v]) => setConfig(prev => ({ ...prev, frequencyPenalty: v }))}
                        min={0}
                        max={2}
                        step={0.1}
                      />
                      <p className="text-xs text-muted-foreground">
                        Reduz repetição de palavras (0.0 - 2.0)
                      </p>
                    </div>

                    {/* Stop Sequences */}
                    <div className="space-y-4 md:col-span-2">
                      <Label>Sequências de Parada (Stop Sequences)</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newStopSequence}
                          onChange={(e) => setNewStopSequence(e.target.value)}
                          placeholder="Ex: USUÁRIO:"
                          onKeyPress={(e) => e.key === 'Enter' && addStopSequence()}
                        />
                        <Button onClick={addStopSequence} size="icon">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {config.stopSequences.map((seq, index) => (
                          <Badge key={index} variant="secondary" className="gap-1 pr-1">
                            <span className="font-mono">{seq}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 hover:bg-destructive/20"
                              onClick={() => removeStopSequence(index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                        {config.stopSequences.length === 0 && (
                          <span className="text-sm text-muted-foreground">Nenhuma sequência definida</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        A IA para de gerar texto ao encontrar essas sequências
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ======== MEMÓRIA E CONTEXTO ======== */}
          <TabsContent value="memory" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    Configuração da Memória
                  </CardTitle>
                  <CardDescription>
                    PostgreSQL gerenciado internamente pelo SaaS
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg border flex items-center gap-3">
                    <Badge>Provedor</Badge>
                    <span className="font-semibold">PostgreSQL (Supabase)</span>
                    <Badge variant="outline" className="ml-auto">Gerenciado</Badge>
                  </div>

                  <div className="space-y-2">
                    <Label>Janela de Contexto (Mensagens)</Label>
                    <Input
                      type="number"
                      value={config.contextWindowSize}
                      onChange={(e) => setConfig(prev => ({ ...prev, contextWindowSize: parseInt(e.target.value) || 10 }))}
                      min={1}
                      max={100}
                    />
                    <p className="text-xs text-muted-foreground">
                      Máximo de mensagens do histórico carregadas por requisição (impacta custo e relevância)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Política de Retenção</Label>
                    <Select 
                      value={config.retentionPolicy} 
                      onValueChange={(v) => setConfig(prev => ({ ...prev, retentionPolicy: v as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RETENTION_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Tempo de retenção do histórico antes da exclusão automática
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Isolamento e Sessão</CardTitle>
                  <CardDescription>
                    Configure o isolamento de dados do cliente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tabela de Histórico (Isolamento)</Label>
                    <Input
                      value={config.historyTable}
                      onChange={(e) => setConfig(prev => ({ ...prev, historyTable: e.target.value }))}
                      placeholder="agent_chat_history"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Nome da tabela PostgreSQL para este agente/cliente
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Session Key ID <Badge variant="destructive" className="ml-2 text-xs">Obrigatório</Badge></Label>
                    <Input
                      value={config.sessionKeyId}
                      onChange={(e) => setConfig(prev => ({ ...prev, sessionKeyId: e.target.value }))}
                      placeholder="{{ $json.session_id }}"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Variável do webhook usada como chave de sessão no n8n
                    </p>
                  </div>

                  <Separator />

                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <p className="text-sm">
                      <strong>Dica:</strong> Use variáveis n8n como <code className="bg-muted px-1 rounded">{"{{ $json.id }}"}</code> ou <code className="bg-muted px-1 rounded">{"{{ $json.user_id }}"}</code> para identificar sessões únicas.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ======== PERSONALIDADE E REGRAS ======== */}
          <TabsContent value="personality" className="space-y-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    System Prompt Principal
                  </CardTitle>
                  <CardDescription>
                    Defina a personalidade, tom e regras do seu agente
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

              <Card>
                <CardHeader>
                  <CardTitle>Instruções de Ação (Guardrails)</CardTitle>
                  <CardDescription>
                    Defina comandos específicos para segurança e alinhamento de marca
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

                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
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

          {/* ======== FERRAMENTAS E RAG ======== */}
          <TabsContent value="tools" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plug className="h-5 w-5 text-primary" />
                    RAG e Busca
                  </CardTitle>
                  <CardDescription>
                    Configure ferramentas de busca na web
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="space-y-0.5">
                      <Label className="text-base">Ativar Busca na Web (RAG)</Label>
                      <p className="text-sm text-muted-foreground">
                        Integra DuckDuckGo/Google Search para respostas factuais
                      </p>
                    </div>
                    <Switch
                      checked={config.enableWebSearch}
                      onCheckedChange={(v) => setConfig(prev => ({ ...prev, enableWebSearch: v }))}
                    />
                  </div>

                  {config.enableWebSearch && (
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                      <p className="text-sm">
                        <CheckCircle2 className="h-4 w-4 inline mr-2 text-green-500" />
                        O nó de busca será integrado automaticamente ao workflow do n8n.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Integração de Resposta</CardTitle>
                  <CardDescription>
                    Configure onde o n8n envia as respostas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>URL de Resposta (SaaS Endpoint) <Badge variant="destructive" className="ml-2 text-xs">Obrigatório</Badge></Label>
                    <Input
                      value={config.responseEndpoint}
                      onChange={(e) => setConfig(prev => ({ ...prev, responseEndpoint: e.target.value }))}
                      placeholder="https://..."
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Header de Autorização</Label>
                    <Input
                      value={config.responseAuthHeader}
                      onChange={(e) => setConfig(prev => ({ ...prev, responseAuthHeader: e.target.value }))}
                      placeholder="Authorization"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Token de Autorização</Label>
                    <div className="relative">
                      <Input
                        type={showAuthToken ? 'text' : 'password'}
                        value={config.responseAuthToken}
                        onChange={(e) => setConfig(prev => ({ ...prev, responseAuthToken: e.target.value }))}
                        placeholder="Bearer sk-..."
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowAuthToken(!showAuthToken)}
                      >
                        {showAuthToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ferramentas Personalizadas */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Ferramentas Personalizadas (API/Funções)</CardTitle>
                  <CardDescription>
                    Defina funções externas que o agente pode chamar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Input
                      value={newTool.name}
                      onChange={(e) => setNewTool(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nome da ferramenta"
                    />
                    <Input
                      value={newTool.description}
                      onChange={(e) => setNewTool(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descrição"
                    />
                    <div className="flex gap-2">
                      <Input
                        value={newTool.endpoint}
                        onChange={(e) => setNewTool(prev => ({ ...prev, endpoint: e.target.value }))}
                        placeholder="https://api.exemplo.com/funcao"
                        className="font-mono text-sm"
                      />
                      <Button onClick={addCustomTool} size="icon">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {config.customTools.map((tool) => (
                      <div
                        key={tool.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded bg-primary/10">
                            <Plug className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{tool.name}</p>
                            <p className="text-xs text-muted-foreground">{tool.description || 'Sem descrição'}</p>
                            <p className="text-xs font-mono text-muted-foreground">{tool.endpoint}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCustomTool(tool.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {config.customTools.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma ferramenta personalizada adicionada
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ======== MONITORAMENTO ======== */}
          <TabsContent value="monitoring" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-4">
              {/* Status */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Status do Agente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      agentStatus === 'online' ? 'bg-green-500/20' : 
                      agentStatus === 'offline' ? 'bg-red-500/20' : 'bg-yellow-500/20'
                    }`}>
                      <div className={`w-6 h-6 rounded-full ${
                        agentStatus === 'online' ? 'bg-green-500 animate-pulse' : 
                        agentStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
                      }`} />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {agentStatus === 'online' ? 'Online' : agentStatus === 'offline' ? 'Offline' : 'Verificando'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Workflow n8n
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Taxa de Erro */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Taxa de Erro
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-3xl font-bold ${metrics.errorRate < 2 ? 'text-green-500' : metrics.errorRate < 5 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {metrics.errorRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Últimas 24h</p>
                </CardContent>
              </Card>

              {/* Mensagens Hoje */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Mensagens Hoje
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{metrics.todayMessages}</p>
                  <p className="text-xs text-muted-foreground">Processadas</p>
                </CardContent>
              </Card>

              {/* Tokens Totais */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Tokens (Mês)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{(metrics.totalTokens / 1000).toFixed(1)}k</p>
                  <p className="text-xs text-muted-foreground">Consumidos</p>
                </CardContent>
              </Card>
            </div>

            {/* Métricas Detalhadas */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Contador de Mensagens</CardTitle>
                  <CardDescription>Mensagens processadas por período</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{metrics.todayMessages}</p>
                      <p className="text-xs text-muted-foreground">Hoje</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{metrics.weekMessages}</p>
                      <p className="text-xs text-muted-foreground">Semana</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{metrics.monthMessages}</p>
                      <p className="text-xs text-muted-foreground">Mês</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{metrics.totalMessages}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Consumo de Tokens</CardTitle>
                  <CardDescription>Input + Output tokens</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{(metrics.inputTokens / 1000).toFixed(1)}k</p>
                      <p className="text-xs text-muted-foreground">Input</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{(metrics.outputTokens / 1000).toFixed(1)}k</p>
                      <p className="text-xs text-muted-foreground">Output</p>
                    </div>
                    <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/30">
                      <p className="text-2xl font-bold text-primary">{(metrics.totalTokens / 1000).toFixed(1)}k</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Uso do limite mensal</span>
                      <span>{((metrics.totalTokens / 1000000) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: `${Math.min((metrics.totalTokens / 1000000) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {metrics.totalTokens.toLocaleString()} / 1.000.000 tokens
                    </p>
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
