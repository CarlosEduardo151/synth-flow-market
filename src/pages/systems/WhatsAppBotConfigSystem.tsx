import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { 
  ArrowLeft, Save, Bot, Brain, Plug, Database,
  Plus, Trash2, BarChart3, MessageCircle, Power
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
import { useToast } from '@/hooks/use-toast';

interface ActionInstruction {
  id: string;
  instruction: string;
  type: 'do' | 'dont';
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
    emoji: '🔧',
    label: 'Técnico',
    desc: 'Preciso e detalhado',
    color: 'from-blue-500 to-cyan-500',
    instruction: 'Use terminologia técnica apropriada. Seja preciso e detalhado. Ofereça explicações completas quando necessário.'
  },
  entusiasmado: {
    emoji: '🎉',
    label: 'Entusiasmado',
    desc: 'Energético e motivador',
    color: 'from-pink-500 to-rose-500',
    instruction: 'Seja energético e motivador. Use exclamações e linguagem positiva. Celebre as conquistas do usuário.'
  },
  empatico: {
    emoji: '💙',
    label: 'Empático',
    desc: 'Compreensivo e atencioso',
    color: 'from-purple-500 to-violet-500',
    instruction: 'Demonstre compreensão e empatia. Valide os sentimentos do usuário. Seja atencioso e paciente.'
  },
  direto: {
    emoji: '⚡',
    label: 'Direto',
    desc: 'Objetivo e conciso',
    color: 'from-green-500 to-emerald-500',
    instruction: 'Seja direto ao ponto. Evite rodeios. Dê respostas concisas e acionáveis.'
  }
};

const AI_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', provider: 'openai' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'openai' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'google' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', provider: 'google' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', provider: 'google' },
  { value: 'starai-agent', label: 'StarAI Agent (Recomendado)', provider: 'starai' },
];

const WhatsAppBotConfigSystem = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { productId } = useParams();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  const [config, setConfig] = useState<AgentConfig>({
    isActive: false,
    n8nWorkflowId: '',
    provider: 'starai',
    apiKey: '',
    model: 'starai-agent',
    temperature: 0.7,
    maxTokens: 2048,
    contextWindowSize: 10,
    retentionPolicy: '30days',
    sessionKeyId: '',
    communicationTone: 'amigavel',
    systemPrompt: 'Você é um assistente virtual inteligente para WhatsApp. Ajude os clientes de forma eficiente e amigável.',
    actionInstructions: [],
    enableWebSearch: false,
    enabledTools: []
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (user && productId) {
      loadConfig();
    }
  }, [user, loading, productId, navigate]);

  const loadConfig = async () => {
    if (!productId) return;

    try {
      // Verify access
      const { data: product, error: productError } = await supabase
        .from('customer_products')
        .select('*')
        .eq('id', productId)
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .single();

      if (productError || !product) {
        navigate('/meus-produtos');
        return;
      }

      // Load config
      const { data: configData } = await supabase
        .from('ai_control_config')
        .select('*')
        .eq('customer_product_id', productId)
        .single();

      if (configData) {
        const savedConfig = configData.configuration as any;
        setConfig(prev => ({
          ...prev,
          isActive: configData.is_active || false,
          n8nWorkflowId: configData.n8n_webhook_url || '',
          provider: savedConfig?.provider || 'starai',
          apiKey: savedConfig?.apiKey || '',
          model: configData.ai_model || 'starai-agent',
          temperature: configData.temperature || 0.7,
          maxTokens: configData.max_tokens || 2048,
          contextWindowSize: savedConfig?.contextWindowSize || 10,
          retentionPolicy: savedConfig?.retentionPolicy || '30days',
          sessionKeyId: configData.memory_session_id || '',
          communicationTone: savedConfig?.communicationTone || 'amigavel',
          systemPrompt: configData.system_prompt || config.systemPrompt,
          actionInstructions: savedConfig?.actionInstructions || [],
          enableWebSearch: savedConfig?.enableWebSearch || false,
          enabledTools: (configData.tools_enabled as string[]) || []
        }));
      }

      setConfigLoaded(true);
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!productId) return;

    try {
      const configPayload = {
        customer_product_id: productId,
        is_active: config.isActive,
        n8n_webhook_url: config.n8nWorkflowId,
        ai_model: config.model,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        system_prompt: config.systemPrompt,
        memory_session_id: config.sessionKeyId,
        tools_enabled: config.enabledTools,
        configuration: JSON.parse(JSON.stringify({
          platform: 'whatsapp',
          configured_at: new Date().toISOString(),
          provider: config.provider,
          apiKey: config.apiKey,
          contextWindowSize: config.contextWindowSize,
          retentionPolicy: config.retentionPolicy,
          communicationTone: config.communicationTone,
          actionInstructions: config.actionInstructions,
          enableWebSearch: config.enableWebSearch
        }))
      };

      // First check if config exists
      const { data: existing } = await supabase
        .from('ai_control_config')
        .select('id')
        .eq('customer_product_id', productId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('ai_control_config')
          .update(configPayload)
          .eq('customer_product_id', productId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ai_control_config')
          .insert([configPayload]);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error saving config:', error);
      throw error;
    }
  };

  // Auto-save
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!configLoaded) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      setAutoSaving(true);
      try {
        await saveConfig();
      } catch (error) {
        console.error('Auto-save error:', error);
      } finally {
        setAutoSaving(false);
      }
    }, 1000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [config, configLoaded]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await saveConfig();
      toast({
        title: "Sincronizado!",
        description: "Configurações salvas e sincronizadas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao sincronizar configurações.",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const addInstruction = (type: 'do' | 'dont') => {
    const newInstruction: ActionInstruction = {
      id: crypto.randomUUID(),
      instruction: '',
      type
    };
    setConfig(prev => ({
      ...prev,
      actionInstructions: [...prev.actionInstructions, newInstruction]
    }));
  };

  const updateInstruction = (id: string, instruction: string) => {
    setConfig(prev => ({
      ...prev,
      actionInstructions: prev.actionInstructions.map(i => 
        i.id === id ? { ...i, instruction } : i
      )
    }));
  };

  const removeInstruction = (id: string) => {
    setConfig(prev => ({
      ...prev,
      actionInstructions: prev.actionInstructions.filter(i => i.id !== id)
    }));
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/sistema/bots-automacao')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <MessageCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Bot WhatsApp</h1>
                <p className="text-sm text-muted-foreground">Configure seu agente de IA para WhatsApp</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${config.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-sm text-muted-foreground">
                {config.isActive ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            {autoSaving && (
              <span className="text-xs text-muted-foreground animate-pulse">Salvando...</span>
            )}
            <Button onClick={handleSync} disabled={syncing}>
              <Save className="h-4 w-4 mr-2" />
              {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="agent" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="agent" className="gap-2">
              <Bot className="h-4 w-4" />
              Agente
            </TabsTrigger>
            <TabsTrigger value="personality" className="gap-2">
              <Brain className="h-4 w-4" />
              Personalidade
            </TabsTrigger>
            <TabsTrigger value="tools" className="gap-2">
              <Plug className="h-4 w-4" />
              Ferramentas
            </TabsTrigger>
            <TabsTrigger value="memory" className="gap-2">
              <Database className="h-4 w-4" />
              Memória
            </TabsTrigger>
          </TabsList>

          {/* Agent Tab */}
          <TabsContent value="agent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Power className="h-5 w-5" />
                  Status do Agente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Ativar Agente</Label>
                    <p className="text-sm text-muted-foreground">
                      Quando ativo, o bot responderá automaticamente às mensagens
                    </p>
                  </div>
                  <Switch
                    checked={config.isActive}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, isActive: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Modelo de IA</CardTitle>
                <CardDescription>Escolha o modelo que alimentará seu bot</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Provedor</Label>
                  <Select
                    value={config.provider}
                    onValueChange={(value: 'openai' | 'google' | 'starai') => 
                      setConfig(prev => ({ ...prev, provider: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starai">StarAI (Recomendado)</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <Select
                    value={config.model}
                    onValueChange={(value) => setConfig(prev => ({ ...prev, model: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODELS.filter(m => m.provider === config.provider).map(model => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {config.provider !== 'starai' && (
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      placeholder="Sua chave de API"
                      value={config.apiKey}
                      onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Temperatura: {config.temperature}</Label>
                  </div>
                  <Slider
                    value={[config.temperature]}
                    min={0}
                    max={1}
                    step={0.1}
                    onValueChange={([value]) => setConfig(prev => ({ ...prev, temperature: value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Controla a criatividade das respostas (0 = mais focado, 1 = mais criativo)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Máximo de Tokens</Label>
                  <Input
                    type="number"
                    value={config.maxTokens}
                    onChange={(e) => setConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 2048 }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Webhook URL</CardTitle>
                <CardDescription>URL do seu sistema de automação</CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="https://seu-webhook.com/..."
                  value={config.n8nWorkflowId}
                  onChange={(e) => setConfig(prev => ({ ...prev, n8nWorkflowId: e.target.value }))}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Personality Tab */}
          <TabsContent value="personality" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tom de Comunicação</CardTitle>
                <CardDescription>Como o bot deve se comunicar com os clientes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(COMMUNICATION_TONES).map(([key, tone]) => (
                    <Card
                      key={key}
                      className={`cursor-pointer transition-all ${
                        config.communicationTone === key 
                          ? 'ring-2 ring-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setConfig(prev => ({ ...prev, communicationTone: key as CommunicationTone }))}
                    >
                      <CardContent className="p-4 text-center">
                        <span className="text-2xl">{tone.emoji}</span>
                        <p className="font-medium mt-1">{tone.label}</p>
                        <p className="text-xs text-muted-foreground">{tone.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prompt do Sistema</CardTitle>
                <CardDescription>Instrução principal que define o comportamento do bot</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={6}
                  placeholder="Você é um assistente virtual..."
                  value={config.systemPrompt}
                  onChange={(e) => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Instruções de Ação</CardTitle>
                <CardDescription>Defina o que o bot deve ou não fazer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Do */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-green-600">✓ Deve fazer</Label>
                      <Button size="sm" variant="outline" onClick={() => addInstruction('do')}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {config.actionInstructions.filter(i => i.type === 'do').map(instruction => (
                      <div key={instruction.id} className="flex gap-2">
                        <Input
                          value={instruction.instruction}
                          onChange={(e) => updateInstruction(instruction.id, e.target.value)}
                          placeholder="Ex: Sempre cumprimentar o cliente"
                        />
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => removeInstruction(instruction.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Don't */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-red-600">✗ Não deve fazer</Label>
                      <Button size="sm" variant="outline" onClick={() => addInstruction('dont')}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {config.actionInstructions.filter(i => i.type === 'dont').map(instruction => (
                      <div key={instruction.id} className="flex gap-2">
                        <Input
                          value={instruction.instruction}
                          onChange={(e) => updateInstruction(instruction.id, e.target.value)}
                          placeholder="Ex: Nunca revelar informações sensíveis"
                        />
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => removeInstruction(instruction.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plug className="h-5 w-5" />
                  Ferramentas do Agente
                </CardTitle>
                <CardDescription>
                  Configure as ferramentas que o bot pode utilizar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <Label>Busca na Web</Label>
                      <p className="text-sm text-muted-foreground">
                        Permite que o bot faça buscas na internet
                      </p>
                    </div>
                    <Switch
                      checked={config.enableWebSearch}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableWebSearch: checked }))}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Mais ferramentas serão disponibilizadas em breve.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Memory Tab */}
          <TabsContent value="memory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Configuração de Memória
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tamanho da Janela de Contexto</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[config.contextWindowSize]}
                      min={1}
                      max={50}
                      step={1}
                      onValueChange={([value]) => setConfig(prev => ({ ...prev, contextWindowSize: value }))}
                      className="flex-1"
                    />
                    <span className="w-12 text-center font-mono">{config.contextWindowSize}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Número de mensagens anteriores que o bot lembra
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>ID da Sessão</Label>
                  <Input
                    placeholder="Deixe vazio para gerar automaticamente"
                    value={config.sessionKeyId}
                    onChange={(e) => setConfig(prev => ({ ...prev, sessionKeyId: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Política de Retenção</Label>
                  <Select
                    value={config.retentionPolicy}
                    onValueChange={(value: '7days' | '30days' | '90days' | 'unlimited') => 
                      setConfig(prev => ({ ...prev, retentionPolicy: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7days">7 dias</SelectItem>
                      <SelectItem value="30days">30 dias</SelectItem>
                      <SelectItem value="90days">90 dias</SelectItem>
                      <SelectItem value="unlimited">Ilimitado</SelectItem>
                    </SelectContent>
                  </Select>
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

export default WhatsAppBotConfigSystem;
