import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  MessageSquare, 
  Ticket, 
  FileText,
  Package,
  TrendingUp,
  DollarSign,
  Star,
  Settings
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from '@/components/ui/sonner';

const CustomerDashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [couponsUsed, setCouponsUsed] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (user) {
      fetchUserData();
    }
  }, [user, loading, navigate]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setProfile(profileData);

      // Show welcome notification
      const userName = profileData?.full_name || user.email?.split('@')[0];
      toast.success(`Olá, ${userName}! 👋`, {
        description: 'Bem-vindo ao seu painel',
      });

      // Fetch orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      setOrders(ordersData || []);

      // Fetch tickets (using support_tickets table)
      const { data: ticketsData } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      setTickets(ticketsData || []);

      // Coupon usages - skip if table doesn't exist
      setCouponsUsed([]);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const dashboardCards = [
    {
      title: 'Meus Produtos',
      description: 'Acessar produtos digitais adquiridos',
      icon: Package,
      link: '/meus-produtos',
      color: 'bg-primary',
      stats: `${orders.filter(o => o.status === 'confirmed').length} produtos`
    },
    {
      title: 'Meus Pedidos',
      description: 'Visualizar histórico de pedidos',
      icon: ShoppingCart,
      link: '/meus-pedidos',
      color: 'bg-blue-500',
      stats: `${orders.length} pedidos`
    },
    {
      title: 'Meus Tickets',
      description: 'Suporte e atendimento',
      icon: MessageSquare,
      link: '/customer/tickets',
      color: 'bg-orange-500',
      stats: `${tickets.length} tickets`
    },
    {
      title: 'Configurações',
      description: 'Segurança e preferências',
      icon: Settings,
      link: '/customer/settings',
      color: 'bg-purple-500',
      stats: 'Gerenciar'
    }
  ];

  const quickStats = [
    {
      title: 'Total Gasto',
      value: 'R$ 2.450',
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Pedidos Realizados',
      value: '12',
      icon: Package,
      color: 'text-blue-600'
    },
    {
      title: 'Cupons Usados',
      value: '3',
      icon: Ticket,
      color: 'text-purple-600'
    },
    {
      title: 'Avaliação Média',
      value: '4.8',
      icon: Star,
      color: 'text-yellow-600'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Painel do Cliente
          </h1>
          <p className="text-muted-foreground">
            Bem-vindo, {profile?.full_name || user.email?.split('@')[0]}
          </p>
        </div>

        {/* Customer Profile Info */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nome Completo</p>
                  <p className="text-foreground">{profile?.full_name || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-foreground">{profile?.email || user.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                  <p className="text-foreground">{profile?.phone || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">CPF</p>
                  <p className="text-foreground">{profile?.cpf || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data de Nascimento</p>
                  <p className="text-foreground">{profile?.birth_date || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">CEP</p>
                  <p className="text-foreground">{profile?.zip_code || 'Não informado'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Endereço</p>
                  <p className="text-foreground">
                    {profile?.address ? `${profile.address}, ${profile.city || ''} - ${profile.state || ''}` : 'Não informado'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Gasto</p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {orders.reduce((sum, order) => sum + (order.total_amount / 100), 0).toFixed(2)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted text-green-600">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pedidos Realizados</p>
                  <p className="text-2xl font-bold text-foreground">{orders.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted text-blue-600">
                  <Package className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cupons Usados</p>
                  <p className="text-2xl font-bold text-foreground">{couponsUsed.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted text-purple-600">
                  <Ticket className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
            </Card>


          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tickets Abertos</p>
                  <p className="text-2xl font-bold text-foreground">
                    {tickets.filter(t => t.status !== 'closed').length}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted text-orange-600">
                  <MessageSquare className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardCards.map((card, index) => (
            <Card key={index} className="group hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${card.color} text-white`}>
                    <card.icon className="h-6 w-6" />
                  </div>
                  <Badge variant="outline">{card.stats}</Badge>
                </div>
                <CardTitle className="text-lg">{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to={card.link}>
                    Acessar
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CustomerDashboard;
