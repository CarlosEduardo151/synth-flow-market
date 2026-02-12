import { type ComponentType, useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { RHVagasTab } from '@/components/rh/RHVagasTab';
import { RHCandidatosTab } from '@/components/rh/RHCandidatosTab';
import { RHEntrevistasTab } from '@/components/rh/RHEntrevistasTab';
import { RHRelatoriosTab } from '@/components/rh/RHRelatoriosTab';
import { 
  Bot, Settings, Users, Calendar, CheckCircle, 
  Briefcase, Loader2, ArrowRight, Rocket, Zap, MessageSquare,
  BarChart3, Webhook, Copy
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ProductAccess {
  id: string;
  product_slug: string;
  status: string;
}

interface AIConfig {
  id: string;
  webhook_url?: string;
}

const AgenteRHSystem = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [_productAccess, setProductAccess] = useState<ProductAccess | null>(null);
  const [_aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [workspaceCreated, setWorkspaceCreated] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [stats, setStats] = useState({ vagas: 0, candidatos: 0, entrevistas: 0, contratados: 0 });
  const [activeTab, setActiveTab] = useState<'vagas' | 'candidatos' | 'entrevistas' | 'relatorios'>('vagas');
  const [hovered, setHovered] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const open = isMobile ? true : pinnedOpen || hovered;

  type SidebarItem = { value: typeof activeTab; label: string; icon: ComponentType<{ className?: string }> };
  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      { value: 'vagas', label: 'Vagas', icon: Briefcase },
      { value: 'candidatos', label: 'Candidatos', icon: Users },
      { value: 'entrevistas', label: 'Entrevistas', icon: Calendar },
      { value: 'relatorios', label: 'Relatórios', icon: BarChart3 },
    ],
    []
  );

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (user) {
      checkAccess();
    }
  }, [user, loading, navigate]);

  const checkAccess = async () => {
    if (!user) return;

    try {
      const { data: rental } = await supabase
        .from('product_rentals')
        .select('id, product_slug, status')
        .eq('user_id', user.id)
        .eq('product_slug', 'agente-rh')
        .eq('status', 'active')
        .maybeSingle();

      if (rental) {
        setProductAccess(rental);
        
        const { data: config } = await (supabase
          .from('ai_control_config') as any)
          .select('id, n8n_webhook_url')
          .eq('user_id', user.id)
          .eq('customer_product_id', rental.id)
          .maybeSingle();

        if (config) {
          setAiConfig(config as any);
          setWorkspaceCreated(true);
          if ((config as any).n8n_webhook_url) {
            setWebhookUrl((config as any).n8n_webhook_url);
          }
          await loadStats();
        }
      } else {
        toast({
          title: "Acesso Negado",
          description: "Você precisa adquirir o Agente de RH para acessar este sistema.",
          variant: "destructive"
        });
        navigate('/meus-produtos');
        return;
      }
    } catch (error) {
      console.error('Error checking access:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user) return;
    
    try {
      const [vagasRes, candidatosRes, entrevistasRes] = await Promise.all([
        supabase.from('rh_vagas').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'ativa'),
        supabase.from('rh_candidatos').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('rh_entrevistas').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'agendada')
      ]);
      
      const { count: contratados } = await supabase
        .from('rh_candidatos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('etapa', 'contratado');

      setStats({
        vagas: vagasRes.count || 0,
        candidatos: candidatosRes.count || 0,
        entrevistas: entrevistasRes.count || 0,
        contratados: contratados || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!user) return;

    setIsProvisioning(true);
    try {
      const { data, error } = await supabase.functions.invoke('provision-rh-workflow', {
        body: { userId: user.id }
      });

      if (error) throw error;

      const generatedWebhookUrl = data?.webhookPath 
        ? `${import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://seu-n8n.com'}/webhook/${data.webhookPath}`
        : '';

      await supabase.from('ai_control_config').insert({
        user_id: user.id,
        product_id: 'agente-rh',
        is_active: true,
        system_prompt: 'Você é um assistente de RH especializado em recrutamento e seleção.',
        temperature: 0.7,
        max_tokens: 2048,
        webhook_url: generatedWebhookUrl
      } as any);

      setWorkspaceCreated(true);
      setWebhookUrl(generatedWebhookUrl);
      toast({
        title: "Espaço de Trabalho Criado!",
        description: "Seu agente de RH está pronto para uso.",
      });
      loadStats();
    } catch (error: any) {
      console.error('Error provisioning workspace:', error);
      toast({
        title: "Erro ao criar espaço",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsProvisioning(false);
    }
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({ title: "URL copiada!" });
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Welcome screen
  if (!workspaceCreated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            {/* Hero */}
            <div className="text-center mb-12">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-primary/50 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
                <Bot className="h-10 w-10 text-primary-foreground" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Agente de RH
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Automatize seu processo de recrutamento com inteligência artificial.
                Triagem de currículos, agendamento de entrevistas e comunicação com candidatos via WhatsApp.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {[
                { icon: MessageSquare, title: "Recebimento via WhatsApp", desc: "Candidatos enviam currículos direto no WhatsApp" },
                { icon: Zap, title: "Triagem Automática", desc: "IA analisa e avalia cada candidato" },
                { icon: Calendar, title: "Agendamento", desc: "Gerencie entrevistas de forma simples" },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * idx }}
                >
                  <Card className="h-full border-border/50 bg-card/50 backdrop-blur">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <item.icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* CTA Card */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center gap-2 justify-center text-xl">
                  <Rocket className="h-5 w-5" />
                  Criar Espaço de Trabalho
                </CardTitle>
                <CardDescription>
                  Configure seu ambiente de RH automatizado em segundos
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pb-8">
                <Button 
                  size="lg" 
                  className="h-12 px-8 text-base"
                  onClick={handleCreateWorkspace}
                  disabled={isProvisioning}
                >
                  {isProvisioning ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Criando seu espaço...
                    </>
                  ) : (
                    <>
                      Começar Agora
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/50 rounded-xl flex items-center justify-center shadow-lg shadow-primary/10">
              <Bot className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Agente de RH</h1>
              <p className="text-sm text-muted-foreground">Gerencie seu processo de recrutamento</p>
            </div>
            <Badge variant="outline" className="ml-2 bg-green-500/10 text-green-500 border-green-500/20">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              Ativo
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/sistema/agente-rh/config')}>
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Button>
          </div>
        </div>

        {/* Webhook Info Card */}
        {webhookUrl && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Webhook className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Webhook do WhatsApp</p>
                    <p className="text-xs text-muted-foreground">Configure este webhook na sua instância Z-API ou Evolution</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-background px-3 py-2 rounded-lg border max-w-md truncate">
                    {webhookUrl}
                  </code>
                  <Button variant="ghost" size="icon" onClick={copyWebhook}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Vagas Ativas", value: stats.vagas, icon: Briefcase, color: "text-blue-500" },
            { label: "Candidatos", value: stats.candidatos, icon: Users, color: "text-purple-500" },
            { label: "Entrevistas", value: stats.entrevistas, icon: Calendar, color: "text-orange-500" },
            { label: "Contratados", value: stats.contratados, icon: CheckCircle, color: "text-green-500" },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 * idx }}
            >
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg bg-current/10 flex items-center justify-center ${stat.color}`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Navegação */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <SidebarProvider open={open} onOpenChange={setPinnedOpen} className="min-h-0">
            <div className="flex w-full min-h-[60vh] min-h-0 gap-4 overflow-hidden rounded-xl border border-border/50 bg-card/40 backdrop-blur supports-[backdrop-filter]:bg-card/30 shadow-card">
              <div
                className="p-2 md:py-6 md:pl-4"
                onMouseEnter={() => !isMobile && setHovered(true)}
                onMouseLeave={() => !isMobile && setHovered(false)}
              >
                <div className="md:sticky md:top-24">
                  <div className="rounded-2xl border border-sidebar-border/60 bg-sidebar/70 backdrop-blur supports-[backdrop-filter]:bg-sidebar/50 shadow-card">
                    <Sidebar
                      collapsible={isMobile ? 'offcanvas' : 'icon'}
                      className="border-none bg-transparent text-sidebar-foreground"
                    >
                      <SidebarContent>
                        <SidebarGroup>
                          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
                          <SidebarMenu>
                            {sidebarItems.map((item) => {
                              const Icon = item.icon;
                              return (
                                <SidebarMenuItem key={item.value}>
                                  <SidebarMenuButton
                                    type="button"
                                    isActive={activeTab === item.value}
                                    tooltip={item.label}
                                    onClick={() => setActiveTab(item.value)}
                                  >
                                    <Icon className="shrink-0" />
                                    <span>{item.label}</span>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              );
                            })}
                          </SidebarMenu>
                        </SidebarGroup>
                      </SidebarContent>
                    </Sidebar>
                  </div>
                </div>
              </div>

              <SidebarInset className="min-w-0">
                {isMobile ? (
                  <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border/50 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/40 px-3 py-2">
                    <SidebarTrigger />
                    <span className="text-sm font-medium">Navegação</span>
                  </div>
                ) : null}
                <div className="p-4">
                  <TabsContent value="vagas">
                    {user && <RHVagasTab userId={user.id} />}
                  </TabsContent>

                  <TabsContent value="candidatos">
                    {user && <RHCandidatosTab userId={user.id} />}
                  </TabsContent>

                  <TabsContent value="entrevistas">
                    {user && <RHEntrevistasTab userId={user.id} />}
                  </TabsContent>

                  <TabsContent value="relatorios">
                    {user && <RHRelatoriosTab userId={user.id} />}
                  </TabsContent>
                </div>
              </SidebarInset>
            </div>
          </SidebarProvider>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default AgenteRHSystem;
