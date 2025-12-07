import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Bot, Brain, Plug, Activity, Plus, Trash2, Eye, EyeOff, 
  Power, RefreshCw, Wifi, WifiOff, Shield, Database,
  ExternalLink, CheckCircle2, XCircle, Loader2, Play, Square, List, ServerCog, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ActionInstruction {
  id: string;
  instruction: string;
  type: 'do' | 'dont';
}

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
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
  isActive: boolean;
  n8nWorkflowId: string;
  provider: 'openai' | 'google';
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  contextWindowSize: number;
  retentionPolicy: '7days' | '30days' | '90days' | 'unlimited';
  sessionKeyId: string;
  systemPrompt: string;
  actionInstructions: ActionInstruction[];
  enableWebSearch: boolean;
}

interface AgentMetrics {
  totalMessages: number;
  errorRate: number;
  lastActivity: string | null;
}

const OPENAI_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o (Recomendado)' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Rápido)' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Econômico)' },
];

// Modelos Google organizados por categoria
type GoogleModelCategory = 'chat' | 'image' | 'video' | 'tts' | 'special';

interface GoogleModel {
  value: string;
  label: string;
  description: string;
  category: GoogleModelCategory;
}

const GOOGLE_MODELS: GoogleModel[] = [
  // Chat / Conversação - Gemini 2.5
  { value: 'models/gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Versão estável lançado em 17 de junho de 2025', category: 'chat' },
  { value: 'models/gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Multimodal de médio porte, até 1M tokens (abril 2025)', category: 'chat' },
  { value: 'models/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite', description: 'Versão estável lançado em julho de 2025', category: 'chat' },
  { value: 'models/gemini-2.5-flash-lite-preview-09-2025', label: 'Gemini 2.5 Flash-Lite Preview', description: 'Versão prévia (25 de setembro de 2025)', category: 'chat' },
  { value: 'models/gemini-2.5-computer-use-preview-10-2025', label: 'Gemini 2.5 Computer Use', description: 'Prévia de Uso de Computador', category: 'chat' },
  // Chat / Conversação - Gemini 2.0
  { value: 'models/gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Modelo multimodal rápido e versátil', category: 'chat' },
  { value: 'models/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash 001', description: 'Versão estável lançado em janeiro de 2025', category: 'chat' },
  { value: 'models/gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash Experimental', description: 'Versão experimental', category: 'chat' },
  { value: 'models/gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', description: 'Versão leve do 2.0 Flash', category: 'chat' },
  { value: 'models/gemini-2.0-flash-lite-001', label: 'Gemini 2.0 Flash Lite 001', description: 'Versão estável lançado em julho de 2025', category: 'chat' },
  { value: 'models/gemini-2.0-flash-lite-preview', label: 'Gemini 2.0 Flash Lite Preview', description: 'Versão prévia (5 de fevereiro de 2025)', category: 'chat' },
  { value: 'models/gemini-2.0-pro-exp', label: 'Gemini 2.0 Pro Experimental', description: 'Versão experimental (25 de março de 2025)', category: 'chat' },
  { value: 'models/gemini-2.0-pro-exp-02-05', label: 'Gemini 2.0 Pro Exp 02-05', description: 'Versão experimental (25 de março de 2025)', category: 'chat' },
  // Chat / Conversação - Latest
  { value: 'models/gemini-pro-latest', label: 'Gemini Pro Latest', description: 'Último lançamento do Gemini Pro', category: 'chat' },
  { value: 'models/gemini-flash-latest', label: 'Gemini Flash Latest', description: 'Último lançamento do Gemini Flash', category: 'chat' },
  { value: 'models/gemini-flash-lite-latest', label: 'Gemini Flash Lite Latest', description: 'Último lançamento do Gemini Flash-Lite', category: 'chat' },
  { value: 'models/gemini-exp-1206', label: 'Gemini Exp 1206', description: 'Versão experimental (25 de março de 2025)', category: 'chat' },
  // Gemma Models
  { value: 'models/gemma-3-12b-it', label: 'Gemma 3 12B IT', description: 'Modelo Gemma 3 com 12B parâmetros', category: 'chat' },
  { value: 'models/gemma-3-27b-it', label: 'Gemma 3 27B IT', description: 'Modelo Gemma 3 com 27B parâmetros', category: 'chat' },
  { value: 'models/gemma-3n-e2b-it', label: 'Gemma 3N E2B IT', description: 'Modelo Gemma 3N E2B', category: 'chat' },
  { value: 'models/gemma-3n-e4b-it', label: 'Gemma 3N E4B IT', description: 'Modelo Gemma 3N E4B', category: 'chat' },
  // AQA
  { value: 'models/aqa', label: 'AQA', description: 'Respostas fundamentadas em pesquisa para maior precisão', category: 'chat' },
  // Geração de Imagem
  { value: 'models/gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image', description: 'Versão estável lançado em julho de 2025', category: 'image' },
  { value: 'models/gemini-2.5-flash-image-preview', label: 'Gemini 2.5 Flash Image Preview', description: 'Prévia de Imagem do Gemini 2.5 Flash', category: 'image' },
  { value: 'models/gemini-2.0-flash-exp-image-generation', label: 'Gemini 2.0 Flash Image Gen', description: 'Geração de Imagem Experimental', category: 'image' },
  { value: 'models/gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image Preview', description: 'Prévia de Imagem do Gemini 3 Pro', category: 'image' },
  { value: 'vertex/imagen-4.0-fast-generate-001', label: 'Imagen 4.0 Fast', description: 'Modelo Imagen 4.0 rápido servido pelo Vertex', category: 'image' },
  { value: 'vertex/imagen-4.0-generate-001', label: 'Imagen 4.0', description: 'Modelo Imagen 4.0 servido pelo Vertex', category: 'image' },
  { value: 'vertex/imagen-4.0-ultra-generate-preview-06-06', label: 'Imagen 4.0 Ultra', description: 'Modelo Imagen 4.0 ultra servido pelo Vertex', category: 'image' },
  { value: 'vertex/nano-banana-pro-preview', label: 'Nano Banana Pro Preview', description: 'Prévia de Imagem do Gemini 3 Pro', category: 'image' },
  // Geração de Vídeo
  { value: 'models/veo-2.0-generate-001', label: 'Veo 2.0', description: 'Modelo Veo 2.0 para geração de vídeo', category: 'video' },
  { value: 'models/veo-3.0-fast-generate-001', label: 'Veo 3 Fast', description: 'Veo 3 rápido para geração de vídeo', category: 'video' },
  { value: 'models/veo-3.0-generate-001', label: 'Veo 3', description: 'Veo 3 para geração de vídeo', category: 'video' },
  { value: 'models/veo-3.1-generate-001', label: 'Veo 3.1', description: 'Veo 3.1 para geração de vídeo', category: 'video' },
  // Text-to-Speech
  { value: 'models/gemini-2.5-flash-preview-tts', label: 'Gemini 2.5 Flash TTS', description: 'Prévia Text-to-Speech Set 2025', category: 'tts' },
  { value: 'models/gemini-3-pro-preview-tts', label: 'Gemini 3 Pro TTS Preview', description: 'Prévia Text-to-Speech do Gemini 3 Pro', category: 'tts' },
  // Especiais
  { value: 'models/gemini-robotics-er-1.5-preview', label: 'Gemini Robotics ER 1.5', description: 'Prévia ER 1.5 de Robótica', category: 'special' },
];

const GOOGLE_CATEGORY_LABELS: Record<GoogleModelCategory, string> = {
  chat: '💬 Chat / Conversação',
  image: '🖼️ Geração de Imagem',
  video: '🎬 Geração de Vídeo',
  tts: '🔊 Text-to-Speech (TTS)',
  special: '🤖 Especiais',
};

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
  const [agentStatus, setAgentStatus] = useState<'online' | 'offline' | 'loading' | 'unknown'>('unknown');
  const [togglingAgent, setTogglingAgent] = useState(false);
  const [syncingLlm, setSyncingLlm] = useState(false);
  
  const [n8nConnected, setN8nConnected] = useState<boolean | null>(null);
  const [n8nTesting, setN8nTesting] = useState(false);
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [executions, setExecutions] = useState<N8nExecution[]>([]);
  const [loadingExecutions, setLoadingExecutions] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<N8nWorkflow | null>(null);
  const [syncingMemory, setSyncingMemory] = useState(false);
  
  const [metrics, setMetrics] = useState<AgentMetrics>({
    totalMessages: 0,
    errorRate: 0,
    lastActivity: null,
  });
  
  const [config, setConfig] = useState<AgentConfig>({
    isActive: false,
    n8nWorkflowId: '',
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2048,
    contextWindowSize: 10,
    retentionPolicy: '30days',
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
  });

  const [newInstruction, setNewInstruction] = useState('');
  const [newInstructionType, setNewInstructionType] = useState<'do' | 'dont'>('do');
  const [syncingPrompt, setSyncingPrompt] = useState(false);

  const availableModels = config.provider === 'openai' ? OPENAI_MODELS : GOOGLE_MODELS;

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

  useEffect(() => {
    testN8nConnection();
  }, []);

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
      model: provider === 'openai' ? 'gpt-4o' : 'models/gemini-2.5-flash',
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

  const syncToN8n = async (workflowId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('n8n-sync-config', {
        body: {
          action: 'sync_config',
          workflowId,
          config: {
            aiModel: config.model,
            systemPrompt: config.systemPrompt,
            personality: config.actionInstructions
              .filter(i => i.type === 'do')
              .map(i => i.instruction)
              .join('\n'),
            actionInstructions: config.actionInstructions
              .map(i => `${i.type === 'do' ? '✓' : '✗'} ${i.instruction}`)
              .join('\n'),
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            memorySessionId: config.sessionKeyId,
            aiCredentials: {
              [config.provider === 'openai' ? 'openai_api_key' : 'google_api_key']: config.apiKey,
            },
          },
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Sync error:', error);
      throw error;
    }
  };

  // Sincronizar apenas o System Prompt diretamente com n8n
  const syncSystemPromptToN8n = async () => {
    if (!config.n8nWorkflowId) {
      toast({
        title: "Workflow não selecionado",
        description: "Selecione um workflow na aba Status antes de sincronizar.",
        variant: "destructive",
      });
      return;
    }

    setSyncingPrompt(true);
    try {
      // Monta o prompt completo com instruções de ação
      const fullPrompt = `${config.systemPrompt}

=== INSTRUÇÕES DE AÇÃO ===
${config.actionInstructions.map(i => `${i.type === 'do' ? '✓ FAÇA:' : '✗ NUNCA FAÇA:'} ${i.instruction}`).join('\n')}`;

      const result = await n8nApiCall('update_system_prompt', {
        workflowId: config.n8nWorkflowId,
        newSystemMessage: fullPrompt,
      });

      if (result.success) {
        toast({
          title: "System Prompt sincronizado!",
          description: `Atualizado no workflow ${config.n8nWorkflowId}`,
        });
      } else {
        throw new Error(result.error || 'Falha ao sincronizar');
      }
    } catch (error: any) {
      toast({
        title: "Erro ao sincronizar",
        description: error.message || "Não foi possível sincronizar o System Prompt.",
        variant: "destructive",
      });
    } finally {
      setSyncingPrompt(false);
    }
  };

  // Sincronizar credenciais e modelo LLM com n8n
  const syncLlmConfigToN8n = async () => {
    if (!config.n8nWorkflowId) {
      toast({
        title: "Workflow não selecionado",
        description: "Selecione um workflow na aba Status antes de sincronizar.",
        variant: "destructive",
      });
      return;
    }

    if (!config.apiKey) {
      toast({
        title: "API Key não informada",
        description: "Insira a chave de API do provedor selecionado.",
        variant: "destructive",
      });
      return;
    }

    setSyncingLlm(true);
    try {
      const result = await n8nApiCall('update_llm_config', {
        workflowId: config.n8nWorkflowId,
        provider: config.provider,
        apiKey: config.apiKey,
        model: config.model,
      });

      if (result.success) {
        toast({
          title: "Motor IA sincronizado!",
          description: `${result.provider}/${result.model} configurado no workflow. Credencial ID: ${result.credentialId}`,
        });
      } else {
        throw new Error(result.error || 'Falha ao sincronizar LLM');
      }
    } catch (error: any) {
      toast({
        title: "Erro ao sincronizar Motor IA",
        description: error.message || "Não foi possível sincronizar as credenciais.",
        variant: "destructive",
      });
    } finally {
      setSyncingLlm(false);
    }
  };

  // Sincronizar memória PostgreSQL com n8n
  const syncMemoryToN8n = async () => {
    if (!config.n8nWorkflowId) {
      toast({
        title: "Workflow não selecionado",
        description: "Selecione um workflow na aba Status antes de sincronizar.",
        variant: "destructive",
      });
      return;
    }

    setSyncingMemory(true);
    try {
      const result = await n8nApiCall('update_memory_config', {
        workflowId: config.n8nWorkflowId,
        sessionIdKey: config.sessionKeyId,
        contextWindowSize: config.contextWindowSize,
      });

      if (result.success) {
        toast({
          title: "Memória PostgreSQL sincronizada!",
          description: `Conectado ao PostgreSQL em ${result.postgresConfig?.host}. Credencial ID: ${result.credentialId}`,
        });
      } else {
        throw new Error(result.error || 'Falha ao sincronizar memória');
      }
    } catch (error: any) {
      toast({
        title: "Erro ao sincronizar memória",
        description: error.message || "Não foi possível configurar a memória PostgreSQL.",
        variant: "destructive",
      });
    } finally {
      setSyncingMemory(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Salvar localmente
      localStorage.setItem('agentConfig', JSON.stringify({
        ...config,
        apiKey: '***ENCRYPTED***',
      }));

      if (config.n8nWorkflowId) {
        // Monta o prompt completo com instruções de ação
        const fullPrompt = `${config.systemPrompt}

=== INSTRUÇÕES DE AÇÃO ===
${config.actionInstructions.map(i => `${i.type === 'do' ? '✓ FAÇA:' : '✗ NUNCA FAÇA:'} ${i.instruction}`).join('\n')}`;

        // Sincronizar System Prompt diretamente via update_system_prompt
        const promptResult = await n8nApiCall('update_system_prompt', {
          workflowId: config.n8nWorkflowId,
          newSystemMessage: fullPrompt,
        });

        // Sincronizar credenciais e modelo LLM
        let llmResult = { success: true };
        if (config.apiKey && config.apiKey !== '***ENCRYPTED***') {
          llmResult = await n8nApiCall('update_llm_config', {
            workflowId: config.n8nWorkflowId,
            provider: config.provider,
            apiKey: config.apiKey,
            model: config.model,
          });
        }

        // Também sincroniza outras configurações via n8n-sync-config
        const syncResult = await syncToN8n(config.n8nWorkflowId);
        
        if (promptResult?.success && llmResult?.success && syncResult?.success) {
          toast({
            title: "Tudo sincronizado!",
            description: `System Prompt, Motor IA (${config.provider}/${config.model}) e configurações atualizadas.`,
          });
        } else if (promptResult?.success && llmResult?.success) {
          toast({
            title: "Prompt e Motor sincronizados!",
            description: "System Prompt e credenciais atualizadas. Algumas configurações adicionais podem não ter sido aplicadas.",
          });
        } else if (promptResult?.success) {
          toast({
            title: "Prompt sincronizado!",
            description: "System Prompt atualizado. Falha ao sincronizar Motor IA.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Configuração salva localmente",
            description: "Salvo local, mas falha ao sincronizar com n8n.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Configuração salva!",
          description: "Selecione um workflow para sincronizar com n8n.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
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
                {loading ? 'Salvando...' : 'Salvar e Sincronizar'}
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

          {/* STATUS */}
          <TabsContent value="status" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
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
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-2"
                        onClick={() => window.open(`https://n8n.starai.com.br/workflow/${selectedWorkflow.id}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Abrir no n8n
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

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
                      </div>
                    </div>
                    <Switch
                      checked={config.isActive}
                      onCheckedChange={toggleWorkflowStatus}
                      disabled={togglingAgent || !config.n8nWorkflowId || !n8nConnected}
                      className="scale-125"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant={config.isActive ? "destructive" : "default"}
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
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Atualizar Status
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* MOTOR IA */}
          <TabsContent value="engine" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
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
                      Armazenamento criptografado
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Select value={config.model} onValueChange={(v) => setConfig(prev => ({ ...prev, model: v }))}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Selecione um modelo" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover max-h-[400px]">
                        {config.provider === 'openai' ? (
                          // OpenAI Models - lista simples
                          OPENAI_MODELS.map(model => (
                            <SelectItem key={model.value} value={model.value}>
                              {model.label}
                            </SelectItem>
                          ))
                        ) : (
                          // Google Models - agrupado por categoria
                          (['chat', 'image', 'video', 'tts', 'special'] as GoogleModelCategory[]).map((category) => {
                            const modelsInCategory = GOOGLE_MODELS.filter(m => m.category === category);
                            if (modelsInCategory.length === 0) return null;
                            return (
                              <SelectGroup key={category}>
                                <SelectLabel className="bg-muted/50 text-muted-foreground">
                                  {GOOGLE_CATEGORY_LABELS[category]}
                                </SelectLabel>
                                {modelsInCategory.map((model) => (
                                  <SelectItem key={model.value} value={model.value}>
                                    {model.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                    {config.provider === 'google' && (
                      <p className="text-xs text-muted-foreground">
                        {GOOGLE_MODELS.find(m => m.value === config.model)?.description}
                      </p>
                    )}
                  </div>

                  <Button 
                    onClick={syncLlmConfigToN8n} 
                    disabled={syncingLlm || !config.n8nWorkflowId || !config.apiKey}
                    className="w-full gap-2"
                    variant="outline"
                  >
                    {syncingLlm ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {syncingLlm ? 'Sincronizando...' : 'Salvar Credencial no n8n'}
                  </Button>
                  
                  {!config.n8nWorkflowId && (
                    <p className="text-xs text-amber-500">
                      Selecione um workflow na aba Status para sincronizar
                    </p>
                  )}
                </CardContent>
              </Card>

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
            </div>
          </TabsContent>

          {/* MEMÓRIA */}
          <TabsContent value="memory" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    Memória PostgreSQL (VPS)
                  </CardTitle>
                  <CardDescription>
                    Memória persistente usando PostgreSQL externo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                    <div className="flex items-center gap-3 mb-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="font-semibold text-green-700 dark:text-green-400">PostgreSQL Configurado</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Host:</span>
                        <code className="bg-muted px-2 py-0.5 rounded">151.243.24.146</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Database:</span>
                        <code className="bg-muted px-2 py-0.5 rounded">n8n</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">User:</span>
                        <code className="bg-muted px-2 py-0.5 rounded">n8n</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Porta:</span>
                        <code className="bg-muted px-2 py-0.5 rounded">5432</code>
                      </div>
                    </div>
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
                      Número de mensagens anteriores que o agente lembra
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
                  </div>

                  <Button 
                    onClick={syncMemoryToN8n} 
                    disabled={syncingMemory || !config.n8nWorkflowId}
                    className="w-full gap-2"
                    variant="outline"
                  >
                    {syncingMemory ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {syncingMemory ? 'Configurando...' : 'Sincronizar Memória com n8n'}
                  </Button>

                  {!config.n8nWorkflowId && (
                    <p className="text-xs text-amber-500">
                      Selecione um workflow na aba Status para sincronizar
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Isolamento e Sessão</CardTitle>
                  <CardDescription>
                    Configure como identificar sessões únicas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Session Key ID</Label>
                    <Input
                      value={config.sessionKeyId}
                      onChange={(e) => setConfig(prev => ({ ...prev, sessionKeyId: e.target.value }))}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Variável usada para identificar sessões únicas (ex: {`{{ $json.session_id }}`})
                    </p>
                  </div>

                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <p className="text-sm font-medium mb-2">Tabela de Histórico</p>
                    <code className="text-xs bg-background px-2 py-1 rounded block">
                      n8n_chat_histories
                    </code>
                    <p className="text-xs text-muted-foreground mt-2">
                      Esta tabela será criada automaticamente no PostgreSQL
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* PERSONALIDADE */}
          <TabsContent value="personality" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  System Prompt Principal
                </CardTitle>
                <CardDescription>
                  Defina como o agente deve se comportar e responder
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={config.systemPrompt}
                  onChange={(e) => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                  className="min-h-[250px] font-mono text-sm"
                  placeholder="Descreva a personalidade e comportamento do agente..."
                />
                {!config.n8nWorkflowId && (
                  <p className="text-sm text-amber-500 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Selecione um workflow na aba "Status" para habilitar sincronização
                  </p>
                )}
                {config.n8nWorkflowId && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Workflow selecionado: <code className="bg-muted px-1 rounded">{config.n8nWorkflowId}</code>
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Instruções de Ação (Guardrails)</CardTitle>
                <CardDescription>
                  Defina o que o agente deve ou não fazer
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

          {/* FERRAMENTAS */}
          <TabsContent value="tools" className="space-y-6">
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
                      Permite ao agente buscar informações na internet
                    </p>
                  </div>
                  <Switch
                    checked={config.enableWebSearch}
                    onCheckedChange={(v) => setConfig(prev => ({ ...prev, enableWebSearch: v }))}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MONITORAMENTO */}
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
