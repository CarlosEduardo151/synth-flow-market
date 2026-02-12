import { type ComponentType, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductTutorial } from '@/components/ProductTutorial';
import { crmSimplesTutorial } from '@/data/tutorials/crm-simples';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Users, UserPlus, Settings, ClipboardList, FileText, LayoutDashboard, BarChart3, MessageSquare, Link2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

import { CRMDashboard } from '@/components/crm/CRMDashboard';
import { CRMClientsTable } from '@/components/crm/CRMClientsTable';
import { CRMOpportunities } from '@/components/crm/CRMOpportunities';
import { CRMIntegration } from '@/components/crm/CRMIntegration';
import { CRMMessages } from '@/components/crm/CRMMessages';
import { CRMAIConfig } from '@/components/crm/CRMAIConfig';
import { CRMAIPendingActions } from '@/components/crm/CRMAIPendingActions';
import { CRMAIReports } from '@/components/crm/CRMAIReports';
import { useProductAccess } from '@/hooks/useProductAccess';

interface CRMCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  business_type: string | null;
  status: string;
  last_contact_date: string | null;
  total_purchases: number;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
}

interface CRMInteraction {
  id: string;
  customer_id: string;
  type: string;
  subject: string | null;
  description: string;
  created_at: string;
}

const CRMSystem = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const access = useProductAccess('crm-simples');
  const isMobile = useIsMobile();
  const [customerProductId, setCustomerProductId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CRMCustomer[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CRMCustomer | null>(null);
  const [interactions, setInteractions] = useState<CRMInteraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CRMCustomer | null>(null);
  const [isAddingInteraction, setIsAddingInteraction] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hovered, setHovered] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  // No mobile, deixamos o provider “expanded” para o drawer funcionar sem estados estranhos.
  const open = isMobile ? true : pinnedOpen || hovered;

  type SidebarItem = { value: string; label: string; icon: ComponentType<{ className?: string }> };
  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { value: 'clientes', label: 'Clientes', icon: Users },
      { value: 'oportunidades', label: 'Oportunidades', icon: BarChart3 },
      { value: 'mensagens', label: 'Mensagens', icon: MessageSquare },
      { value: 'integracao', label: 'Integração', icon: Link2 },
      { value: 'ai-config', label: 'Config IA', icon: Settings },
      { value: 'ai-actions', label: 'Ações IA', icon: ClipboardList },
      { value: 'ai-reports', label: 'Relatórios', icon: FileText },
    ],
    []
  );

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, slug, access.loading, access.hasAccess, access.customerId, access.accessType]);

  const getTrialStorageKey = (userId: string) => `crm-simples:trial-customers:${userId}`;

  const readTrialCustomers = (): CRMCustomer[] => {
    if (!user) return [];
    try {
      const raw = localStorage.getItem(getTrialStorageKey(user.id));
      const parsed = raw ? (JSON.parse(raw) as CRMCustomer[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writeTrialCustomers = (next: CRMCustomer[]) => {
    if (!user) return;
    localStorage.setItem(getTrialStorageKey(user.id), JSON.stringify(next));
  };

  const checkAccess = async () => {
    if (!user) return;

    // Espera o hook central terminar (ele já atualiza trials expirados e valida purchase/trial)
    if (access.loading) return;

    if (!access.hasAccess) {
      toast({
        title: 'Acesso Negado',
        description: 'Você precisa comprar o CRM ou ativar um teste grátis.',
        variant: 'destructive',
      });
      navigate('/meus-produtos');
      setIsLoading(false);
      return;
    }

    setCustomerProductId(access.customerId);

    if (access.accessType === 'trial') {
      // Trial: mantém dados isolados por usuário no localStorage (não mistura com outros clientes)
      const trialCustomers = readTrialCustomers();
      setCustomers(trialCustomers);
      setOpportunities([]);
      setIsLoading(false);
      return;
    }

    // Purchase/assinatura: dados no banco por customer_product_id
    if (access.customerId) {
      try {
        await loadCustomers(access.customerId);
        await loadOpportunities(access.customerId);
      } catch (error) {
        console.error('Erro ao carregar dados do CRM:', error);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(false);
  };

  const loadCustomers = async (productId: string) => {
    const { data, error } = await supabase
      .from('crm_customers' as any)
      .select('id, name, email, phone, company, business_type, status, notes, last_contact_date, created_at')
      .eq('customer_product_id', productId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar clientes:', error);
      return;
    }

    setCustomers(
      (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        company: c.company,
        business_type: c.business_type || null,
        status: c.status || 'lead',
        last_contact_date: c.last_contact_date || null,
        total_purchases: 0,
        notes: c.notes || null,
        tags: null,
        created_at: c.created_at,
      }))
    );
  };

  const loadOpportunities = async (productId: string) => {
    // Skip crm_opportunities - table doesn't exist
    setOpportunities([]);
  };

  const refreshData = () => {
    if (customerProductId) {
      if (access.accessType === 'trial') {
        setCustomers(readTrialCustomers());
        setOpportunities([]);
        return;
      }
      loadCustomers(customerProductId);
      loadOpportunities(customerProductId);
    }
  };

  const loadInteractions = async (customerId: string) => {
    // Skip crm_interactions - table doesn't exist
    setInteractions([]);
  };

  const handleSaveCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!customerProductId) return;

    const formData = new FormData(e.currentTarget);
    const customerData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string || null,
      phone: formData.get('phone') as string || null,
      company: formData.get('company') as string || null,
      business_type: (formData.get('business_type') as string) || null,
      status: (formData.get('status') as string) || 'lead',
      notes: formData.get('notes') as string || null
    };

    // Trial: persiste no localStorage por usuário
    if (access.accessType === 'trial') {
      const now = new Date().toISOString();
      const current = readTrialCustomers();
      const next: CRMCustomer[] = editingCustomer
        ? current.map((c) =>
            c.id === editingCustomer.id
              ? {
                  ...c,
                  ...customerData,
                }
              : c
          )
        : [
            {
              id: crypto.randomUUID(),
              created_at: now,
              last_contact_date: now,
              total_purchases: 0,
              tags: null,
              ...customerData,
            },
            ...current,
          ];

      writeTrialCustomers(next);
      setCustomers(next);
      toast({ title: editingCustomer ? 'Cliente atualizado!' : 'Cliente adicionado com sucesso!' });
      setIsAddingCustomer(false);
      setEditingCustomer(null);
      return;
    }

    // Assinatura: persiste no banco por customer_product_id
    let error;
    if (editingCustomer) {
      ({ error } = await supabase
        .from('crm_customers' as any)
        .update({
          ...customerData,
          last_contact_date: new Date().toISOString(),
        })
        .eq('id', editingCustomer.id));
    } else {
      ({ error } = await supabase
        .from('crm_customers' as any)
        .insert({
          customer_product_id: customerProductId,
          ...customerData,
          last_contact_date: new Date().toISOString(),
        }));
    }

    if (!error) {
      toast({ title: editingCustomer ? "Cliente atualizado!" : "Cliente adicionado com sucesso!" });
      setIsAddingCustomer(false);
      setEditingCustomer(null);
      refreshData();
    } else {
      toast({ title: "Erro ao salvar cliente", variant: "destructive" });
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    if (access.accessType === 'trial') {
      const current = readTrialCustomers();
      const next = current.filter((c) => c.id !== customerId);
      writeTrialCustomers(next);
      setCustomers(next);
      toast({ title: 'Cliente excluído com sucesso!' });
      return;
    }

    const { error } = await supabase
      .from('crm_customers' as any)
      .delete()
      .eq('id', customerId);

    if (!error) {
      toast({ title: "Cliente excluído com sucesso!" });
      refreshData();
    } else {
      toast({ title: "Erro ao excluir cliente", variant: "destructive" });
    }
  };

  const handleAddInteraction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    // crm_interactions table doesn't exist - show message
    toast({ 
      title: "Tabela não configurada", 
      description: "A tabela de interações ainda não foi criada no banco de dados.",
      variant: "destructive" 
    });
    setIsAddingInteraction(false);
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <ProductTutorial
        productSlug="crm-simples"
        productTitle="CRM Simples para Microempresas"
        steps={crmSimplesTutorial}
        onComplete={() => {}}
      />
      
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 mb-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              CRM - Gestão de Clientes Completa
            </h1>
            <p className="text-muted-foreground mt-2">Gerencie clientes, oportunidades e automações com IA</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => {
                setEditingCustomer(null);
                setIsAddingCustomer(true);
              }}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
            <Button
              variant="outline"
              onClick={() => setActiveTab('integracao')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Conectar/Importar
            </Button>
          </div>
        </div>

        {/* Onboarding rápido */}
        {customers.length === 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Primeiros passos</CardTitle>
              <CardDescription>Em 2 minutos você deixa o CRM pronto pra usar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
                <li>Cadastre seu primeiro cliente (nome + contato).</li>
                <li>Configure a integração para importar leads automaticamente.</li>
                <li>Use “Insights com IA” no Dashboard para priorizar follow-ups.</li>
              </ol>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={() => {
                    setEditingCustomer(null);
                    setIsAddingCustomer(true);
                    setActiveTab('clientes');
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar 1º cliente
                </Button>
                <Button variant="outline" onClick={() => setActiveTab('integracao')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Abrir integração
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <SidebarProvider open={open} onOpenChange={setPinnedOpen} className="min-h-0 !min-h-0">
            <div className="flex w-full min-h-[60vh] min-h-0 items-start gap-4 overflow-hidden rounded-xl border border-border/50 bg-card/40 backdrop-blur supports-[backdrop-filter]:bg-card/30 shadow-card">
              <div
                className="self-start p-2 md:py-6 md:pl-4"
                onMouseEnter={() => !isMobile && setHovered(true)}
                onMouseLeave={() => !isMobile && setHovered(false)}
              >
                <div className="md:sticky md:top-24">
                  <div className="h-fit max-h-[calc(100svh-theme(spacing.24))] overflow-auto rounded-2xl border border-sidebar-border/60 bg-sidebar/70 backdrop-blur supports-[backdrop-filter]:bg-sidebar/50 shadow-card">
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
                    <CRMDashboard customers={customers} opportunities={opportunities} />
                  </TabsContent>

                  <TabsContent value="clientes" className="space-y-4">
                    <CRMClientsTable
                      customers={customers}
                      onRowClick={(customer) => {
                        setSelectedCustomer(customer as CRMCustomer);
                        loadInteractions(customer.id);
                      }}
                      onViewDetails={(customer) => {
                        setSelectedCustomer(customer as CRMCustomer);
                        loadInteractions(customer.id);
                      }}
                      onEdit={(customer) => {
                        setEditingCustomer(customer as CRMCustomer);
                        setIsAddingCustomer(true);
                      }}
                      onDelete={handleDeleteCustomer}
                    />
                  </TabsContent>

                  <TabsContent value="oportunidades" className="space-y-4">
                    <CRMOpportunities
                      opportunities={opportunities}
                      customers={customers}
                      onRefresh={refreshData}
                    />
                  </TabsContent>

                  <TabsContent value="mensagens" className="space-y-4">
                    {customerProductId && <CRMMessages customerProductId={customerProductId} />}
                  </TabsContent>

                  <TabsContent value="integracao" className="space-y-4">
                    {customerProductId && <CRMIntegration customerProductId={customerProductId} />}
                  </TabsContent>

                  <TabsContent value="ai-config" className="space-y-4">
                    <CRMAIConfig />
                  </TabsContent>

                  <TabsContent value="ai-actions" className="space-y-4">
                    <CRMAIPendingActions />
                  </TabsContent>

                  <TabsContent value="ai-reports" className="space-y-4">
                    <CRMAIReports />
                  </TabsContent>
                </div>
              </SidebarInset>
            </div>
          </SidebarProvider>
        </Tabs>

        {/* Dialog para adicionar/editar cliente */}
        <Dialog open={isAddingCustomer} onOpenChange={(open) => {
          setIsAddingCustomer(open);
          if (!open) setEditingCustomer(null);
        }}>
          <DialogContent className="sm:max-w-[525px]">
            <form onSubmit={handleSaveCustomer}>
              <DialogHeader>
                <DialogTitle>{editingCustomer ? 'Editar Cliente' : 'Adicionar Novo Cliente'}</DialogTitle>
                <DialogDescription>Preencha as informações do cliente</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input id="name" name="name" defaultValue={editingCustomer?.name} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" defaultValue={editingCustomer?.email || ''} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" name="phone" defaultValue={editingCustomer?.phone || ''} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="company">Empresa</Label>
                  <Input id="company" name="company" defaultValue={editingCustomer?.company || ''} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="business_type">Tipo de Negócio</Label>
                  <Input id="business_type" name="business_type" defaultValue={editingCustomer?.business_type || ''} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={editingCustomer?.status || 'lead'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="customer">Cliente</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea id="notes" name="notes" defaultValue={editingCustomer?.notes || ''} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">{editingCustomer ? 'Atualizar' : 'Adicionar'} Cliente</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Sheet
          open={!!selectedCustomer}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedCustomer(null);
              setIsAddingInteraction(false);
            }
          }}
        >
          <SheetContent className="w-full sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>{selectedCustomer?.name ?? 'Cliente'}</SheetTitle>
              <SheetDescription>Detalhes e ações rápidas</SheetDescription>
            </SheetHeader>

            {selectedCustomer && (
              <div className="mt-6 space-y-6">
                <div className="grid gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{selectedCustomer.company || 'Sem empresa'}</Badge>
                    <Badge variant="outline">{selectedCustomer.status}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div><span className="font-medium text-foreground">Email:</span> {selectedCustomer.email || '-'}</div>
                    <div><span className="font-medium text-foreground">Telefone:</span> {selectedCustomer.phone || '-'}</div>
                    <div><span className="font-medium text-foreground">Criado em:</span> {new Date(selectedCustomer.created_at).toLocaleDateString('pt-BR')}</div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="default"
                    onClick={() => {
                      setEditingCustomer(selectedCustomer);
                      setIsAddingCustomer(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDeleteCustomer(selectedCustomer.id)}
                  >
                    Excluir
                  </Button>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Interações</CardTitle>
                    <CardDescription>Em breve: ligações, mensagens e follow-ups por cliente.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button onClick={() => setIsAddingInteraction(true)} className="w-full" disabled>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Nova Interação
                    </Button>
                    {interactions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma interação registrada ainda.</p>
                    ) : (
                      interactions.map((interaction) => (
                        <Card key={interaction.id}>
                          <CardHeader>
                            <CardTitle className="text-sm">{interaction.subject}</CardTitle>
                            <CardDescription className="text-xs">
                              {new Date(interaction.created_at).toLocaleString('pt-BR')}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm">{interaction.description}</p>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {isAddingInteraction && selectedCustomer && (
          <Dialog open={isAddingInteraction} onOpenChange={setIsAddingInteraction}>
            <DialogContent>
              <form onSubmit={handleAddInteraction}>
                <DialogHeader>
                  <DialogTitle>Nova Interação</DialogTitle>
                  <DialogDescription>Funcionalidade em breve.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="type">Tipo</Label>
                    <Select name="type" required>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="call">Ligação</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="meeting">Reunião</SelectItem>
                        <SelectItem value="note">Nota</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="subject">Assunto</Label>
                    <Input id="subject" name="subject" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Descrição *</Label>
                    <Textarea id="description" name="description" required />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Registrar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default CRMSystem;