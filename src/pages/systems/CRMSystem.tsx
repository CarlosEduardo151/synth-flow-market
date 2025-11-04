import { useEffect, useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, UserPlus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';

import { CRMDashboard } from '@/components/crm/CRMDashboard';
import { CRMClientsTable } from '@/components/crm/CRMClientsTable';
import { CRMOpportunities } from '@/components/crm/CRMOpportunities';
import { CRMIntegration } from '@/components/crm/CRMIntegration';
import { CRMMessages } from '@/components/crm/CRMMessages';

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
  const [customerProductId, setCustomerProductId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CRMCustomer[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CRMCustomer | null>(null);
  const [interactions, setInteractions] = useState<CRMInteraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CRMCustomer | null>(null);
  const [isAddingInteraction, setIsAddingInteraction] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAccess();
  }, [user, slug]);

  const checkAccess = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('customer_products')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_slug', 'crm-simples')
        .eq('is_active', true)
        .single();

      if (error || !data) {
        toast({
          title: "Acesso Negado",
          description: "Você precisa comprar o CRM para acessar este sistema.",
          variant: "destructive"
        });
        navigate('/meus-produtos');
        return;
      }

      setCustomerProductId(data.id);
      await loadCustomers(data.id);
      await loadOpportunities(data.id);
    } catch (error) {
      console.error('Error checking access:', error);
      navigate('/meus-produtos');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomers = async (productId: string) => {
    const { data, error } = await supabase
      .from('crm_customers')
      .select('*')
      .eq('customer_product_id', productId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCustomers(data);
    }
  };

  const loadOpportunities = async (productId: string) => {
    const { data: customersData } = await supabase
      .from('crm_customers')
      .select('id')
      .eq('customer_product_id', productId);

    if (customersData && customersData.length > 0) {
      const customerIds = customersData.map(c => c.id);
      const { data, error } = await supabase
        .from('crm_opportunities')
        .select('*')
        .in('customer_id', customerIds)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setOpportunities(data);
      }
    }
  };

  const refreshData = () => {
    if (customerProductId) {
      loadCustomers(customerProductId);
      loadOpportunities(customerProductId);
    }
  };

  const loadInteractions = async (customerId: string) => {
    const { data, error } = await supabase
      .from('crm_interactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setInteractions(data);
    }
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
      business_type: formData.get('business_type') as string || null,
      status: formData.get('status') as string || 'lead',
      notes: formData.get('notes') as string || null
    };

    let error;
    if (editingCustomer) {
      ({ error } = await supabase
        .from('crm_customers')
        .update(customerData)
        .eq('id', editingCustomer.id));
    } else {
      ({ error } = await supabase
        .from('crm_customers')
        .insert({ ...customerData, customer_product_id: customerProductId }));
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

    const { error } = await supabase
      .from('crm_customers')
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

    const formData = new FormData(e.currentTarget);
    const { error } = await supabase.from('crm_interactions').insert({
      customer_id: selectedCustomer.id,
      type: formData.get('type') as string,
      subject: formData.get('subject') as string || null,
      description: formData.get('description') as string
    });

    if (!error) {
      toast({ title: "Interação registrada!" });
      setIsAddingInteraction(false);
      loadInteractions(selectedCustomer.id);
    } else {
      toast({ title: "Erro ao registrar interação", variant: "destructive" });
    }
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              CRM - Gestão de Clientes Completa
            </h1>
            <p className="text-muted-foreground mt-2">Gerencie clientes, oportunidades e automações com IA</p>
          </div>
          <Button onClick={() => setIsAddingCustomer(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="clientes">Clientes</TabsTrigger>
            <TabsTrigger value="oportunidades">Oportunidades</TabsTrigger>
            <TabsTrigger value="mensagens">Mensagens</TabsTrigger>
            <TabsTrigger value="integracao">Integração IA</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <CRMDashboard customers={customers} opportunities={opportunities} />
          </TabsContent>

          <TabsContent value="clientes" className="space-y-4">
            <CRMClientsTable
              customers={customers}
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

        {selectedCustomer && (
          <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{selectedCustomer.name}</DialogTitle>
                <DialogDescription>Histórico de interações</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <Button onClick={() => setIsAddingInteraction(true)} className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Nova Interação
                </Button>
                {interactions.map((interaction) => (
                  <Card key={interaction.id}>
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                        {interaction.subject}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {new Date(interaction.created_at).toLocaleString('pt-BR')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{interaction.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {isAddingInteraction && selectedCustomer && (
          <Dialog open={isAddingInteraction} onOpenChange={setIsAddingInteraction}>
            <DialogContent>
              <form onSubmit={handleAddInteraction}>
                <DialogHeader>
                  <DialogTitle>Nova Interação</DialogTitle>
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