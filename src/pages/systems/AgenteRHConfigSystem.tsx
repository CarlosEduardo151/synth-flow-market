import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Bot, Save, Brain, Settings, Zap } from 'lucide-react';

interface AgentConfig {
  isActive: boolean;
  agentName: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  culturalFit: string;
  requiredSkills: string;
  autoScreening: boolean;
  autoScheduling: boolean;
}

const AgenteRHConfigSystem = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { productId } = useParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [config, setConfig] = useState<AgentConfig>({
    isActive: true,
    agentName: 'Assistente de RH',
    systemPrompt: `Você é um assistente de RH especializado em recrutamento e seleção. Suas responsabilidades incluem:

1. Analisar currículos e avaliar fit cultural
2. Responder perguntas de candidatos sobre vagas
3. Agendar entrevistas quando solicitado
4. Fornecer feedback construtivo

Seja profissional, empático e objetivo em suas respostas.`,
    temperature: 0.7,
    maxTokens: 2048,
    culturalFit: 'Buscamos profissionais proativos, com boa comunicação e espírito de equipe.',
    requiredSkills: '',
    autoScreening: true,
    autoScheduling: false,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (user) {
      loadConfig();
    }
  }, [user, loading, navigate]);

  const loadConfig = async () => {
    if (!user) return;

    try {
      const { data } = await (supabase
        .from('ai_control_config') as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setConfig(prev => ({
          ...prev,
          isActive: (data as any).is_active || true,
          agentName: (data as any).business_name || prev.agentName,
          systemPrompt: (data as any).system_prompt || prev.systemPrompt,
          temperature: (data as any).temperature || prev.temperature,
          maxTokens: (data as any).max_tokens || prev.maxTokens,
        }));
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('ai_control_config')
        .upsert({
          user_id: user.id,
          product_id: 'agente-rh',
          is_active: config.isActive,
          agent_name: config.agentName,
          system_prompt: config.systemPrompt,
          temperature: config.temperature,
          max_tokens: config.maxTokens,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: 'user_id,product_id' });

      if (error) throw error;

      toast({
        title: "Configurações Salvas",
        description: "As configurações do agente foram atualizadas.",
      });
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
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
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => navigate('/sistema/agente-rh')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Settings className="h-8 w-8 text-primary" />
              Configurar Agente de RH
            </h1>
            <p className="text-muted-foreground">Personalize o comportamento do seu agente</p>
          </div>
        </div>

        <Tabs defaultValue="geral" className="space-y-6">
          <TabsList>
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="ia">Configurações IA</TabsTrigger>
            <TabsTrigger value="automacao">Automações</TabsTrigger>
          </TabsList>

          <TabsContent value="geral">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    Identidade do Agente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Agente Ativo</Label>
                      <p className="text-sm text-muted-foreground">Ativar ou desativar o agente</p>
                    </div>
                    <Switch
                      checked={config.isActive}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, isActive: checked }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agentName">Nome do Agente</Label>
                    <Input
                      id="agentName"
                      value={config.agentName}
                      onChange={(e) => setConfig(prev => ({ ...prev, agentName: e.target.value }))}
                      placeholder="Ex: Ana - Assistente de RH"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="culturalFit">Cultura da Empresa</Label>
                    <Textarea
                      id="culturalFit"
                      value={config.culturalFit}
                      onChange={(e) => setConfig(prev => ({ ...prev, culturalFit: e.target.value }))}
                      placeholder="Descreva a cultura e valores da empresa..."
                      rows={3}
                    />
                    <p className="text-sm text-muted-foreground">
                      O agente usará isso para avaliar fit cultural dos candidatos
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ia">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Prompt do Sistema
                  </CardTitle>
                  <CardDescription>
                    Instruções que definem o comportamento do agente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={config.systemPrompt}
                    onChange={(e) => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                    rows={10}
                    className="font-mono text-sm"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Parâmetros do Modelo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Temperatura: {config.temperature}</Label>
                    </div>
                    <Slider
                      value={[config.temperature]}
                      onValueChange={([value]) => setConfig(prev => ({ ...prev, temperature: value }))}
                      min={0}
                      max={1}
                      step={0.1}
                    />
                    <p className="text-sm text-muted-foreground">
                      Menor = respostas mais consistentes | Maior = respostas mais criativas
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Max Tokens: {config.maxTokens}</Label>
                    </div>
                    <Slider
                      value={[config.maxTokens]}
                      onValueChange={([value]) => setConfig(prev => ({ ...prev, maxTokens: value }))}
                      min={256}
                      max={4096}
                      step={256}
                    />
                    <p className="text-sm text-muted-foreground">
                      Tamanho máximo das respostas do agente
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="automacao">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Automações
                </CardTitle>
                <CardDescription>
                  Configure ações automáticas do agente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Triagem Automática</Label>
                    <p className="text-sm text-muted-foreground">
                      Analisar currículos automaticamente quando recebidos
                    </p>
                  </div>
                  <Switch
                    checked={config.autoScreening}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, autoScreening: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Agendamento Automático</Label>
                    <p className="text-sm text-muted-foreground">
                      Agendar entrevistas automaticamente para candidatos aprovados
                    </p>
                  </div>
                  <Switch
                    checked={config.autoScheduling}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, autoScheduling: checked }))}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-8">
          <Button onClick={handleSave} disabled={isSaving} size="lg">
            {isSaving ? (
              <>Salvando...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AgenteRHConfigSystem;
