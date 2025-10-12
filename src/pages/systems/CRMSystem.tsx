import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, UserPlus, Phone, Mail, Building2, Tag, Calendar, MessageSquare, TrendingUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
  const [selectedCustomer, setSelectedCustomer] = useState<CRMCustomer | null>(null);
  const [interactions, setInteractions] = useState<CRMInteraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
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

  const handleAddCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!customerProductId) return;

    const formData = new FormData(e.currentTarget);
    const { error } = await supabase.from('crm_customers').insert({
      customer_product_id: customerProductId,
      name: formData.get('name') as string,
      email: formData.get('email') as string || null,
      phone: formData.get('phone') as string || null,
      company: formData.get('company') as string || null,
      business_type: formData.get('business_type') as string || null,
      status: formData.get('status') as string || 'lead',
      notes: formData.get('notes') as string || null
    });

    if (!error) {
      toast({ title: "Cliente adicionado com sucesso!" });
      setIsAddingCustomer(false);
      loadCustomers(customerProductId);
    } else {
      toast({ title: "Erro ao adicionar cliente", variant: "destructive" });
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
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              CRM - Gestão de Clientes
            </h1>
            <p className="text-muted-foreground mt-2">Gerencie seus clientes e oportunidades de negócio</p>
          </div>
          <Dialog open={isAddingCustomer} onOpenChange={setIsAddingCustomer}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <form onSubmit={handleAddCustomer}>
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Cliente</DialogTitle>
                  <DialogDescription>Preencha as informações do cliente</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input id="name" name="name" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" name="phone" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="company">Empresa</Label>
                    <Input id="company" name="company" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="business_type">Tipo de Negócio</Label>
                    <Input id="business_type" name="business_type" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue="lead">
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
                    <Textarea id="notes" name="notes" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Adicionar Cliente</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="clientes" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="clientes">Clientes</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          </TabsList>

          <TabsContent value="clientes" className="space-y-4">
            <div className="grid gap-4">
              {customers.map((customer) => (
                <Card key={customer.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => {
                  setSelectedCustomer(customer);
                  loadInteractions(customer.id);
                }}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {customer.name}
                          <Badge variant={
                            customer.status === 'customer' ? 'default' :
                            customer.status === 'prospect' ? 'secondary' :
                            customer.status === 'lead' ? 'outline' : 'destructive'
                          }>
                            {customer.status}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-2 space-y-1">
                          {customer.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4" />{customer.email}</div>}
                          {customer.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4" />{customer.phone}</div>}
                          {customer.company && <div className="flex items-center gap-2"><Building2 className="h-4 w-4" />{customer.company}</div>}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          R$ {customer.total_purchases.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">Total em compras</div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="dashboard">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Total de Clientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{customers.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Clientes Ativos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {customers.filter(c => c.status === 'customer').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Leads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {customers.filter(c => c.status === 'lead').length}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

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
                        <Badge>{interaction.type}</Badge>
                        {interaction.subject}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
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