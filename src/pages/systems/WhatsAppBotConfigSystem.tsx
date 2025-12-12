import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  ArrowLeft, Save, Bot, Brain, Plug, Activity, Plus, Trash2, Eye, EyeOff, 
  Power, RefreshCw, Wifi, WifiOff, Shield, Database, Pencil, Check,
  ExternalLink, CheckCircle2, XCircle, Loader2, Play, Square, List, ServerCog, Send,
  ChevronDown, ChevronRight, Key, TestTube2, BarChart3, MessageCircle,
  Sparkles, Wallet, TrendingUp, Gift, Zap, CreditCard, ArrowRight
} from 'lucide-react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ToolsConfigSection } from '@/components/agent/ToolsConfigSection';
import { TokenUsageStats } from '@/components/agent/TokenUsageStats';
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
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

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

interface TokenUsageStatsData {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  executionCount: number;
  byExecution: Array<{
    executionId: string;
    tokens: number;
    promptTokens: number;
    completionTokens: number;
    date: string;
  }>;
}

type CommunicationTone = 'profissional' | 'amigavel' | 'tecnico' | 'entusiasmado' | 'empatico' | 'direto';

interface AgentConfig {
  isActive: boolean;
  n8nWorkflowId: string;
  provider: 'openai' | 'google' | 'starai';
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  contextWindowSize: number;
  retentionPolicy: '7days' | '30days' | '90days' | 'unlimited';
  sessionKeyId: string;
  communicationTone: CommunicationTone;
  systemPrompt: string;
  actionInstructions: ActionInstruction[];
  enableWebSearch: boolean;
  enabledTools: string[];
  businessName: string;
}

const COMMUNICATION_TONES: Record<CommunicationTone, { emoji: string; label: string; desc: string; color: string; instruction: string }> = {
  profissional: {
    emoji: '👔',
    label: 'Profissional',
    desc: 'Formal e corporativo',
    color: 'from-slate-500 to-slate-600',
    instruction: 'Use linguagem corporativa e formal. Trate por "senhor(a)" quando apropriado. Seja objetivo e mantenha distância profissional.'
  },
  amigavel: {
    emoji: '😊',
    label: 'Amigável',
    desc: 'Casual e acolhedor',
    color: 'from-amber-500 to-orange-500',
    instruction: 'Use linguagem casual mas respeitosa. Emojis são bem-vindos com moderação. Trate por "você" e seja caloroso.'
  },
  tecnico: {
    emoji: '🔬',
    label: 'Técnico',
    desc: 'Preciso e detalhado',
    color: 'from-blue-500 to-indigo-500',
    instruction: 'Use terminologia técnica precisa. Explique conceitos quando necessário. Seja detalhista nas explicações.'
  },
  entusiasmado: {
    emoji: '🎉',
    label: 'Entusiasmado',
    desc: 'Energético e motivador',
    color: 'from-pink-500 to-rose-500',
    instruction: 'Demonstre energia positiva! Celebre conquistas do usuário. Use exclamações com moderação. Mantenha otimismo.'
  },
  empatico: {
    emoji: '💚',
    label: 'Empático',
    desc: 'Compreensivo e atencioso',
    color: 'from-emerald-500 to-teal-500',
    instruction: 'Demonstre compreensão genuína. Valide sentimentos do usuário. Seja paciente e acolhedor.'
  },
  direto: {
    emoji: '🎯',
    label: 'Direto',
    desc: 'Objetivo e conciso',
    color: 'from-violet-500 to-purple-500',
    instruction: 'Vá direto ao ponto. Evite rodeios. Respostas concisas. Foque no essencial.'
  },
};

interface AgentMetrics {
  totalMessages: number;
  errorRate: number;
  lastActivity: string | null;
}

// Modelos OpenAI organizados por categoria
type OpenAIModelCategory = 'flagship' | 'mini' | 'reasoning' | 'audio' | 'image' | 'search' | 'codex' | 'legacy';

interface OpenAIModel {
  value: string;
  label: string;
  description: string;
  category: OpenAIModelCategory;
}

const OPENAI_MODELS: OpenAIModel[] = [
  { value: 'gpt-5.1', label: 'GPT-5.1', description: 'Modelo mais recente e poderoso', category: 'flagship' },
  { value: 'gpt-5', label: 'GPT-5', description: 'Modelo flagship anterior', category: 'flagship' },
  { value: 'gpt-4o', label: 'GPT-4o', description: 'Modelo multimodal rápido', category: 'flagship' },
  { value: 'gpt-4', label: 'GPT-4', description: 'Modelo GPT-4 original', category: 'flagship' },
  { value: 'gpt-5-mini', label: 'GPT-5 Mini', description: 'Versão rápida do GPT-5', category: 'mini' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Versão rápida do GPT-4o', category: 'mini' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Modelo econômico e rápido', category: 'mini' },
  { value: 'o4-mini', label: 'O4 Mini', description: 'Modelo de raciocínio rápido', category: 'reasoning' },
  { value: 'o3', label: 'O3', description: 'Modelo de raciocínio poderoso', category: 'reasoning' },
  { value: 'o1', label: 'O1', description: 'Modelo de raciocínio original', category: 'reasoning' },
];

const OPENAI_CATEGORY_LABELS: Record<OpenAIModelCategory, string> = {
  flagship: '⭐ Flagship (Principais)',
  mini: '⚡ Mini / Nano (Rápidos)',
  reasoning: '🧠 Reasoning (Raciocínio)',
  audio: '🎵 Audio',
  image: '🖼️ Image',
  search: '🔍 Search',
  codex: '💻 Codex (Código)',
  legacy: '📦 Legacy',
};

// Modelos Google organizados por categoria
type GoogleModelCategory = 'chat' | 'image' | 'video' | 'tts' | 'special';

interface GoogleModel {
  value: string;
  label: string;
  description: string;
  category: GoogleModelCategory;
}

const GOOGLE_MODELS: GoogleModel[] = [
  { value: 'models/gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Versão estável', category: 'chat' },
  { value: 'models/gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Multimodal rápido', category: 'chat' },
  { value: 'models/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite', description: 'Versão leve', category: 'chat' },
  { value: 'models/gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Modelo multimodal rápido', category: 'chat' },
  { value: 'models/gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image', description: 'Geração de imagem', category: 'image' },
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

const WhatsAppBotConfigSystem = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { productId } = useParams();
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
  const [syncingTools, setSyncingTools] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<N8nWorkflow | null>(null);
  const [syncingMemory, setSyncingMemory] = useState(false);
  
  // Estado para créditos StarAI
  const [staraiCredits, setStaraiCredits] = useState({
    balanceBRL: 0,
    freeBalanceBRL: 0,
    depositedBRL: 0,
  });
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number>(50);
  const [processingDeposit, setProcessingDeposit] = useState(false);
  
  const [metrics, setMetrics] = useState<AgentMetrics>({
    totalMessages: 0,
    errorRate: 0,
    lastActivity: null,
  });
  
  const [config, setConfig] = useState<AgentConfig>({
    isActive: false,
    n8nWorkflowId: '',
    provider: 'starai',
    apiKey: '',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2048,
    contextWindowSize: 10,
    retentionPolicy: '30days',
    sessionKeyId: '{{ $json.session_id }}',
    communicationTone: 'amigavel',
    systemPrompt: `Você é um assistente virtual inteligente para WhatsApp.

SOBRE NÓS:
- Atendemos clientes de forma rápida e eficiente
- Horário: Segunda a sexta, 9h às 18h

COMO AJUDAR:
- Tire dúvidas sobre nossos produtos/serviços
- Ajude com agendamentos
- Encaminhe para um atendente humano quando necessário`,
    actionInstructions: [
      { id: '1', instruction: 'Sempre cumprimente o cliente pelo nome', type: 'do' },
      { id: '2', instruction: 'Nunca invente informações sobre preços', type: 'dont' },
    ],
    enableWebSearch: false,
    enabledTools: ['httpRequestTool', 'calculatorTool'],
    businessName: 'Meu Negócio',
  });

  const [editingBusinessName, setEditingBusinessName] = useState(false);

  const [newInstruction, setNewInstruction] = useState('');
  const [newInstructionType, setNewInstructionType] = useState<'do' | 'dont'>('do');
  const [syncingPrompt, setSyncingPrompt] = useState(false);
  const [customerProductId, setCustomerProductId] = useState<string | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  
  // Estados para credenciais de ferramentas
  const [toolCredentials, setToolCredentials] = useState<Record<string, string>>({});
  
  // Estado para configurações completas das ferramentas
  const [toolConfigs, setToolConfigs] = useState<Record<string, any>>({
    httpRequest: { enabled: true, httpMethod: 'GET', httpFollowRedirects: true },
    webhook: { enabled: false, webhookHttpMethod: 'POST', webhookResponseMode: 'onReceived', webhookResponseCode: 200 },
    code: { enabled: false, codeLanguage: 'javascript' },
    calculator: { enabled: true },
  });
  
  // Handler para atualizar configurações das ferramentas
  const updateToolConfig = (toolId: string, updates: Partial<any>) => {
    setToolConfigs(prev => ({
      ...prev,
      [toolId]: { ...prev[toolId], ...updates }
    }));
  };

  // Verificar acesso ao produto
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user && productId) {
      verifyAccessAndLoadConfig();
    }
  }, [user, authLoading, productId, navigate]);

  const verifyAccessAndLoadConfig = async () => {
    if (!productId || !user) return;

    try {
      // Verificar se o usuário tem acesso a este produto
      const { data: product, error: productError } = await supabase
        .from('customer_products')
        .select('*')
        .eq('id', productId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (productError || !product) {
        toast({
          title: "Acesso negado",
          description: "Você não tem acesso a este produto.",
          variant: "destructive"
        });
        navigate('/meus-produtos');
        return;
      }

      setCustomerProductId(productId);

      // Carregar configuração existente
      const { data: configData } = await supabase
        .from('ai_control_config')
        .select('*')
        .eq('customer_product_id', productId)
        .maybeSingle();

      if (configData) {
        let actionInstructions: ActionInstruction[] = [];
        
        if (configData.action_instructions) {
          try {
            const parsed = JSON.parse(configData.action_instructions);
            if (Array.isArray(parsed)) {
              actionInstructions = parsed;
            }
          } catch (e) {
            console.error('Error parsing action_instructions:', e);
          }
        }

        const provider = configData.ai_model?.includes('gpt') ? 'openai' : 
                        configData.ai_model?.includes('gemini') ? 'google' : 'starai';
        
        const savedTone = (configData.personality as CommunicationTone) || 'amigavel';
        const validTone = Object.keys(COMMUNICATION_TONES).includes(savedTone) ? savedTone : 'amigavel';

        setConfig(prev => ({
          ...prev,
          isActive: configData.is_active || false,
          n8nWorkflowId: product.n8n_workflow_id || '',
          provider,
          model: configData.ai_model || 'gpt-4o',
          temperature: configData.temperature || 0.7,
          maxTokens: configData.max_tokens || 2048,
          communicationTone: validTone,
          systemPrompt: configData.system_prompt || prev.systemPrompt,
          actionInstructions,
          sessionKeyId: configData.memory_session_id || '{{ $json.session_id }}',
          enabledTools: (configData.tools_enabled as string[]) || ['httpRequestTool', 'calculatorTool'],
          businessName: (configData as any).business_name || 'Meu Negócio',
        }));

        if (configData.ai_credentials) {
          const credentials = configData.ai_credentials as Record<string, string>;
          const apiKey = credentials.openai_api_key || credentials.google_api_key || '';
          if (apiKey) {
            setConfig(prev => ({ ...prev, apiKey }));
          }
          
          const toolCreds: Record<string, string> = {};
          Object.entries(credentials).forEach(([key, value]) => {
            if (key !== 'openai_api_key' && key !== 'google_api_key' && value) {
              toolCreds[key] = value;
            }
          });
          if (Object.keys(toolCreds).length > 0) {
            setToolCredentials(toolCreds);
          }
        }
      }

      setConfigLoaded(true);
      
      // Testar conexão n8n
      testN8nConnection();
      
    } catch (error) {
      console.error('Error loading config:', error);
      setConfigLoaded(true);
    }
  };

  // Salvar configuração no banco de dados
  const saveConfigToDatabase = async () => {
    if (!customerProductId) return false;

    try {
      const configToSave = {
        customer_product_id: customerProductId,
        is_active: config.isActive,
        ai_model: config.model,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        system_prompt: config.systemPrompt,
        personality: config.communicationTone,
        action_instructions: JSON.stringify(config.actionInstructions),
        memory_session_id: config.sessionKeyId,
        n8n_webhook_url: config.n8nWorkflowId ? `workflow-${config.n8nWorkflowId}` : null,
        tools_enabled: config.enabledTools,
        ai_credentials: {
          [config.provider === 'openai' ? 'openai_api_key' : 'google_api_key']: config.apiKey,
          ...toolCredentials,
        },
        configuration: {
          platform: 'whatsapp',
          configured_at: new Date().toISOString(),
        },
        business_name: config.businessName,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('ai_control_config')
        .upsert(configToSave, { onConflict: 'customer_product_id' });

      if (error) {
        console.error('Error saving config:', error);
        return false;
      }

      if (config.n8nWorkflowId) {
        await supabase
          .from('customer_products')
          .update({ n8n_workflow_id: config.n8nWorkflowId })
          .eq('id', customerProductId);
      }

      return true;
    } catch (error) {
      console.error('Error saving config to database:', error);
      return false;
    }
  };

  // Auto-save com debounce
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);
  const [autoSaving, setAutoSaving] = useState(false);

  const autoSave = useCallback(async () => {
    if (!configLoaded || !customerProductId) return;
    
    setAutoSaving(true);
    try {
      await saveConfigToDatabase();
    } catch (error) {
      console.error('Auto-save error:', error);
    } finally {
      setAutoSaving(false);
    }
  }, [configLoaded, customerProductId, config, toolCredentials]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!configLoaded) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSave();
    }, 1000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [config, toolCredentials, configLoaded]);

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
        loadWorkflows();
      }
    } catch (error: any) {
      setN8nConnected(false);
    } finally {
      setN8nTesting(false);
    }
  };

  const loadWorkflows = async () => {
    setLoadingWorkflows(true);
    try {
      const result = await n8nApiCall('list_workflows', { limit: 100 });
      if (result.success) {
        const isAdmin = user?.email === 'caduxim0@gmail.com';
        
        if (isAdmin) {
          // Admin vê todos os workflows
          setWorkflows(result.workflows);
        } else {
          // Cliente só vê o workflow que foi criado para ele
          // Buscar o n8n_workflow_id do customer_products
          const { data: customerProduct } = await supabase
            .from('customer_products')
            .select('n8n_workflow_id')
            .eq('id', productId)
            .single();
          
          const clientWorkflowId = customerProduct?.n8n_workflow_id;
          
          if (clientWorkflowId) {
            // Filtrar apenas o workflow do cliente
            const filteredWorkflows = result.workflows.filter(
              (w: N8nWorkflow) => w.id === clientWorkflowId
            );
            setWorkflows(filteredWorkflows);
            
            // Se o cliente tem um workflow, seleciona automaticamente
            if (filteredWorkflows.length > 0) {
              setConfig(prev => ({ ...prev, n8nWorkflowId: clientWorkflowId }));
            }
          } else {
            // Cliente não tem workflow ainda
            setWorkflows([]);
          }
        }
      }
    } catch (error: any) {
      console.error('Error loading workflows:', error);
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
          description: `Workflow está agora ativo.`,
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
          description: `Workflow foi desativado.`,
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

  const handleProviderChange = (provider: 'openai' | 'google' | 'starai') => {
    const defaultModel = provider === 'google' ? 'models/gemini-2.5-flash' : 'gpt-4o';
    setConfig(prev => ({
      ...prev,
      provider,
      model: defaultModel,
      apiKey: provider === 'starai' ? '' : prev.apiKey,
    }));
    
    if (provider === 'starai') {
      loadStaraiCredits();
    }
  };

  const loadStaraiCredits = async () => {
    setLoadingCredits(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `https://agndhravgmcwpdjkozka.supabase.co/functions/v1/starai-credits/balance`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();
      
      if (result.success && result.data) {
        setStaraiCredits({
          balanceBRL: Number(result.data.balance_brl) || 0,
          freeBalanceBRL: Number(result.data.free_balance_brl) || 0,
          depositedBRL: Number(result.data.deposited_brl) || 0,
        });
      }
    } catch (error: any) {
      console.error('Error loading StarAI credits:', error);
    } finally {
      setLoadingCredits(false);
    }
  };

  const handleStaraiDeposit = async () => {
    if (depositAmount < 10) {
      toast({
        title: "Valor inválido",
        description: "O valor mínimo de depósito é R$ 10,00",
        variant: "destructive",
      });
      return;
    }

    setProcessingDeposit(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `https://agndhravgmcwpdjkozka.supabase.co/functions/v1/starai-credits/deposit`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount_brl: depositAmount,
            success_url: `${window.location.origin}/sistema/bots-automacao/whatsapp/${productId}?payment=success`,
            failure_url: `${window.location.origin}/sistema/bots-automacao/whatsapp/${productId}?payment=failure`,
          }),
        }
      );

      const result = await response.json();
      
      if (result.success && result.data?.payment_link) {
        window.location.href = result.data.payment_link;
      } else {
        throw new Error(result.message || 'Erro ao criar pagamento');
      }
    } catch (error: any) {
      toast({
        title: "Erro ao criar pagamento",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setProcessingDeposit(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success') {
      toast({
        title: "Pagamento aprovado!",
        description: "Seus créditos StarAI foram adicionados à sua conta.",
      });
      window.history.replaceState({}, '', window.location.pathname);
      loadStaraiCredits();
    } else if (paymentStatus === 'failure') {
      toast({
        title: "Pagamento não aprovado",
        description: "O pagamento não foi concluído. Tente novamente.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (config.provider === 'starai') {
      loadStaraiCredits();
    }
  }, []);

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
          description: `Atualizado no workflow`,
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

  const syncLlmConfigToN8n = async () => {
    if (!config.n8nWorkflowId) {
      toast({
        title: "Workflow não selecionado",
        variant: "destructive",
      });
      return;
    }

    setSyncingLlm(true);
    try {
      const result = await n8nApiCall('update_llm_config', {
        workflowId: config.n8nWorkflowId,
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        provider: config.provider,
        apiKey: config.provider === 'starai' ? undefined : config.apiKey,
      });

      if (result.success) {
        toast({
          title: "Configuração do LLM sincronizada!",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao sincronizar LLM",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSyncingLlm(false);
    }
  };

  const syncMemoryToN8n = async () => {
    if (!config.n8nWorkflowId) return;
    
    setSyncingMemory(true);
    try {
      const result = await n8nApiCall('update_memory_config', {
        workflowId: config.n8nWorkflowId,
        sessionKeyId: config.sessionKeyId,
        contextWindowSize: config.contextWindowSize,
      });

      if (result.success) {
        toast({ title: "Configuração de memória sincronizada!" });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao sincronizar memória",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSyncingMemory(false);
    }
  };

  const syncToolsToN8n = async () => {
    if (!config.n8nWorkflowId) return;
    
    setSyncingTools(true);
    try {
      const result = await n8nApiCall('update_tools_config', {
        workflowId: config.n8nWorkflowId,
        toolConfigs,
        toolCredentials,
      });

      if (result.success) {
        toast({ title: "Ferramentas sincronizadas!" });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao sincronizar ferramentas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSyncingTools(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveConfigToDatabase();
      
      if (config.n8nWorkflowId) {
        await syncSystemPromptToN8n();
      }
      
      toast({
        title: "Configurações salvas!",
        description: "Todas as configurações foram sincronizadas.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !configLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/meus-produtos')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <MessageCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  {editingBusinessName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={config.businessName}
                        onChange={(e) => setConfig(prev => ({ ...prev, businessName: e.target.value }))}
                        className="h-8 text-xl font-bold w-48"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingBusinessName(false);
                          if (e.key === 'Escape') setEditingBusinessName(false);
                        }}
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => setEditingBusinessName(false)}
                      >
                        <Check className="h-4 w-4 text-green-500" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <h1 className="text-xl font-bold">{config.businessName}</h1>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setEditingBusinessName(true)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Bot WhatsApp • Configuração do Agente IA</span>
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
              {autoSaving && (
                <span className="text-xs text-muted-foreground animate-pulse">Salvando...</span>
              )}
              <Button onClick={handleSave} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Sincronizando...' : 'Sincronizar'}
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
              <BarChart3 className="h-4 w-4" />
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
                    Conexão com Motor de Automação
                  </CardTitle>
                  <CardDescription>
                    Status da integração com o motor de automação
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
                          Motor de Automação StarAI
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
                    Escolha o workflow do seu bot
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
                          {config.isActive ? 'O bot está ativo e respondendo' : 'O bot está desativado'}
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
                    <Label>Provedor</Label>
                    <Select value={config.provider} onValueChange={(v) => handleProviderChange(v as 'openai' | 'google' | 'starai')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="starai">
                          <div className="flex items-center gap-2">
                            <span className="text-amber-500">⭐</span>
                            StarAI (Recomendado)
                          </div>
                        </SelectItem>
                        <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                        <SelectItem value="google">Google (Gemini)</SelectItem>
                      </SelectContent>
                    </Select>
                    {config.provider === 'starai' && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        ⭐ Use nossa infraestrutura gerenciada sem precisar de API Key própria
                      </p>
                    )}
                  </div>

                  {/* Sistema de Créditos StarAI */}
                  {config.provider === 'starai' ? (
                    <div className="space-y-4">
                      {/* Header com Logo StarAI */}
                      <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-orange-500/10 to-amber-600/5">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-5">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500 rounded-full blur-3xl" />
                          <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500 rounded-full blur-3xl" />
                        </div>
                        
                        <div className="relative p-5">
                          {/* Logo e Título */}
                          <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                                  <Sparkles className="h-6 w-6 text-white" />
                                </div>
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                                  <Check className="h-2.5 w-2.5 text-white" />
                                </div>
                              </div>
                              <div>
                                <h3 className="font-bold text-lg bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                                  StarAI Credits
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                  Infraestrutura gerenciada
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={loadStaraiCredits}
                              disabled={loadingCredits}
                              className="h-8 w-8 hover:bg-amber-500/10"
                            >
                              <RefreshCw className={`h-4 w-4 ${loadingCredits ? 'animate-spin text-amber-500' : 'text-muted-foreground'}`} />
                            </Button>
                          </div>
                          
                          {loadingCredits ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="flex flex-col items-center gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                                <span className="text-sm text-muted-foreground">Carregando saldo...</span>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Cards de Saldo */}
                              <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="relative p-4 bg-background/80 backdrop-blur-sm rounded-xl border border-border/50 shadow-sm">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Wallet className="h-4 w-4 text-amber-500" />
                                    <span className="text-xs font-medium text-muted-foreground">Saldo Total</span>
                                  </div>
                                  <p className="text-2xl font-bold text-foreground">
                                    R$ {staraiCredits.balanceBRL.toFixed(2)}
                                  </p>
                                  <div className="absolute top-2 right-2 w-8 h-8 bg-amber-500/10 rounded-full flex items-center justify-center">
                                    <TrendingUp className="h-4 w-4 text-amber-500" />
                                  </div>
                                </div>
                                <div className="relative p-4 bg-background/80 backdrop-blur-sm rounded-xl border border-border/50 shadow-sm">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Gift className="h-4 w-4 text-green-500" />
                                    <span className="text-xs font-medium text-muted-foreground">Bônus Grátis</span>
                                  </div>
                                  <p className="text-2xl font-bold text-green-600">
                                    R$ {staraiCredits.freeBalanceBRL.toFixed(2)}
                                  </p>
                                  <div className="absolute top-2 right-2 w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center">
                                    <Zap className="h-4 w-4 text-green-500" />
                                  </div>
                                </div>
                              </div>

                              {/* Stats Row */}
                              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg mb-4">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <CreditCard className="h-4 w-4" />
                                  <span>Depositado: R$ {(staraiCredits as any).depositedBRL?.toFixed(2) || '0.00'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <BarChart3 className="h-4 w-4" />
                                  <span>Usado: R$ {(staraiCredits as any).totalUsedBRL?.toFixed(2) || '0.00'}</span>
                                </div>
                              </div>

                              {/* Bônus Welcome */}
                              {staraiCredits.balanceBRL === 0 && (
                                <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20 mb-4">
                                  <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                      <Gift className="h-5 w-5 text-green-500" />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-green-700 dark:text-green-400">
                                        🎁 R$ 75,00 por conta da casa!
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Equivalente a $15 USD para você começar sem gastar nada
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {/* Adicionar Créditos */}
                          <div className="space-y-3 pt-2 border-t border-border/50">
                            <div className="flex items-center justify-between">
                              <Label className="flex items-center gap-2 text-sm font-medium">
                                <Plus className="h-4 w-4 text-amber-500" />
                                Adicionar Créditos
                              </Label>
                              <span className="text-xs text-muted-foreground">Mín. R$ 10,00</span>
                            </div>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                                <Input
                                  type="number"
                                  value={depositAmount}
                                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                                  min={10}
                                  step={10}
                                  placeholder="50"
                                  className="pl-10"
                                  disabled={processingDeposit}
                                />
                              </div>
                              <Button 
                                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all"
                                onClick={handleStaraiDeposit}
                                disabled={processingDeposit || depositAmount < 10}
                              >
                                {processingDeposit ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <ArrowRight className="h-4 w-4 mr-2" />
                                )}
                                {processingDeposit ? 'Processando...' : 'Depositar'}
                              </Button>
                            </div>
                            
                            {/* Quick amounts */}
                            <div className="flex gap-2">
                              {[25, 50, 100, 200].map((amount) => (
                                <Button
                                  key={amount}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 text-xs hover:bg-amber-500/10 hover:border-amber-500/50"
                                  onClick={() => setDepositAmount(amount)}
                                >
                                  R$ {amount}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>API Key</Label>
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
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Select value={config.model} onValueChange={(v) => setConfig(prev => ({ ...prev, model: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um modelo" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[400px]">
                        {(config.provider === 'openai' || config.provider === 'starai') ? (
                          (['flagship', 'mini', 'reasoning'] as OpenAIModelCategory[]).map((category) => {
                            const modelsInCategory = OPENAI_MODELS.filter(m => m.category === category);
                            if (modelsInCategory.length === 0) return null;
                            return (
                              <SelectGroup key={category}>
                                <SelectLabel className="bg-muted/50 text-muted-foreground">
                                  {OPENAI_CATEGORY_LABELS[category]}
                                </SelectLabel>
                                {modelsInCategory.map((model) => (
                                  <SelectItem key={model.value} value={model.value}>
                                    {model.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            );
                          })
                        ) : (
                          (['chat', 'image'] as GoogleModelCategory[]).map((category) => {
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
                  </div>

                  <Button 
                    onClick={syncLlmConfigToN8n} 
                    disabled={syncingLlm || !config.n8nWorkflowId || (config.provider !== 'starai' && !config.apiKey)}
                    className="w-full gap-2"
                    variant="outline"
                  >
                    {syncingLlm ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {syncingLlm ? 'Sincronizando...' : 'Sincronizar com Workflow'}
                  </Button>
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
                    Memória PostgreSQL
                  </CardTitle>
                  <CardDescription>
                    Memória persistente usando PostgreSQL
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="font-semibold text-green-700 dark:text-green-400">Memória PostgreSQL Ativa</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      A memória persistente está configurada automaticamente.
                    </p>
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
                    {syncingMemory ? 'Configurando...' : 'Sincronizar Memória'}
                  </Button>
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
                      Variável usada para identificar sessões únicas
                    </p>
                  </div>

                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <p className="text-sm font-medium mb-2">Tabela de Histórico</p>
                    <code className="text-xs bg-background px-2 py-1 rounded block">
                      n8n_chat_histories
                    </code>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* PERSONALIDADE */}
          <TabsContent value="personality" className="space-y-6">
            {/* Tom de Comunicação */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  Tom de Comunicação
                </CardTitle>
                <CardDescription>
                  Escolha como seu bot vai se comunicar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {(Object.entries(COMMUNICATION_TONES) as [CommunicationTone, typeof COMMUNICATION_TONES[CommunicationTone]][]).map(([id, tone]) => (
                    <button
                      key={id}
                      onClick={() => setConfig(prev => ({ ...prev, communicationTone: id }))}
                      className={`relative overflow-hidden rounded-xl p-6 text-left transition-all hover:scale-[1.02] hover:shadow-lg border-2 ${
                        config.communicationTone === id 
                          ? 'border-primary ring-2 ring-primary/20' 
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${tone.color} opacity-10`} />
                      <div className="relative">
                        <span className="text-4xl mb-3 block">{tone.emoji}</span>
                        <h3 className="font-semibold text-lg">{tone.label}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{tone.desc}</p>
                        {config.communicationTone === id && (
                          <Badge className="absolute top-0 right-0 bg-primary">Ativo</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Instrução que será aplicada ao agente:</p>
                  <p className="text-sm italic">{COMMUNICATION_TONES[config.communicationTone].instruction}</p>
                </div>
              </CardContent>
            </Card>

            {/* Instruções Específicas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Instruções Específicas
                </CardTitle>
                <CardDescription>
                  Adicione instruções personalizadas para o seu bot
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={config.systemPrompt}
                  onChange={(e) => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                  className="min-h-[150px] text-sm"
                  placeholder="Ex: Você é o assistente da loja XYZ. Nossos horários são de 9h às 18h..."
                />
                
                <Button 
                  onClick={syncSystemPromptToN8n}
                  disabled={syncingPrompt || !config.n8nWorkflowId}
                  className="w-full gap-2"
                  variant="outline"
                >
                  {syncingPrompt ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {syncingPrompt ? 'Sincronizando...' : 'Sincronizar Prompt'}
                </Button>
              </CardContent>
            </Card>

            {/* Regras do Agente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Regras do Agente
                </CardTitle>
                <CardDescription>
                  O que o bot deve ou não fazer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Select value={newInstructionType} onValueChange={(v) => setNewInstructionType(v as 'do' | 'dont')}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="do">✅ Faça</SelectItem>
                      <SelectItem value="dont">❌ Não faça</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={newInstruction}
                    onChange={(e) => setNewInstruction(e.target.value)}
                    placeholder="Ex: Sempre cumprimente o cliente"
                    onKeyPress={(e) => e.key === 'Enter' && addInstruction()}
                    className="flex-1"
                  />
                  <Button onClick={addInstruction} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {config.actionInstructions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma regra configurada
                    </p>
                  ) : (
                    config.actionInstructions.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          item.type === 'do' 
                            ? 'bg-green-500/10 border border-green-500/20' 
                            : 'bg-red-500/10 border border-red-500/20'
                        }`}
                      >
                        <span className="flex items-center gap-2 text-sm">
                          {item.type === 'do' ? '✅' : '❌'} {item.instruction}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeInstruction(item.id)}
                          className="h-7 w-7"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FERRAMENTAS */}
          <TabsContent value="tools" className="space-y-6">
            <ToolsConfigSection
              toolConfigs={toolConfigs}
              onUpdateToolConfig={updateToolConfig}
              onSyncToN8n={syncToolsToN8n}
              syncing={syncingTools}
              workflowId={config.n8nWorkflowId}
            />
          </TabsContent>

          {/* MONITORAMENTO */}
          <TabsContent value="monitoring" className="space-y-6">
            {config.n8nWorkflowId ? (
              <TokenUsageStats workflowId={config.n8nWorkflowId} />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Monitoramento não disponível</h3>
                    <p className="text-sm text-muted-foreground">
                      Selecione um workflow na aba Status para ver as estatísticas de uso.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default WhatsAppBotConfigSystem;