import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Bot, Brain, MessageSquare, Plug, Activity, Plus, Trash2, Eye, EyeOff, 
  Power, RefreshCw, Wifi, WifiOff, AlertCircle, Settings2, Shield, Zap, Clock, Database,
  ExternalLink, Copy, CheckCircle2, XCircle, Loader2, Play, Square, List, ServerCog
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
import { ScrollArea } from '@/components/ui/scroll-area';
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

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tags?: { id: string; name: string }[];
}

interface N8nExecution {
  id: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  status: string;
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
  
  // n8n State
  const [n8nConnected, setN8nConnected] = useState<boolean | null>(null);
  const [n8nTesting, setN8nTesting] = useState(false);
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [executions, setExecutions] = useState<N8nExecution[]>([]);
  const [loadingExecutions, setLoadingExecutions] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<N8nWorkflow | null>(null);
  
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
    isActive: false,
    n8nWorkflowId: '',
    errorWebhookUrl: '',
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1.0,
    frequencyPenalty: 0,
    stopSequences: [],
    contextWindowSize: 10,
    retentionPolicy: '30days',
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
    customTools: [],
    responseEndpoint: 'https://agndhravgmcwpdjkozka.supabase.co/functions/v1/agent-response',
    responseAuthHeader: 'Authorization',
    responseAuthToken: '',
  });

  const [newInstruction, setNewInstruction] = useState('');
  const [newInstructionType, setNewInstructionType] = useState<'do' | 'dont'>('do');
  const [newStopSequence, setNewStopSequence] = useState('');
  const [newTool, setNewTool] = useState({ name: '', description: '', endpoint: '' });

  const availableModels = config.provider === 'openai' ? OPENAI_MODELS : GOOGLE_MODELS;

  // ========== n8n API Functions ==========
  const n8nApiCall = useCallback(async (action: string, params: any = {}) => {
    const { data, error } = await supabase.functions.invoke('n8n-api', {
      body: { action, ...params }
    });
    
    if (error) throw error;
    return data;
  }, []);

  const testN8nConnection = async () => {
    setN8nTesting(true);
    try {
      const result = await n8nApiCall('test_connection');
      setN8nConnected(result.success);
      
      if (result.success) {
        toast({
          title: "Conexão estabelecida!",
          description: `Conectado ao n8n em ${result.n8nUrl}`,
        });
        // Load workflows after successful connection
        loadWorkflows();
      } else {
        toast({
          title: "Falha na conexão",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setN8nConnected(false);
      toast({
        title: "Erro de conexão",
        description: error.message || "Não foi possível conectar ao n8n",
        variant: "destructive",
      });
    } finally {
      setN8nTesting(false);
    }
  };

  const loadWorkflows = async () => {
    setLoadingWorkflows(true);
    try {
      const result = await n8nApiCall('list_workflows', { limit: 100 });
      if (result.success) {
        setWorkflows(result.workflows);
      }
    } catch (error: any) {
      console.error('Error loading workflows:', error);
      toast({
        title: "Erro ao carregar workflows",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingWorkflows(false);
    }
  };

  const loadExecutions = async (workflowId?: string) => {
    setLoadingExecutions(true);
    try {
      const result = await n8nApiCall('get_executions', { 
        workflowId: workflowId || config.n8nWorkflowId,
        limit: 20 
      });
      if (result.success) {
        setExecutions(result.executions);
        
        // Calculate metrics from executions
        const successCount = result.executions.filter((e: N8nExecution) => e.status === 'success').length;
        const errorCount = result.executions.filter((e: N8nExecution) => e.status === 'error').length;
        const total = result.executions.length;
        
        setMetrics(prev => ({
          ...prev,
          totalMessages: total,
          errorRate: total > 0 ? (errorCount / total) * 100 : 0,
          lastActivity: result.executions[0]?.startedAt || null,
        }));
      }
    } catch (error: any) {
      console.error('Error loading executions:', error);
    } finally {
      setLoadingExecutions(false);
    }
  };

  const activateWorkflow = async (workflowId: string) => {
    setTogglingAgent(true);
    try {
      const result = await n8nApiCall('activate_workflow', { workflowId });
      
      if (result.success) {
        toast({
          title: "Workflow Ativado",
          description: `Workflow ${workflowId} está agora ativo.`,
        });
        setAgentStatus('online');
        setConfig(prev => ({ ...prev, isActive: true }));
        localStorage.setItem('agentEstado', 'ativado');
        
        // Update workflow list
        setWorkflows(prev => prev.map(w => 
          w.id === workflowId ? { ...w, active: true } : w
        ));
      }
    } catch (error: any) {
      toast({
        title: "Erro ao ativar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTogglingAgent(false);
    }
  };

  const deactivateWorkflow = async (workflowId: string) => {
    setTogglingAgent(true);
    try {
      const result = await n8nApiCall('deactivate_workflow', { workflowId });
      
      if (result.success) {
        toast({
          title: "Workflow Desativado",
          description: `Workflow ${workflowId} foi desativado.`,
        });
        setAgentStatus('offline');
        setConfig(prev => ({ ...prev, isActive: false }));
        localStorage.setItem('agentEstado', 'desativado');
        
        // Update workflow list
        setWorkflows(prev => prev.map(w => 
          w.id === workflowId ? { ...w, active: false } : w
        ));
      }
    } catch (error: any) {
      toast({
        title: "Erro ao desativar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTogglingAgent(false);
    }
  };

  const toggleWorkflowStatus = async () => {
    if (!config.n8nWorkflowId) {
      toast({
        title: "Selecione um workflow",
        description: "Escolha um workflow na lista antes de ativar/desativar.",
        variant: "destructive",
      });
      return;
    }
    
    if (config.isActive) {
      await deactivateWorkflow(config.n8nWorkflowId);
    } else {
      await activateWorkflow(config.n8nWorkflowId);
    }
  };

  // Initial load
  useEffect(() => {
    testN8nConnection();
  }, []);

  // Update status when workflow is selected
  useEffect(() => {
    if (config.n8nWorkflowId) {
      const workflow = workflows.find(w => w.id === config.n8nWorkflowId);
      if (workflow) {
        setSelectedWorkflow(workflow);
        setAgentStatus(workflow.active ? 'online' : 'offline');
        setConfig(prev => ({ ...prev, isActive: workflow.active }));
        loadExecutions(workflow.id);
      }
    }
  }, [config.n8nWorkflowId, workflows]);

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
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Integrado com n8n</span>
                    {n8nConnected === true && (
                      <Badge variant="outline" className="text-green-500 border-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Conectado
                      </Badge>
                    )}
                    {n8nConnected === false && (
                      <Badge variant="outline" className="text-red-500 border-red-500">
                        <XCircle className="h-3 w-3 mr-1" />
                        Desconectado
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
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
              {/* Conexão n8n */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ServerCog className="h-5 w-5 text-primary" />
                    Conexão com n8n
                  </CardTitle>
                  <CardDescription>
                    Status da integração com sua instância n8n
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                    n8nConnected === true ? 'border-green-500 bg-green-500/10' :
                    n8nConnected === false ? 'border-red-500 bg-red-500/10' :
                    'border-border'
                  }`}>
                    <div className="flex items-center gap-3">
                      {n8nConnected === true ? (
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                      ) : n8nConnected === false ? (
                        <XCircle className="h-8 w-8 text-red-500" />
                      ) : (
                        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                      )}
                      <div>
                        <p className="font-semibold">
                          {n8nConnected === true ? 'Conectado' :
                           n8nConnected === false ? 'Desconectado' : 'Verificando...'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          https://n8n.starai.com.br
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={testN8nConnection}
                      disabled={n8nTesting}
                    >
                      {n8nTesting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {n8nConnected && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Workflows disponíveis:</span>
                      <Badge>{workflows.length}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Seleção de Workflow */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <List className="h-5 w-5 text-primary" />
                    Selecionar Workflow
                  </CardTitle>
                  <CardDescription>
                    Escolha o workflow do agente no n8n
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Select 
                      value={config.n8nWorkflowId} 
                      onValueChange={(v) => setConfig(prev => ({ ...prev, n8nWorkflowId: v }))}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione um workflow..." />
                      </SelectTrigger>
                      <SelectContent>
                        {workflows.map(wf => (
                          <SelectItem key={wf.id} value={wf.id}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${wf.active ? 'bg-green-500' : 'bg-red-500'}`} />
                              {wf.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={loadWorkflows}
                      disabled={loadingWorkflows}
                    >
                      {loadingWorkflows ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {selectedWorkflow && (
                    <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{selectedWorkflow.name}</span>
                        <Badge variant={selectedWorkflow.active ? "default" : "secondary"}>
                          {selectedWorkflow.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <p>ID: {selectedWorkflow.id}</p>
                        <p>Atualizado: {new Date(selectedWorkflow.updatedAt).toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Controle de Status */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Power className="h-5 w-5 text-primary" />
                    Controle do Agente
                  </CardTitle>
                  <CardDescription>
                    Ative ou desative o workflow selecionado
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
                          {config.isActive ? 'O workflow está ativo no n8n' : 'O workflow está desativado'}
                        </p>
                        {config.n8nWorkflowId && (
                          <p className="text-xs text-muted-foreground font-mono mt-1">
                            Workflow: {config.n8nWorkflowId}
                          </p>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={config.isActive}
                      onCheckedChange={toggleWorkflowStatus}
                      disabled={togglingAgent || !config.n8nWorkflowId || !n8nConnected}
                      className="scale-125"
                    />
                  </div>

                  {/* Botões de Ação */}
                  <div className="grid grid-cols-3 gap-3">
                    <Button 
                      variant={config.isActive ? "destructive" : "default"}
                      className="flex-1"
                      onClick={toggleWorkflowStatus}
                      disabled={togglingAgent || !config.n8nWorkflowId || !n8nConnected}
                    >
                      {togglingAgent ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : config.isActive ? (
                        <Square className="h-4 w-4 mr-2" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      {config.isActive ? 'Desativar' : 'Ativar'}
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={() => loadExecutions()}
                      disabled={loadingExecutions || !config.n8nWorkflowId}
                    >
                      {loadingExecutions ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Activity className="h-4 w-4 mr-2" />
                      )}
                      Ver Execuções
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={() => window.open(`https://n8n.starai.com.br/workflow/${config.n8nWorkflowId}`, '_blank')}
                      disabled={!config.n8nWorkflowId}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir no n8n
                    </Button>
                  </div>

                  {/* Lista de Workflows */}
                  <div className="space-y-2">
                    <Label>Todos os Workflows ({workflows.length})</Label>
                    <ScrollArea className="h-[200px] rounded-lg border p-2">
                      {workflows.map(wf => (
                        <div 
                          key={wf.id}
                          className={`flex items-center justify-between p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                            config.n8nWorkflowId === wf.id 
                              ? 'bg-primary/10 border border-primary' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setConfig(prev => ({ ...prev, n8nWorkflowId: wf.id }))}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${wf.active ? 'bg-green-500' : 'bg-red-500'}`} />
                            <div>
                              <p className="font-medium text-sm">{wf.name}</p>
                              <p className="text-xs text-muted-foreground">ID: {wf.id}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={wf.active ? "default" : "secondary"} className="text-xs">
                              {wf.active ? 'Ativo' : 'Inativo'}
                            </Badge>
                            {config.n8nWorkflowId !== wf.id && (
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  wf.active ? deactivateWorkflow(wf.id) : activateWorkflow(wf.id);
                                }}
                                disabled={togglingAgent}
                              >
                                {wf.active ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      {workflows.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          {loadingWorkflows ? 'Carregando...' : 'Nenhum workflow encontrado'}
                        </p>
                      )}
                    </ScrollArea>
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

                  <div className="space-y-2">
                    <Label>Max Tokens (Limite de Resposta)</Label>
                    <Input
                      type="number"
                      value={config.maxTokens}
                      onChange={(e) => setConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 0 }))}
                      min={100}
                      max={128000}
                    />
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
                    </div>

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
                    </div>

                    <div className="space-y-4 md:col-span-2">
                      <Label>Sequências de Parada</Label>
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
                      </div>
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
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Isolamento e Sessão</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tabela de Histórico</Label>
                    <Input
                      value={config.historyTable}
                      onChange={(e) => setConfig(prev => ({ ...prev, historyTable: e.target.value }))}
                      className="font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Session Key ID</Label>
                    <Input
                      value={config.sessionKeyId}
                      onChange={(e) => setConfig(prev => ({ ...prev, sessionKeyId: e.target.value }))}
                      className="font-mono text-sm"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ======== PERSONALIDADE ======== */}
          <TabsContent value="personality" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  System Prompt Principal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={config.systemPrompt}
                  onChange={(e) => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                  className="min-h-[200px] font-mono text-sm"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Instruções de Ação (Guardrails)</CardTitle>
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

                <ScrollArea className="h-[250px]">
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
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ======== FERRAMENTAS ======== */}
          <TabsContent value="tools" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plug className="h-5 w-5 text-primary" />
                    RAG e Busca
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <Label className="text-base">Ativar Busca na Web (RAG)</Label>
                      <p className="text-sm text-muted-foreground">
                        Integra DuckDuckGo/Google Search
                      </p>
                    </div>
                    <Switch
                      checked={config.enableWebSearch}
                      onCheckedChange={(v) => setConfig(prev => ({ ...prev, enableWebSearch: v }))}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Integração de Resposta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>URL de Resposta (Endpoint)</Label>
                    <Input
                      value={config.responseEndpoint}
                      onChange={(e) => setConfig(prev => ({ ...prev, responseEndpoint: e.target.value }))}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Token de Autorização</Label>
                    <div className="relative">
                      <Input
                        type={showAuthToken ? 'text' : 'password'}
                        value={config.responseAuthToken}
                        onChange={(e) => setConfig(prev => ({ ...prev, responseAuthToken: e.target.value }))}
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
            </div>
          </TabsContent>

          {/* ======== MONITORAMENTO ======== */}
          <TabsContent value="monitoring" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      agentStatus === 'online' ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      <div className={`w-6 h-6 rounded-full ${
                        agentStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                      }`} />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {agentStatus === 'online' ? 'Online' : 'Offline'}
                      </p>
                      <p className="text-xs text-muted-foreground">n8n Workflow</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Taxa de Erro</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-3xl font-bold ${metrics.errorRate < 5 ? 'text-green-500' : 'text-red-500'}`}>
                    {metrics.errorRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Últimas execuções</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Execuções</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{executions.length}</p>
                  <p className="text-xs text-muted-foreground">Registradas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Última Atividade</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">
                    {metrics.lastActivity 
                      ? new Date(metrics.lastActivity).toLocaleString('pt-BR')
                      : 'Nenhuma'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Lista de Execuções */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Histórico de Execuções</span>
                  <Button variant="outline" size="sm" onClick={() => loadExecutions()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {executions.map(exec => (
                      <div key={exec.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${
                            exec.status === 'success' ? 'bg-green-500' :
                            exec.status === 'error' ? 'bg-red-500' :
                            exec.status === 'running' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'
                          }`} />
                          <div>
                            <p className="font-mono text-sm">#{exec.id}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(exec.startedAt).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <Badge variant={
                          exec.status === 'success' ? 'default' :
                          exec.status === 'error' ? 'destructive' : 'secondary'
                        }>
                          {exec.status}
                        </Badge>
                      </div>
                    ))}
                    {executions.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        {loadingExecutions ? 'Carregando...' : 'Nenhuma execução encontrada'}
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminAgentConfigPage;
