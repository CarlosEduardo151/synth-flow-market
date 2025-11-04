import { useAuth, useAdminCheck } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRentalStats } from '@/hooks/useRentalStats';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar, DollarSign, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface CustomerProduct {
  id: string;
  user_id: string;
  product_slug: string;
  product_title: string;
  rental_start_date: string | null;
  rental_end_date: string | null;
  monthly_rental_price: number | null;
  rental_payment_status: string | null;
  auto_renew: boolean | null;
  is_active: boolean;
  customer_name?: string;
  customer_email?: string;
}

const AdminRentalsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const { stats, refetchStats } = useRentalStats();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rentals, setRentals] = useState<CustomerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'expiring' | 'expired'>('all');

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isAdmin) {
        navigate('/');
      }
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchRentals();
    }
  }, [user, isAdmin]);

  const fetchRentals = async () => {
    try {
      setLoading(true);
      const { data: rentalData, error } = await supabase
        .from('customer_products')
        .select('*')
        .eq('acquisition_type', 'rental')
        .order('rental_end_date', { ascending: true });

      if (error) throw error;

      // Buscar os perfis dos usuários
      const userIds = rentalData?.map(r => r.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      // Combinar os dados
      const rentalsWithProfiles = rentalData?.map(rental => {
        const profile = profiles?.find(p => p.user_id === rental.user_id);
        return {
          ...rental,
          customer_name: profile?.full_name || 'N/A',
          customer_email: profile?.email || 'N/A',
        };
      });

      setRentals(rentalsWithProfiles || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar aluguéis',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async (rentalId: string) => {
    try {
      const rental = rentals.find(r => r.id === rentalId);
      if (!rental || !rental.rental_end_date) return;

      const newEndDate = new Date(rental.rental_end_date);
      newEndDate.setMonth(newEndDate.getMonth() + 1);

      const { error } = await supabase
        .from('customer_products')
        .update({
          rental_end_date: newEndDate.toISOString(),
          rental_payment_status: 'active',
        })
        .eq('id', rentalId);

      if (error) throw error;

      toast({
        title: 'Aluguel renovado!',
        description: 'O período foi estendido por mais 1 mês.',
      });

      fetchRentals();
      refetchStats();
    } catch (error: any) {
      toast({
        title: 'Erro ao renovar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCancel = async (rentalId: string) => {
    try {
      const { error } = await supabase
        .from('customer_products')
        .update({
          is_active: false,
          rental_payment_status: 'cancelled',
        })
        .eq('id', rentalId);

      if (error) throw error;

      toast({
        title: 'Aluguel cancelado',
        description: 'O acesso do cliente foi revogado.',
      });

      fetchRentals();
      refetchStats();
    } catch (error: any) {
      toast({
        title: 'Erro ao cancelar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (rental: CustomerProduct) => {
    if (!rental.is_active) {
      return <Badge variant="destructive">Cancelado</Badge>;
    }

    if (!rental.rental_end_date) {
      return <Badge variant="secondary">Sem data</Badge>;
    }

    const now = new Date();
    const endDate = new Date(rental.rental_end_date);
    const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive">Vencido</Badge>;
    } else if (daysUntilExpiry <= 7) {
      return <Badge className="bg-yellow-500">Vence em {daysUntilExpiry}d</Badge>;
    } else {
      return <Badge variant="default">Ativo</Badge>;
    }
  };

  const filteredRentals = rentals.filter(rental => {
    if (filter === 'all') return true;
    
    if (filter === 'active') {
      if (!rental.is_active || !rental.rental_end_date) return false;
      const endDate = new Date(rental.rental_end_date);
      const daysUntilExpiry = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry > 7;
    }
    
    if (filter === 'expiring') {
      if (!rental.is_active || !rental.rental_end_date) return false;
      const endDate = new Date(rental.rental_end_date);
      const daysUntilExpiry = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
    }
    
    if (filter === 'expired') {
      if (!rental.rental_end_date) return false;
      const endDate = new Date(rental.rental_end_date);
      return endDate < new Date() || !rental.is_active;
    }
    
    return true;
  });

  if (authLoading || adminLoading) {
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Gestão de Aluguéis
          </h1>
          <p className="text-muted-foreground">
            Controle e gerencie todos os aluguéis de produtos
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Aluguéis Ativos</p>
                  <p className="text-2xl font-bold text-foreground">{stats.activeRentals}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Vencem em 7 dias</p>
                  <p className="text-2xl font-bold text-foreground">{stats.expiringSoon}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Vencidos</p>
                  <p className="text-2xl font-bold text-foreground">{stats.expired}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Receita Mensal</p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {(stats.totalMonthlyRevenue / 100).toFixed(2)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
              >
                Todos
              </Button>
              <Button
                variant={filter === 'active' ? 'default' : 'outline'}
                onClick={() => setFilter('active')}
              >
                Ativos
              </Button>
              <Button
                variant={filter === 'expiring' ? 'default' : 'outline'}
                onClick={() => setFilter('expiring')}
              >
                Vencendo em breve
              </Button>
              <Button
                variant={filter === 'expired' ? 'default' : 'outline'}
                onClick={() => setFilter('expired')}
              >
                Vencidos
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Rentals Table */}
        <Card>
          <CardHeader>
            <CardTitle>Aluguéis ({filteredRentals.length})</CardTitle>
            <CardDescription>Lista de todos os aluguéis filtrados</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Valor Mensal</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Auto-renovar</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRentals.map((rental) => (
                    <TableRow key={rental.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{rental.customer_name}</p>
                          <p className="text-sm text-muted-foreground">{rental.customer_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{rental.product_title}</TableCell>
                      <TableCell>
                        R$ {rental.monthly_rental_price ? (rental.monthly_rental_price / 100).toFixed(2) : '0.00'}
                      </TableCell>
                      <TableCell>
                        {rental.rental_start_date
                          ? new Date(rental.rental_start_date).toLocaleDateString('pt-BR')
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {rental.rental_end_date
                          ? new Date(rental.rental_end_date).toLocaleDateString('pt-BR')
                          : 'N/A'}
                      </TableCell>
                      <TableCell>{getStatusBadge(rental)}</TableCell>
                      <TableCell>
                        {rental.auto_renew ? (
                          <Badge variant="default">Sim</Badge>
                        ) : (
                          <Badge variant="outline">Não</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRenew(rental.id)}
                            disabled={!rental.is_active}
                          >
                            Renovar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCancel(rental.id)}
                            disabled={!rental.is_active}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRentals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhum aluguel encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default AdminRentalsPage;
