import { type ComponentType, useMemo, useState, useEffect } from 'react';
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
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProductAccess } from '@/hooks/useProductAccess';
import { SalesDashboard } from '@/components/sales/SalesDashboard';

const supabase = supabaseClient as any;
import { SalesLeads } from '@/components/sales/SalesLeads';
import { SalesPipeline } from '@/components/sales/SalesPipeline';
import { SalesFollowUps } from '@/components/sales/SalesFollowUps';
import { SalesMeetings } from '@/components/sales/SalesMeetings';
import { SalesReports } from '@/components/sales/SalesReports';
import { SalesSettings } from '@/components/sales/SalesSettings';
import { 
  LayoutDashboard, 
  Users, 
  Target, 
  CalendarCheck, 
  Video, 
  BarChart3, 
  Settings 
} from 'lucide-react';

export default function SalesAssistantSystem() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const access = useProductAccess('assistente-vendas');
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
      { value: 'leads', label: 'Leads', icon: Users },
      { value: 'pipeline', label: 'Pipeline', icon: Target },
      { value: 'followups', label: 'Follow-ups', icon: CalendarCheck },
      { value: 'meetings', label: 'Reuniões', icon: Video },
      { value: 'reports', label: 'Relatórios', icon: BarChart3 },
      { value: 'settings', label: 'Config', icon: Settings },
    ],
    []
  );

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (!user) return;
    if (access.loading) return;

    if (!access.hasAccess || !access.customerId) {
      toast({
        title: 'Erro',
        description: 'Você precisa adquirir o produto ou ativar um teste grátis.',
        variant: 'destructive',
      });
      navigate('/p/assistente-vendas');
      return;
    }

    setCustomerProductId(access.customerId);
  }, [user, loading, navigate, access.loading, access.hasAccess, access.customerId, toast]);

  // mantém a declaração de supabase (usada por outros trechos/linters), mas não fazemos mais checagem manual aqui.

  if (loading || access.loading || !customerProductId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
            Assistente de Vendas com IA
          </h1>
          <p className="text-muted-foreground text-lg">
            Prospecção inteligente, follow-up automático e análise de pipeline
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
                      <SalesDashboard customerProductId={customerProductId} />
                    </TabsContent>

                    <TabsContent value="leads" className="space-y-4">
                      <SalesLeads customerProductId={customerProductId} />
                    </TabsContent>

                    <TabsContent value="pipeline" className="space-y-4">
                      <SalesPipeline customerProductId={customerProductId} />
                    </TabsContent>

                    <TabsContent value="followups" className="space-y-4">
                      <SalesFollowUps customerProductId={customerProductId} />
                    </TabsContent>

                    <TabsContent value="meetings" className="space-y-4">
                      <SalesMeetings customerProductId={customerProductId} />
                    </TabsContent>

                    <TabsContent value="reports" className="space-y-4">
                      <SalesReports customerProductId={customerProductId} />
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-4">
                      <SalesSettings customerProductId={customerProductId} />
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

