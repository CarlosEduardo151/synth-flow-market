import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft, Save, Bot, Brain, Plug, Power, Pencil, Check,
  CheckCircle2, XCircle, Loader2, MessageCircle, Smartphone,
  BarChart3, Database
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { VerticalTabRail } from '@/components/layout/VerticalTabRail';
import { useIsMobile } from '@/hooks/use-mobile';
import { WhatsAppBotTestChat } from '@/components/WhatsAppBotTestChat';
import { useBotInstances } from '@/hooks/useBotInstances';
import { ToolsConfigSection } from '@/components/agent/ToolsConfigSection';
import { TokenUsageStats } from '@/components/agent/TokenUsageStats';

// Tab components
import { BotStatusTab } from '@/components/bots/tabs/BotStatusTab';
import { BotEngineTab } from '@/components/bots/tabs/BotEngineTab';
import { BotMemoryTab } from '@/components/bots/tabs/BotMemoryTab';
import { BotPersonalityTab, type CommunicationTone, type ActionInstruction } from '@/components/bots/tabs/BotPersonalityTab';
import { BotWhatsAppApiTab } from '@/components/bots/tabs/BotWhatsAppApiTab';

const supabase = supabaseClient as any;

interface AgentConfig {
  isActive: boolean;
  n8nWorkflowId: string;
  provider: 'openai' | 'google' | 'starai';
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  contextWindowSize: number;
  retentionPolicy: string;
  sessionKeyId: string;
  communicationTone: CommunicationTone;
  systemPrompt: string;
  actionInstructions: ActionInstruction[];
  enableWebSearch: boolean;
  enabledTools: string[];
  businessName: string;
}

const WhatsAppBotConfigSystem = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { productId } = useParams();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [loading, setLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'online' | 'offline' | 'loading' | 'unknown'>('unknown');
  const [togglingAgent, setTogglingAgent] = useState(false);
  const [syncingLlm, setSyncingLlm] = useState(false);
  const [syncingPrompt, setSyncingPrompt] = useState(false);
  const [syncingMemory, setSyncingMemory] = useState(false);
  const [syncingTools, setSyncingTools] = useState(false);

  const [n8nConnected, setN8nConnected] = useState<boolean | null>(null);
  const [n8nTesting, setN8nTesting] = useState(false);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loadingExecutions, setLoadingExecutions] = useState(false);

  const [staraiCredits, setStaraiCredits] = useState({ balanceBRL: 0, freeBalanceBRL: 0, depositedBRL: 0 });
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [depositAmount, setDepositAmount] = useState(50);
  const [processingDeposit, setProcessingDeposit] = useState(false);

  const [activeTab, setActiveTab] = useState<string>('status');
  const [railCollapsed, setRailCollapsed] = useState(true);
  const [editingBusinessName, setEditingBusinessName] = useState(false);
  const [customerProductId, setCustomerProductId] = useState<string | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [activeBotInstanceId, setActiveBotInstanceId] = useState<string | null>(null);

  const botInstances = useBotInstances(customerProductId);

  // WhatsApp API state
  const [wapiConnected, setWapiConnected] = useState(false);
  const [wapiInstanceId, setWapiInstanceId] = useState('');
  const [wapiToken, setWapiToken] = useState('');
  const [wapiPhone, setWapiPhone] = useState('');

  const [toolConfigs, setToolConfigs] = useState<Record<string, any>>({
    httpRequest: { enabled: true, httpMethod: 'GET', httpFollowRedirects: true },
    webhook: { enabled: false, webhookHttpMethod: 'POST', webhookResponseMode: 'onReceived', webhookResponseCode: 200 },
    code: { enabled: false, codeLanguage: 'javascript' },
    calculator: { enabled: true },
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
    systemPrompt: `Você é um assistente virtual inteligente para WhatsApp.\n\nSOBRE NÓS:\n- Atendemos clientes de forma rápida e eficiente\n- Horário: Segunda a sexta, 9h às 18h\n\nCOMO AJUDAR:\n- Tire dúvidas sobre nossos produtos/serviços\n- Ajude com agendamentos\n- Encaminhe para um atendente humano quando necessário`,
    actionInstructions: [
      { id: '1', instruction: 'Sempre cumprimente o cliente pelo nome', type: 'do' },
      { id: '2', instruction: 'Nunca invente informações sobre preços', type: 'dont' },
    ],
    enableWebSearch: false,
    enabledTools: ['httpRequestTool', 'calculatorTool'],
    businessName: 'Meu Negócio',
  });

  const sidebarItems = [
    { value: 'status', label: 'Status', icon: Power },
    { value: 'engine', label: 'Motor IA', icon: Brain },
    { value: 'memory', label: 'Memória', icon: Database },
    { value: 'personality', label: 'Personalidade', icon: Bot },
    { value: 'tools', label: 'Ferramentas', icon: Plug },
    { value: 'whatsapp-api', label: 'WhatsApp API', icon: Smartphone },
    { value: 'chat', label: 'Chat Teste', icon: MessageCircle },
    { value: 'monitoring', label: 'Monitoramento', icon: BarChart3 },
  ];

  // === EFFECTS ===

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user && productId) {
      verifyAccessAndLoadConfig();
    }
  }, [user, authLoading, productId]);

  // Auto-save
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  const autoSave = useCallback(async () => {
    if (!configLoaded || !customerProductId) return;
    setAutoSaving(true);
    try { await saveConfigToDatabase(); } catch {} finally { setAutoSaving(false); }
  }, [configLoaded, customerProductId, config, toolConfigs]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (!configLoaded) return;
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => autoSave(), 1000);
    return () => { if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current); };
  }, [config, toolConfigs, configLoaded]);

  useEffect(() => {
    if (n8nConnected) loadWorkflows();
  }, [n8nConnected]);

  useEffect(() => {
    if (config.n8nWorkflowId) {
      const wf = workflows.find((w: any) => w.id === config.n8nWorkflowId);
      if (wf) {
        setAgentStatus(wf.active ? 'online' : 'offline');
        setConfig(prev => ({ ...prev, isActive: wf.active }));
      }
    }
  }, [config.n8nWorkflowId, workflows]);

  useEffect(() => {
    if (config.provider === 'starai') loadStaraiCredits();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('payment');
    if (status === 'success') {
      toast({ title: "Pagamento aprovado!", description: "Créditos adicionados." });
      window.history.replaceState({}, '', window.location.pathname);
      loadStaraiCredits();
    } else if (status === 'failure') {
      toast({ title: "Pagamento não aprovado", description: "Tente novamente.", variant: "destructive" });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // === DATA FUNCTIONS ===

  const verifyAccessAndLoadConfig = async () => {
    if (!productId || !user) return;
    try {
      const { data: product, error } = await supabase
        .from('customer_products')
        .select('*')
        .eq('id', productId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error || !product) {
        toast({ title: "Acesso negado", description: "Você não tem acesso a este produto.", variant: "destructive" });
        navigate('/meus-produtos');
        return;
      }

      setCustomerProductId(productId);

      await botInstances.ensureDefault();
      const { data: instancesDb } = await supabase
        .from('bot_instances')
        .select('id, name, workflow_id, is_active, created_at')
        .eq('customer_product_id', productId)
        .order('created_at', { ascending: true });

      const activeInstance = (instancesDb || []).find((i: any) => i.is_active) ?? (instancesDb || [])[0] ?? null;
      setActiveBotInstanceId(activeInstance?.id ?? null);

      let { data: configData } = await supabase
        .from('ai_control_config')
        .select('*')
        .eq('customer_product_id', productId)
        .maybeSingle();

      // Auto-create engine config on first access — always active
      if (!configData) {
        const defaultConfig = {
          customer_product_id: productId,
          user_id: user.id,
          is_active: true,
          provider: 'google',
          model: 'models/gemini-2.5-flash',
          temperature: 0.7,
          max_tokens: 2048,
          system_prompt: config.systemPrompt,
          personality: 'amigavel',
          business_name: 'Meu Negócio',
          tools_enabled: ['httpRequestTool', 'calculatorTool'],
          configuration: { platform: 'whatsapp', configured_at: new Date().toISOString() },
        };
        const { data: created } = await supabase
          .from('ai_control_config')
          .upsert(defaultConfig, { onConflict: 'customer_product_id' })
          .select('*')
          .maybeSingle();
        configData = created;
        toast({ title: "Motor criado!", description: "Seu motor IA foi ativado automaticamente." });
      }

      // Ensure engine is always active
      if (configData && !configData.is_active) {
        await supabase
          .from('ai_control_config')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq('customer_product_id', productId);
        configData.is_active = true;
      }

      if (configData) {
        let actionInstructions: ActionInstruction[] = [];
        if (configData.action_instructions) {
          try { actionInstructions = JSON.parse(configData.action_instructions); } catch {}
        }

        const storedProvider = configData.provider || null;
        const storedModel = configData.model || null;
        const inferredProvider = storedProvider || (storedModel?.includes('gemini') ? 'google' : 'openai');
        const savedTone = configData.personality || 'amigavel';

        setConfig(prev => ({
          ...prev,
          isActive: true,
          provider: inferredProvider,
          model: storedModel || (inferredProvider === 'google' ? 'models/gemini-2.5-flash' : 'gpt-4o-mini'),
          temperature: configData.temperature || 0.7,
          maxTokens: configData.max_tokens || 2048,
          communicationTone: savedTone,
          systemPrompt: configData.system_prompt || prev.systemPrompt,
          actionInstructions: actionInstructions.length ? actionInstructions : prev.actionInstructions,
          sessionKeyId: configData.configuration?.memory_session_id || '{{ $json.session_id }}',
          enabledTools: configData.tools_enabled || ['httpRequestTool', 'calculatorTool'],
          businessName: configData.business_name || 'Meu Negócio',
        }));
      }

      if (activeInstance?.workflow_id) {
        setConfig(prev => ({ ...prev, n8nWorkflowId: activeInstance.workflow_id || '' }));
      }

      // Load API key
      try {
        const providerKey = configData?.provider === 'google' || String(configData?.model || '').includes('gemini')
          ? 'google_api_key' : 'openai_api_key';
        const { data: cred } = await supabase
          .from('product_credentials')
          .select('credential_value')
          .eq('user_id', user.id)
          .eq('product_slug', 'ai')
          .eq('credential_key', providerKey)
          .maybeSingle();

        if (cred?.credential_value) setConfig(prev => ({ ...prev, apiKey: cred.credential_value }));
      } catch {}

      // Load WhatsApp API credentials
      try {
        const { data: wapiCreds } = await supabase
          .from('product_credentials')
          .select('credential_key, credential_value')
          .eq('user_id', user.id)
          .eq('product_slug', 'bots-automacao')
          .in('credential_key', ['zapi_instance_id', 'zapi_token', 'zapi_phone']);

        if (wapiCreds && wapiCreds.length > 0) {
          for (const c of wapiCreds) {
            if (c.credential_key === 'zapi_instance_id') setWapiInstanceId(c.credential_value || '');
            if (c.credential_key === 'zapi_token') setWapiToken(c.credential_value || '');
            if (c.credential_key === 'zapi_phone') setWapiPhone(c.credential_value || '');
          }
          if (wapiCreds.length === 3 && wapiCreds.every((c: any) => c.credential_value)) {
            setWapiConnected(true);
          }
        }
      } catch {}

      setConfigLoaded(true);
      testN8nConnection();
    } catch (error) {
      console.error('Error loading config:', error);
      setConfigLoaded(true);
    }
  };

  const saveConfigToDatabase = async () => {
    if (!customerProductId || !user) return false;
    try {
      const engineProvider = config.provider === 'google' ? 'google' : 'openai';
      const engineModel = (config.model || '').trim() || (engineProvider === 'google' ? 'models/gemini-2.5-flash' : 'gpt-4o-mini');

      await supabase.from('ai_control_config').upsert({
        customer_product_id: customerProductId,
        user_id: user.id,
        is_active: true,
        provider: engineProvider,
        model: engineModel,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        system_prompt: config.systemPrompt,
        personality: config.communicationTone,
        action_instructions: JSON.stringify(config.actionInstructions),
        tools_enabled: config.enabledTools,
        configuration: {
          platform: 'whatsapp',
          configured_at: new Date().toISOString(),
          memory_session_id: config.sessionKeyId,
          retention_policy: config.retentionPolicy,
          context_window_size: config.contextWindowSize,
          enable_web_search: config.enableWebSearch,
          tool_configs: toolConfigs,
        },
        business_name: config.businessName,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'customer_product_id' });

      if (config.apiKey) {
        const credentialKey = engineProvider === 'google' ? 'google_api_key' : 'openai_api_key';
        const { data: existing } = await supabase
          .from('product_credentials')
          .select('id')
          .eq('user_id', user.id)
          .eq('product_slug', 'ai')
          .eq('credential_key', credentialKey)
          .maybeSingle();

        if (existing?.id) {
          await supabase.from('product_credentials').update({ credential_value: config.apiKey, updated_at: new Date().toISOString() }).eq('id', existing.id);
        } else {
          await supabase.from('product_credentials').insert({ user_id: user.id, product_slug: 'ai', credential_key: credentialKey, credential_value: config.apiKey });
        }
      }
      return true;
    } catch { return false; }
  };

  const testN8nConnection = async () => {
    setN8nTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('n8n-api', { body: { action: 'test_connection' } });
      if (error) throw error;
      setN8nConnected(Boolean(data?.success));
    } catch { setN8nConnected(false); } finally { setN8nTesting(false); }
  };

  const loadWorkflows = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('n8n-api', { body: { action: 'list_workflows', limit: 200 } });
      if (error) throw error;
      setWorkflows((data?.workflows || []).map((wf: any) => ({
        id: String(wf.id), name: String(wf.name || `Workflow ${wf.id}`), active: Boolean(wf.active),
        createdAt: String(wf.createdAt || new Date().toISOString()), updatedAt: String(wf.updatedAt || new Date().toISOString()),
      })));
    } catch {}
  };

  const toggleWorkflowStatus = async () => {
    setTogglingAgent(true);
    try {
      if (!config.n8nWorkflowId) return;
      const action = config.isActive ? 'deactivate_workflow' : 'activate_workflow';
      await supabase.functions.invoke('n8n-api', { body: { action, workflowId: config.n8nWorkflowId } });
      setAgentStatus(config.isActive ? 'offline' : 'online');
      setConfig(prev => ({ ...prev, isActive: !prev.isActive }));
      await saveConfigToDatabase();
    } finally { setTogglingAgent(false); }
  };

  const loadExecutions = async () => {
    if (!config.n8nWorkflowId) return;
    setLoadingExecutions(true);
    try {
      await supabase.functions.invoke('n8n-api', { body: { action: 'get_executions', workflowId: config.n8nWorkflowId, limit: 20 } });
    } catch {} finally { setLoadingExecutions(false); }
  };

  const handleProviderChange = (provider: 'openai' | 'google' | 'starai') => {
    const defaultModel = provider === 'google' ? 'models/gemini-2.5-flash' : 'gpt-4o';
    setConfig(prev => ({ ...prev, provider, model: defaultModel, apiKey: provider === 'starai' ? '' : prev.apiKey }));
    if (provider === 'starai') loadStaraiCredits();
  };

  const loadStaraiCredits = async () => {
    setLoadingCredits(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`https://agndhravgmcwpdjkozka.supabase.co/functions/v1/starai-credits/balance`, {
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (result.success && result.data) {
        setStaraiCredits({ balanceBRL: Number(result.data.balance_brl) || 0, freeBalanceBRL: Number(result.data.free_balance_brl) || 0, depositedBRL: Number(result.data.deposited_brl) || 0 });
      }
    } catch {} finally { setLoadingCredits(false); }
  };

  const handleStaraiDeposit = async () => {
    if (depositAmount < 10) { toast({ title: "Valor inválido", description: "Mínimo R$ 10,00", variant: "destructive" }); return; }
    setProcessingDeposit(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`https://agndhravgmcwpdjkozka.supabase.co/functions/v1/starai-credits/deposit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_brl: depositAmount, success_url: `${window.location.origin}/sistema/bots-automacao/whatsapp/${productId}?payment=success`, failure_url: `${window.location.origin}/sistema/bots-automacao/whatsapp/${productId}?payment=failure` }),
      });
      const result = await res.json();
      if (result.success && result.data?.payment_link) window.location.href = result.data.payment_link;
      else throw new Error(result.message || 'Erro');
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setProcessingDeposit(false); }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveConfigToDatabase();
      toast({ title: "Salvo!", description: "Configurações sincronizadas." });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  // === RENDER ===

  if (authLoading || !configLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-primary/30 animate-spin border-t-primary" />
            <Bot className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/meus-produtos')} className="rounded-xl">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                {editingBusinessName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={config.businessName}
                      onChange={(e) => setConfig(prev => ({ ...prev, businessName: e.target.value }))}
                      className="h-8 text-lg font-bold w-44"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingBusinessName(false); }}
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingBusinessName(false)}>
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setEditingBusinessName(true)}>
                    <h1 className="text-lg font-bold">{config.businessName}</h1>
                    <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Bot WhatsApp</span>
                  {n8nConnected === true && (
                    <Badge variant="outline" className="text-green-500 border-green-500/30 text-[10px] px-1.5 py-0">
                      <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                      Conectado
                    </Badge>
                  )}
                  {n8nConnected === false && (
                    <Badge variant="outline" className="text-destructive border-destructive/30 text-[10px] px-1.5 py-0">
                      <XCircle className="h-2.5 w-2.5 mr-0.5" />
                      Offline
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Status indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/50 border border-border/50">
                <div className={`w-2 h-2 rounded-full ${
                  agentStatus === 'online' ? 'bg-green-500 animate-pulse' :
                  agentStatus === 'offline' ? 'bg-destructive' :
                  agentStatus === 'loading' ? 'bg-amber-500 animate-pulse' : 'bg-muted-foreground'
                }`} />
                <span className="text-xs font-medium">
                  {agentStatus === 'online' ? 'Online' :
                   agentStatus === 'offline' ? 'Offline' :
                   agentStatus === 'loading' ? 'Carregando...' : '—'}
                </span>
              </div>

              {autoSaving && <span className="text-xs text-muted-foreground animate-pulse">Salvando...</span>}

              <Button onClick={handleSave} disabled={loading} size="sm" className="rounded-xl">
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex w-full min-h-[65vh] gap-4 rounded-2xl border border-border/30 bg-card/20 backdrop-blur shadow-lg">
            {/* Sidebar */}
            <div className="p-2 md:py-4 md:pl-4">
              <div className="md:sticky md:top-1/2 md:-translate-y-1/2">
                <VerticalTabRail
                  items={sidebarItems}
                  activeValue={activeTab}
                  onChange={setActiveTab}
                  collapsed={isMobile ? false : railCollapsed}
                  onCollapsedChange={setRailCollapsed}
                />
              </div>
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="p-4 md:p-6">
                <TabsContent value="status">
                  <BotStatusTab
                    n8nConnected={n8nConnected}
                    n8nTesting={n8nTesting}
                    workflowsCount={workflows.length}
                    isActive={config.isActive}
                    hasWorkflow={Boolean(config.n8nWorkflowId)}
                    togglingAgent={togglingAgent}
                    onTestConnection={testN8nConnection}
                    onToggleAgent={toggleWorkflowStatus}
                    onRefreshExecutions={loadExecutions}
                    loadingExecutions={loadingExecutions}
                  />
                </TabsContent>

                <TabsContent value="engine">
                  <BotEngineTab
                    provider={config.provider}
                    apiKey={config.apiKey}
                    model={config.model}
                    temperature={config.temperature}
                    maxTokens={config.maxTokens}
                    workflowId={config.n8nWorkflowId}
                    staraiCredits={staraiCredits}
                    loadingCredits={loadingCredits}
                    depositAmount={depositAmount}
                    processingDeposit={processingDeposit}
                    syncingLlm={syncingLlm}
                    onProviderChange={handleProviderChange}
                    onApiKeyChange={(key) => setConfig(prev => ({ ...prev, apiKey: key }))}
                    onModelChange={(model) => setConfig(prev => ({ ...prev, model }))}
                    onTemperatureChange={(temp) => setConfig(prev => ({ ...prev, temperature: temp }))}
                    onMaxTokensChange={(tokens) => setConfig(prev => ({ ...prev, maxTokens: tokens }))}
                    onDepositAmountChange={setDepositAmount}
                    onDeposit={handleStaraiDeposit}
                    onSyncLlm={async () => { setSyncingLlm(true); toast({ title: "IA configurada" }); setSyncingLlm(false); }}
                  />
                </TabsContent>

                <TabsContent value="memory">
                  <BotMemoryTab
                    contextWindowSize={config.contextWindowSize}
                    retentionPolicy={config.retentionPolicy}
                    sessionKeyId={config.sessionKeyId}
                    workflowId={config.n8nWorkflowId}
                    syncingMemory={syncingMemory}
                    onContextWindowChange={(size) => setConfig(prev => ({ ...prev, contextWindowSize: size }))}
                    onRetentionChange={(p) => setConfig(prev => ({ ...prev, retentionPolicy: p }))}
                    onSessionKeyChange={(k) => setConfig(prev => ({ ...prev, sessionKeyId: k }))}
                    onSyncMemory={async () => { setSyncingMemory(true); toast({ title: "Memória configurada" }); setSyncingMemory(false); }}
                  />
                </TabsContent>

                <TabsContent value="personality">
                  <BotPersonalityTab
                    communicationTone={config.communicationTone}
                    systemPrompt={config.systemPrompt}
                    actionInstructions={config.actionInstructions}
                    workflowId={config.n8nWorkflowId}
                    syncingPrompt={syncingPrompt}
                    onToneChange={(tone) => setConfig(prev => ({ ...prev, communicationTone: tone }))}
                    onSystemPromptChange={(prompt) => setConfig(prev => ({ ...prev, systemPrompt: prompt }))}
                    onAddInstruction={(instruction, type) => setConfig(prev => ({
                      ...prev,
                      actionInstructions: [...prev.actionInstructions, { id: Date.now().toString(), instruction, type }],
                    }))}
                    onRemoveInstruction={(id) => setConfig(prev => ({
                      ...prev,
                      actionInstructions: prev.actionInstructions.filter(i => i.id !== id),
                    }))}
                    onSyncPrompt={async () => { setSyncingPrompt(true); toast({ title: "Prompt sincronizado" }); setSyncingPrompt(false); }}
                  />
                </TabsContent>

                <TabsContent value="tools">
                  <ToolsConfigSection
                    toolConfigs={toolConfigs}
                    onUpdateToolConfig={(toolId, updates) => setToolConfigs(prev => ({ ...prev, [toolId]: { ...prev[toolId], ...updates } }))}
                    onSyncToN8n={async () => { setSyncingTools(true); toast({ title: "Ferramentas prontas" }); setSyncingTools(false); }}
                    syncing={syncingTools}
                    workflowId={config.n8nWorkflowId}
                  />
                </TabsContent>

                <TabsContent value="whatsapp-api">
                  {productId && (
                    <BotWhatsAppApiTab
                      customerProductId={productId}
                      isConnected={wapiConnected}
                      instanceId={wapiInstanceId}
                      token={wapiToken}
                      phoneNumber={wapiPhone}
                      onInstanceIdChange={setWapiInstanceId}
                      onTokenChange={setWapiToken}
                      onPhoneNumberChange={setWapiPhone}
                      onConnectionChange={setWapiConnected}
                    />
                  )}
                </TabsContent>

                <TabsContent value="chat">
                  {productId ? (
                    <WhatsAppBotTestChat customerProductId={productId} businessName={config.businessName} />
                  ) : null}
                </TabsContent>

                <TabsContent value="monitoring">
                  {config.n8nWorkflowId ? (
                    <TokenUsageStats workflowId={config.n8nWorkflowId} />
                  ) : (
                    <Card className="border-border/50">
                      <CardContent className="pt-6">
                        <div className="text-center py-12">
                          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-lg font-medium mb-2">Monitoramento indisponível</h3>
                          <p className="text-sm text-muted-foreground">
                            Selecione um workflow na aba Status para ver estatísticas.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </div>
            </div>
          </div>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default WhatsAppBotConfigSystem;
