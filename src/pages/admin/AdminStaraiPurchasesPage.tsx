import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  CreditCard,
  DollarSign,
  Users,
  Search,
  RefreshCw,
  Download,
  Calendar,
  Mail,
  User,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Purchase {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  amount_brl: number;
  payment_id: string | null;
  mercadopago_payment_id: string | null;
  payment_method: string | null;
  status: string;
  created_at: string;
}

export default function AdminNovaLinkPurchasesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAdminStatus();
  }, [user, navigate]);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      if (error) throw error;
      
      setIsAdmin(data || false);
      
      if (!data) {
        toast.error('Acesso negado');
        navigate('/');
        return;
      }
      
      loadPurchases();
    } catch (error) {
      console.error('Erro ao verificar admin:', error);
      navigate('/');
    } finally {
      setCheckingAdmin(false);
    }
  };

  const loadPurchases = async () => {
    try {
      setLoading(true);
      
      const response = await supabase.functions.invoke('starai-credits/purchases', {
        method: 'GET',
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        setPurchases(response.data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar compras:', error);
      toast.error('Erro ao carregar compras');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredPurchases = purchases.filter((purchase) => {
    const search = searchTerm.toLowerCase();
    return (
      purchase.user_email?.toLowerCase().includes(search) ||
      purchase.user_name?.toLowerCase().includes(search) ||
      purchase.payment_id?.toLowerCase().includes(search)
    );
  });

  const totalRevenue = purchases.reduce((acc, p) => acc + Number(p.amount_brl), 0);
  const uniqueCustomers = new Set(purchases.map((p) => p.user_id)).size;

  const exportToCSV = () => {
    const headers = ['Data', 'Cliente', 'Email', 'Valor', 'Método', 'Status', 'ID Pagamento'];
    const rows = filteredPurchases.map((p) => [
      formatDate(p.created_at),
      p.user_name || '-',
      p.user_email,
      formatCurrency(p.amount_brl),
      p.payment_method || '-',
      p.status,
      p.payment_id || '-',
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `novalink-compras-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Admin
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Compras NovaLink</h1>
              <p className="text-muted-foreground">
                Histórico de compras de créditos NovaLink
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadPurchases} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Receita Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Total de Compras
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{purchases.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Clientes Únicos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{uniqueCustomers}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email, nome ou ID do pagamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Purchases Table */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Compras</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredPurchases.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchTerm ? 'Nenhuma compra encontrada para esta busca' : 'Nenhuma compra registrada ainda'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Data
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Cliente
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Valor
                        </div>
                      </TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>ID Pagamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPurchases.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(purchase.created_at)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {purchase.user_name || '-'}
                        </TableCell>
                        <TableCell>{purchase.user_email}</TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(Number(purchase.amount_brl))}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {purchase.payment_method || 'mercadopago'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={purchase.status === 'approved' ? 'default' : 'secondary'}
                            className={purchase.status === 'approved' ? 'bg-green-500' : ''}
                          >
                            {purchase.status === 'approved' ? 'Aprovado' : purchase.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {purchase.payment_id || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}