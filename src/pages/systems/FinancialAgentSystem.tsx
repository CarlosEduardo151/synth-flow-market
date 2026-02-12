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
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useProductAccess } from '@/hooks/useProductAccess';
import { FinancialDashboard } from '@/components/financial/FinancialDashboard';
import { FinancialTransactions } from '@/components/financial/FinancialTransactions';
import { FinancialInvoices } from '@/components/financial/FinancialInvoices';
import { FinancialGoals } from '@/components/financial/FinancialGoals';
import { FinancialReports } from '@/components/financial/FinancialReports';
import { FinancialSettings } from '@/components/financial/FinancialSettings';
import { FinancialChatbot } from '@/components/financial/FinancialChatbot';
import { 
  LayoutDashboard, 
  ArrowUpDown, 
  Receipt, 
  Target, 
  BarChart3, 
  Settings,
  MessageSquare
} from 'lucide-react';

export default function FinancialAgentSystem() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasAccess, customerId, loading } = useProductAccess('agente-financeiro');
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mode, setMode] = useState<'personal' | 'business'>('personal');
  const [hovered, setHovered] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  // No mobile, mantemos o estado “expanded” para o drawer sempre abrir com labels.
  const open = isMobile ? true : pinnedOpen || hovered;

  type SidebarItem = { value: string; label: string; icon: ComponentType<{ className?: string }> };
  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { value: 'chatbot', label: 'Chat', icon: MessageSquare },
      { value: 'transactions', label: 'Transações', icon: ArrowUpDown },
      { value: 'invoices', label: 'Faturas', icon: Receipt },
      { value: 'goals', label: 'Metas', icon: Target },
      { value: 'reports', label: 'Relatórios', icon: BarChart3 },
      { value: 'settings', label: 'Config', icon: Settings },
    ],
    []
  );

  // Redirect if no access
  if (!loading && (!hasAccess || !customerId)) {
      toast({
        title: "Erro",
        description: "Você precisa adquirir o produto ou ativar um teste grátis para acessar este sistema.",
        variant: "destructive"
      });
      navigate('/p/agente-financeiro');
      return null;
  }

  if (loading || !customerId) {
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
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-emerald-500 to-cyan-600 bg-clip-text text-transparent">
                Agente Financeiro
              </h1>
              <p className="text-muted-foreground text-lg">
                {mode === 'personal' ? 'Controle de finanças pessoais' : 'Gestão financeira empresarial'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMode('personal')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  mode === 'personal' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                Pessoa Física
              </button>
              <button
                onClick={() => setMode('business')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  mode === 'business' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                Empresarial
              </button>
            </div>
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
                        <FinancialDashboard customerProductId={customerId} mode={mode} />
                      </TabsContent>

                      <TabsContent value="chatbot" className="space-y-4">
                        <FinancialChatbot customerProductId={customerId} />
                      </TabsContent>

                      <TabsContent value="transactions" className="space-y-4">
                        <FinancialTransactions customerProductId={customerId} mode={mode} />
                      </TabsContent>

                      <TabsContent value="invoices" className="space-y-4">
                        <FinancialInvoices customerProductId={customerId} mode={mode} />
                      </TabsContent>

                      <TabsContent value="goals" className="space-y-4">
                        <FinancialGoals customerProductId={customerId} />
                      </TabsContent>

                      <TabsContent value="reports" className="space-y-4">
                        <FinancialReports customerProductId={customerId} mode={mode} />
                      </TabsContent>

                      <TabsContent value="settings" className="space-y-4">
                        <FinancialSettings customerProductId={customerId} mode={mode} onModeChange={setMode} />
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

