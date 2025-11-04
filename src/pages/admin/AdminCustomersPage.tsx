import { useAuth, useAdminCheck } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Eye, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  cpf: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  birth_date: string;
  role: string;
  created_at: string;
  profile_photo_url: string;
}

interface CustomerDetails extends Customer {
  orders_count: number;
  total_spent: number;
  last_order_date: string;
}

export default function AdminCustomersPage() {
  const { user, loading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetails | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    
    if (!adminLoading && !isAdmin) {
      navigate('/');
      return;
    }
  }, [user, loading, isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchCustomers();
    }
  }, [isAdmin]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os clientes.",
        variant: "destructive",
      });
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchCustomerDetails = async (customerId: string) => {
    try {
      // Get customer profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', customerId)
        .single();

      if (profileError) throw profileError;

      // Get customer orders statistics
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .eq('user_id', profile.user_id);

      if (ordersError) throw ordersError;

      const ordersCount = orders?.length || 0;
      const totalSpent = orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const lastOrderDate = orders && orders.length > 0 
        ? orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
        : null;

      setSelectedCustomer({
        ...profile,
        orders_count: ordersCount,
        total_spent: totalSpent,
        last_order_date: lastOrderDate
      });
    } catch (error) {
      console.error('Error fetching customer details:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes do cliente.",
        variant: "destructive",
      });
    }
  };

  const openCustomerDialog = async (customer: Customer) => {
    await fetchCustomerDetails(customer.id);
    setIsDialogOpen(true);
  };

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Painel
          </Button>
          <h1 className="text-3xl font-bold">Gerenciar Clientes</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Clientes Registrados</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCustomers ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : customers.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum cliente encontrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Data de Cadastro</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {customer.profile_photo_url ? (
                            <img 
                              src={customer.profile_photo_url} 
                              alt={customer.full_name || 'Cliente'}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              {(customer.full_name || customer.email)?.[0]?.toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{customer.full_name || 'Nome não informado'}</div>
                            {customer.cpf && (
                              <div className="text-sm text-muted-foreground">CPF: {customer.cpf}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.phone || 'Não informado'}</TableCell>
                      <TableCell>
                        {customer.city && customer.state ? `${customer.city}, ${customer.state}` : 'Não informado'}
                      </TableCell>
                      <TableCell>
                        {new Date(customer.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openCustomerDialog(customer)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Ver Detalhes
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Detalhes do Cliente</DialogTitle>
                            </DialogHeader>
                            {selectedCustomer && (
                              <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                  {selectedCustomer.profile_photo_url ? (
                                    <img 
                                      src={selectedCustomer.profile_photo_url} 
                                      alt={selectedCustomer.full_name || 'Cliente'}
                                      className="w-16 h-16 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl font-medium">
                                      {(selectedCustomer.full_name || selectedCustomer.email)?.[0]?.toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <h3 className="text-xl font-semibold">
                                      {selectedCustomer.full_name || 'Nome não informado'}
                                    </h3>
                                    <Badge variant="outline">{selectedCustomer.role}</Badge>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <Card>
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-sm">Informações de Contato</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm">{selectedCustomer.email}</span>
                                      </div>
                                      {selectedCustomer.phone && (
                                        <div className="flex items-center gap-2">
                                          <Phone className="w-4 h-4 text-muted-foreground" />
                                          <span className="text-sm">{selectedCustomer.phone}</span>
                                        </div>
                                      )}
                                      {selectedCustomer.cpf && (
                                        <div className="text-sm">
                                          <span className="font-medium">CPF:</span> {selectedCustomer.cpf}
                                        </div>
                                      )}
                                      {selectedCustomer.birth_date && (
                                        <div className="flex items-center gap-2">
                                          <Calendar className="w-4 h-4 text-muted-foreground" />
                                          <span className="text-sm">
                                            {new Date(selectedCustomer.birth_date).toLocaleDateString('pt-BR')}
                                          </span>
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>

                                  <Card>
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-sm">Endereço</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      {selectedCustomer.address ? (
                                        <div className="flex items-start gap-2">
                                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                                          <div className="text-sm">
                                            <div>{selectedCustomer.address}</div>
                                            <div>
                                              {selectedCustomer.city}, {selectedCustomer.state}
                                            </div>
                                            <div>CEP: {selectedCustomer.zip_code}</div>
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">Endereço não informado</span>
                                      )}
                                    </CardContent>
                                  </Card>
                                </div>

                                <Card>
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">Estatísticas de Compras</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                      <div>
                                        <div className="text-2xl font-bold text-primary">
                                          {selectedCustomer.orders_count}
                                        </div>
                                        <div className="text-sm text-muted-foreground">Pedidos</div>
                                      </div>
                                      <div>
                                        <div className="text-2xl font-bold text-primary">
                                          R$ {(selectedCustomer.total_spent / 100).toFixed(2)}
                                        </div>
                                        <div className="text-sm text-muted-foreground">Total Gasto</div>
                                      </div>
                                      <div>
                                        <div className="text-2xl font-bold text-primary">
                                          {selectedCustomer.last_order_date 
                                            ? new Date(selectedCustomer.last_order_date).toLocaleDateString('pt-BR')
                                            : 'Nunca'
                                          }
                                        </div>
                                        <div className="text-sm text-muted-foreground">Último Pedido</div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}