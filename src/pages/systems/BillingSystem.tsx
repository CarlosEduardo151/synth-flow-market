import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DollarSign, UserPlus, CreditCard, Calendar, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface BillingClient {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  cpf_cnpj: string | null;
}

interface Invoice {
  id: string;
  client_id: string;
  amount: number;
  due_date: string;
  payment_method: string | null;
  status: string;
  paid_at: string | null;
  whatsapp_reminder_sent: boolean;
}

const BillingSystem = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customerProductId, setCustomerProductId] = useState<string | null>(null);
  const [clients, setClients] = useState<BillingClient[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isAddingInvoice, setIsAddingInvoice] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAccess();
  }, [user]);

  const checkAccess = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('customer_products')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_slug', 'gestao-cobrancas')
        .eq('is_active', true)
        .single();

      if (error || !data) {
        toast({
          title: "Acesso Negado",
          description: "Você precisa comprar o sistema de Gestão de Cobranças para acessar.",
          variant: "destructive"
        });
        navigate('/meus-produtos');
        return;
      }

      setCustomerProductId(data.id);
      await loadData(data.id);
    } catch (error) {
      console.error('Error checking access:', error);
      navigate('/meus-produtos');
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async (productId: string) => {
    const { data: clientsData } = await supabase
      .from('billing_clients')
      .select('*')
      .eq('customer_product_id', productId);

    if (clientsData) {
      setClients(clientsData);

      const clientIds = clientsData.map(c => c.id);
      if (clientIds.length > 0) {
        const { data: invoicesData } = await supabase
          .from('billing_invoices')
          .select('*')
          .in('client_id', clientIds)
          .order('due_date', { ascending: false });

        if (invoicesData) {
          setInvoices(invoicesData);
        }
      }
    }
  };

  const handleAddClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!customerProductId) return;

    const formData = new FormData(e.currentTarget);
    const { error } = await supabase.from('billing_clients').insert({
      customer_product_id: customerProductId,
      name: formData.get('name') as string,
      email: formData.get('email') as string || null,
      phone: formData.get('phone') as string,
      cpf_cnpj: formData.get('cpf_cnpj') as string || null
    });

    if (!error) {
      toast({ title: "Cliente adicionado com sucesso!" });
      setIsAddingClient(false);
      loadData(customerProductId);
    } else {
      toast({ title: "Erro ao adicionar cliente", variant: "destructive" });
    }
  };

  const handleAddInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const { error } = await supabase.from('billing_invoices').insert({
      client_id: formData.get('client_id') as string,
      amount: parseFloat(formData.get('amount') as string),
      due_date: formData.get('due_date') as string,
      payment_method: formData.get('payment_method') as string || null
    });

    if (!error) {
      toast({ title: "Cobrança criada com sucesso!" });
      setIsAddingInvoice(false);
      if (customerProductId) loadData(customerProductId);
    } else {
      toast({ title: "Erro ao criar cobrança", variant: "destructive" });
    }
  };

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || 'Cliente';
  };

  const getTotalPending = () => {
    return invoices
      .filter(inv => inv.status === 'pending')
      .reduce((sum, inv) => sum + inv.amount, 0);
  };

  const getTotalOverdue = () => {
    return invoices
      .filter(inv => inv.status === 'pending' && new Date(inv.due_date) < new Date())
      .reduce((sum, inv) => sum + inv.amount, 0);
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
              <DollarSign className="h-8 w-8 text-primary" />
              Gestão de Cobranças
            </h1>
            <p className="text-muted-foreground mt-2">Automatize cobranças e reduza inadimplência</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAddingClient} onOpenChange={setIsAddingClient}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Novo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleAddClient}>
                  <DialogHeader>
                    <DialogTitle>Adicionar Cliente</DialogTitle>
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
                      <Label htmlFor="phone">Telefone *</Label>
                      <Input id="phone" name="phone" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
                      <Input id="cpf_cnpj" name="cpf_cnpj" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Adicionar</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddingInvoice} onOpenChange={setIsAddingInvoice}>
              <DialogTrigger asChild>
                <Button>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Nova Cobrança
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleAddInvoice}>
                  <DialogHeader>
                    <DialogTitle>Criar Cobrança</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="client_id">Cliente *</Label>
                      <select
                        id="client_id"
                        name="client_id"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                        required
                      >
                        <option value="">Selecione...</option>
                        {clients.map(client => (
                          <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="amount">Valor *</Label>
                      <Input id="amount" name="amount" type="number" step="0.01" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="due_date">Vencimento *</Label>
                      <Input id="due_date" name="due_date" type="date" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="payment_method">Forma de Pagamento</Label>
                      <select
                        id="payment_method"
                        name="payment_method"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                      >
                        <option value="">Selecione...</option>
                        <option value="pix">PIX</option>
                        <option value="boleto">Boleto</option>
                        <option value="card">Cartão</option>
                      </select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Criar Cobrança</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Total Pendente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">
                R$ {getTotalPending().toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total em Atraso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                R$ {getTotalOverdue().toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total de Cobranças</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {invoices.length}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4">
          {invoices.map((invoice) => {
            const isOverdue = new Date(invoice.due_date) < new Date() && invoice.status === 'pending';
            return (
              <Card key={invoice.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {getClientName(invoice.client_id)}
                        <Badge variant={
                          invoice.status === 'paid' ? 'default' :
                          isOverdue ? 'destructive' : 'outline'
                        }>
                          {invoice.status === 'paid' ? 'Pago' : isOverdue ? 'Vencida' : 'Pendente'}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-2">
                        <Calendar className="h-4 w-4" />
                        Vencimento: {new Date(invoice.due_date).toLocaleDateString('pt-BR')}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        R$ {invoice.amount.toFixed(2)}
                      </div>
                      {invoice.payment_method && (
                        <Badge variant="outline" className="mt-2">
                          {invoice.payment_method.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {invoice.status === 'pending' && (
                    <Button variant="outline" className="w-full">
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Lembrete por WhatsApp
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BillingSystem;