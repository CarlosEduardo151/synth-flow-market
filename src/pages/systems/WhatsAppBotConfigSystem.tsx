import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft, Save, Bot, Brain, Plug, Pencil, Check,
  Loader2, MessageCircle, Smartphone, Database
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

// Tab components
import { BotStatusTab } from '@/components/bots/tabs/BotStatusTab';
import { BotEngineTab } from '@/components/bots/tabs/BotEngineTab';
import { BotMemoryTab } from '@/components/bots/tabs/BotMemoryTab';
import { BotPersonalityTab, type CommunicationTone, type ActionInstruction } from '@/components/bots/tabs/BotPersonalityTab';
import { BotWhatsAppApiTab } from '@/components/bots/tabs/BotWhatsAppApiTab';

const supabase = supabaseClient as any;

interface AgentConfig {
  provider: 'openai' | 'google' | 'novalink';
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  contextWindowSize: number;
  retentionPolicy: string;
  communicationTone: CommunicationTone;
  systemPrompt: string;
  actionInstructions: ActionInstruction[];
  businessName: string;
}

const DEFAULT_SYSTEM_PROMPT = `Você é um assistente virtual inteligente para WhatsApp.\n\nSOBRE NÓS:\n- Atendemos clientes de forma rápida e eficiente\n- Horário: Segunda a sexta, 9h às 18h\n\nCOMO AJUDAR:\n- Tire dúvidas sobre nossos produtos/serviços\n- Ajude com agendamentos\n- Encaminhe para um atendente humano quando necessário`;

const WhatsAppBotConfigSystem = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { productId } = useParams();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('status');
  const [railCollapsed, setRailCollapsed] = useState(true);
  const [customerProductId, setCustomerProductId] = useState<string | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [editingBusinessName, setEditingBusinessName] = useState(false);

  const botInstances = useBotInstances(customerProductId);

  // WhatsApp API state
  const [wapiConnected, setWapiConnected] = useState(false);
  const [wapiInstanceId, setWapiInstanceId] = useState('');
  const [wapiToken, setWapiToken] = useState('');
  const [wapiPhone, setWapiPhone] = useState('');

  const [config, setConfig] = useState<AgentConfig>({
    provider: 'google',
    apiKey: '',
    model: 'models/gemini-2.5-flash',
    temperature: 0.7,
    maxTokens: 2048,
    contextWindowSize: 10,
    retentionPolicy: '30days',
    communicationTone: 'amigavel',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    actionInstructions: [
      { id: '1', instruction: 'Sempre cumprimente o cliente pelo nome', type: 'do' },
      { id: '2', instruction: 'Nunca invente informações sobre preços', type: 'dont' },
    ],
    businessName: 'Meu Negócio',
  });

  const sidebarItems = [
    { value: 'status', label: 'Status', icon: Bot },
    { value: 'engine', label: 'Motor IA', icon: Brain },
    { value: 'memory', label: 'Memória', icon: Database },
    { value: 'personality', label: 'Personalidade', icon: Bot },
    { value: 'whatsapp-api', label: 'WhatsApp API', icon: Smartphone },
    { value: 'chat', label: 'Chat Teste', icon: MessageCircle },
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
  }, [configLoaded, customerProductId, config]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (!configLoaded) return;
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => autoSave(), 1500);
    return () => { if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current); };
  }, [config, configLoaded]);

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

      // Load or auto-create AI config
      let { data: configData } = await supabase
        .from('ai_control_config')
        .select('*')
        .eq('customer_product_id', productId)
        .maybeSingle();

      if (!configData) {
        const defaultConfig = {
          customer_product_id: productId,
          user_id: user.id,
          is_active: true,
          provider: 'google',
          model: 'models/gemini-2.5-flash',
          temperature: 0.7,
          max_tokens: 2048,
          system_prompt: DEFAULT_SYSTEM_PROMPT,
          personality: 'amigavel',
          business_name: 'Meu Negócio',
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

      // Ensure always active
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

      const storedProvider = configData.provider || 'google';
        const inferredProvider = storedProvider === 'novalink' ? 'novalink' : storedProvider === 'google' ? 'google' : 'openai';

        setConfig(prev => ({
          ...prev,
          provider: inferredProvider,
          model: configData.model || (inferredProvider === 'google' ? 'models/gemini-2.5-flash' : 'gpt-4o-mini'),
          temperature: configData.temperature || 0.7,
          maxTokens: configData.max_tokens || 2048,
          communicationTone: configData.personality || 'amigavel',
          systemPrompt: configData.system_prompt || prev.systemPrompt,
          actionInstructions: actionInstructions.length ? actionInstructions : prev.actionInstructions,
          contextWindowSize: configData.configuration?.context_window_size || 10,
          retentionPolicy: configData.configuration?.retention_policy || '30days',
          businessName: configData.business_name || 'Meu Negócio',
        }));
      }

      // Load API key
      try {
        const providerKey = configData?.provider === 'google' ? 'google_api_key' : 'openai_api_key';
        const { data: cred } = await supabase
          .from('product_credentials')
          .select('credential_value')
          .eq('user_id', user.id)
          .eq('product_slug', 'ai')
          .eq('credential_key', providerKey)
          .maybeSingle();

        if (!cred?.credential_value) {
          // Fallback: try bots-automacao slug
          const { data: cred2 } = await supabase
            .from('product_credentials')
            .select('credential_value')
            .eq('user_id', user.id)
            .eq('product_slug', 'bots-automacao')
            .eq('credential_key', providerKey)
            .maybeSingle();
          if (cred2?.credential_value) setConfig(prev => ({ ...prev, apiKey: cred2.credential_value }));
        } else {
          setConfig(prev => ({ ...prev, apiKey: cred.credential_value }));
        }
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
          if (wapiCreds.length >= 2 && wapiCreds.filter((c: any) => c.credential_value).length >= 2) {
            setWapiConnected(true);
          }
        }
      } catch {}

      setConfigLoaded(true);
    } catch (error) {
      console.error('Error loading config:', error);
      setConfigLoaded(true);
    }
  };

  const saveConfigToDatabase = async () => {
    if (!customerProductId || !user) return false;
    try {
      const engineProvider = config.provider === 'novalink' ? 'novalink' : config.provider === 'google' ? 'google' : 'openai';
      const engineModel = (config.model || '').trim() || (engineProvider === 'google' || engineProvider === 'novalink' ? 'models/gemini-2.5-flash' : 'gpt-4o-mini');

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
        configuration: {
          platform: 'whatsapp',
          configured_at: new Date().toISOString(),
          retention_policy: config.retentionPolicy,
          context_window_size: config.contextWindowSize,
        },
        business_name: config.businessName,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'customer_product_id' });

      // Save API key (skip for novalink — uses admin keys)
      if (config.apiKey && engineProvider !== 'novalink') {
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

  const handleProviderChange = (provider: 'openai' | 'google' | 'novalink') => {
    const defaultModel = provider === 'novalink' ? 'models/gemini-2.5-flash' : provider === 'google' ? 'models/gemini-2.5-flash' : 'gpt-4o';
    setConfig(prev => ({ ...prev, provider, model: defaultModel, ...(provider === 'novalink' ? { apiKey: '' } : {}) }));
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
                  <Badge variant="outline" className="text-green-500 border-green-500/30 text-[10px] px-1.5 py-0">
                    Motor Ativo
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/50 border border-border/50">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium">Online</span>
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
                  <BotStatusTab />
                </TabsContent>

                <TabsContent value="engine">
                  <BotEngineTab
                    provider={config.provider}
                    apiKey={config.apiKey}
                    model={config.model}
                    temperature={config.temperature}
                    maxTokens={config.maxTokens}
                    onProviderChange={handleProviderChange}
                    onApiKeyChange={(key) => setConfig(prev => ({ ...prev, apiKey: key }))}
                    onModelChange={(model) => setConfig(prev => ({ ...prev, model }))}
                    onTemperatureChange={(temp) => setConfig(prev => ({ ...prev, temperature: temp }))}
                    onMaxTokensChange={(tokens) => setConfig(prev => ({ ...prev, maxTokens: tokens }))}
                  />
                </TabsContent>

                <TabsContent value="memory">
                  <BotMemoryTab
                    contextWindowSize={config.contextWindowSize}
                    retentionPolicy={config.retentionPolicy}
                    onContextWindowChange={(size) => setConfig(prev => ({ ...prev, contextWindowSize: size }))}
                    onRetentionChange={(p) => setConfig(prev => ({ ...prev, retentionPolicy: p }))}
                  />
                </TabsContent>

                <TabsContent value="personality">
                  <BotPersonalityTab
                    communicationTone={config.communicationTone}
                    systemPrompt={config.systemPrompt}
                    actionInstructions={config.actionInstructions}
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
