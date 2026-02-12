import { type ComponentType, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
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
import { ProductTutorial } from '@/components/ProductTutorial';
import { fidelidadeDigitalTutorial } from '@/data/tutorials/fidelidade-digital';
import { LoyaltyDashboard } from '@/components/loyalty/LoyaltyDashboard';
import { LoyaltyClients } from '@/components/loyalty/LoyaltyClients';
import { LoyaltyRewards } from '@/components/loyalty/LoyaltyRewards';
import { LoyaltyTransactions } from '@/components/loyalty/LoyaltyTransactions';
import { LoyaltyMessages } from '@/components/loyalty/LoyaltyMessages';
import { LoyaltySettings } from '@/components/loyalty/LoyaltySettings';
import { LoyaltyIntegration } from '@/components/loyalty/LoyaltyIntegration';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProductAccess } from '@/hooks/useProductAccess';
import {
  LayoutDashboard,
  Users,
  Gift,
  ArrowUpDown,
  MessageSquare,
  Plug,
  Settings,
} from 'lucide-react';

export default function LoyaltySystem() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { productId } = useParams();
  const { toast } = useToast();
  const access = useProductAccess('fidelidade-digital');
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hovered, setHovered] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const open = isMobile ? true : pinnedOpen || hovered;
  const [customerProductId, setCustomerProductId] = useState<string | null>(null);

  type SidebarItem = { value: string; label: string; icon: ComponentType<{ className?: string }> };
  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { value: 'clients', label: 'Clientes', icon: Users },
      { value: 'rewards', label: 'Recompensas', icon: Gift },
      { value: 'transactions', label: 'Transações', icon: ArrowUpDown },
      { value: 'messages', label: 'Mensagens', icon: MessageSquare },
      { value: 'integration', label: 'Integração', icon: Plug },
      { value: 'settings', label: 'Configurações', icon: Settings },
    ],
    []
  );

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (!user) return;

    // Se vier via URL com productId, mantemos (rotas antigas /sistema/fidelidade-digital/:productId)
    if (productId) {
      setCustomerProductId(productId);
      return;
    }

    // Caso padrão: usa o gate central (free_trials + customer_products)
    if (access.loading) return;

    if (!access.hasAccess || !access.customerId) {
      toast({
        title: 'Erro',
        description: 'Você precisa adquirir o produto ou ativar um teste grátis.',
        variant: 'destructive',
      });
      navigate('/produtos/fidelidade-digital');
      return;
    }

    setCustomerProductId(access.customerId);
  }, [user, loading, navigate, productId, access.loading, access.hasAccess, access.customerId, toast]);

  if (loading || (access.loading && !productId) || !customerProductId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ProductTutorial
        productSlug="fidelidade-digital"
        productTitle="Sistema de Fidelidade Digital"
        steps={fidelidadeDigitalTutorial}
        onComplete={() => {}}
      />
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Sistema de Fidelidade Digital
          </h1>
          <p className="text-muted-foreground">
            Gerencie seu programa de pontos e recompensas
          </p>
        </div>

        <Card className="border-border/50 bg-card/40 backdrop-blur supports-[backdrop-filter]:bg-card/30 shadow-card overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <SidebarProvider open={open} onOpenChange={setPinnedOpen} className="min-h-0">
              <div className="flex w-full min-h-[60vh] min-h-0 gap-4">
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
                    <TabsContent value="dashboard" className="space-y-4">
                      <LoyaltyDashboard customerProductId={customerProductId} />
                    </TabsContent>

                    <TabsContent value="clients" className="space-y-4">
                      <LoyaltyClients customerProductId={customerProductId} />
                    </TabsContent>

                    <TabsContent value="rewards" className="space-y-4">
                      <LoyaltyRewards customerProductId={customerProductId} />
                    </TabsContent>

                    <TabsContent value="transactions" className="space-y-4">
                      <LoyaltyTransactions customerProductId={customerProductId} />
                    </TabsContent>

                    <TabsContent value="messages" className="space-y-4">
                      <LoyaltyMessages customerProductId={customerProductId} />
                    </TabsContent>

                    <TabsContent value="integration" className="space-y-4">
                      <LoyaltyIntegration customerProductId={customerProductId} />
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-4">
                      <LoyaltySettings customerProductId={customerProductId} />
                    </TabsContent>
                  </div>
                </SidebarInset>
              </div>
            </SidebarProvider>
          </Tabs>
        </Card>
      </main>

      <Footer />
    </div>
  );
}