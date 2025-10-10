import { useAuth, useAdminCheck } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminStats } from '@/hooks/useAdminStats';
import { useRentalStats } from '@/hooks/useRentalStats';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  MessageSquare, 
  Package, 
  FolderOpen, 
  Ticket, 
  Users, 
  Settings,
  Star,
  TrendingUp,
  DollarSign,
  CheckCircle,
  Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const { stats } = useAdminStats();
  const { stats: rentalStats } = useRentalStats();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isAdmin) {
        navigate('/');
      }
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

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

  const dashboardCards = [
    {
      title: 'Pedidos',
      description: 'Gerenciar pedidos e comprovantes',
      icon: ShoppingCart,
      link: '/admin/orders',
      color: 'bg-blue-500',
      stats: `${stats.pendingOrdersCount} pendentes`
    },
    {
      title: 'Tickets',
      description: 'Sistema de suporte ao cliente',
      icon: MessageSquare,
      link: '/admin/tickets',
      color: 'bg-green-500',
      stats: `${stats.openTicketsCount} abertos`
    },
    {
      title: 'Clientes',
      description: 'Gerenciar clientes',
      icon: Users,
      link: '/admin/customers',
      color: 'bg-indigo-500',
      stats: `${stats.totalCustomers} registrados`
    },
    {
      title: 'Avaliações',
      description: 'Gerenciar avaliações dos clientes',
      icon: Star,
      link: '/admin/reviews',
      color: 'bg-yellow-500',
      stats: `${stats.totalReviews} avaliações`
    },
    {
      title: 'Aluguéis',
      description: 'Gerenciar aluguéis de produtos',
      icon: Calendar,
      link: '/admin/rentals',
      color: 'bg-purple-500',
      stats: `${rentalStats.activeRentals} ativos`
    },
    {
      title: 'Parcelas',
      description: 'Gerenciar parcelas de pagamento',
      icon: DollarSign,
      link: '/admin/installments',
      color: 'bg-orange-500',
      stats: 'Ver todas'
    }
  ];

  const quickStats = [
    {
      title: 'Vendas do Mês',
      value: `R$ ${(stats.monthlyRevenue / 100).toFixed(2)}`,
      icon: DollarSign,
      trend: stats.loading ? '...' : '+12%',
      color: 'text-green-600'
    },
    {
      title: 'Pedidos Hoje',
      value: stats.loading ? '...' : stats.todayOrders.toString(),
      icon: ShoppingCart,
      trend: stats.loading ? '...' : '+' + stats.todayOrders,
      color: 'text-blue-600'
    },
    {
      title: 'Taxa de Conversão',
      value: stats.loading ? '...' : `${stats.conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      trend: stats.loading ? '...' : `+${stats.conversionRate.toFixed(1)}%`,
      color: 'text-purple-600'
    },
    {
      title: 'Pedidos Aprovados',
      value: stats.loading ? '...' : `${stats.approvedOrdersRate.toFixed(1)}%`,
      icon: CheckCircle,
      trend: stats.loading ? '...' : `+${stats.approvedOrdersRate.toFixed(1)}%`,
      color: 'text-green-600'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Painel do Administrador
          </h1>
          <p className="text-muted-foreground">
            Bem-vindo ao painel de controle da sua loja
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-foreground">
                        {stat.value}
                      </p>
                      <Badge variant="secondary" className={stat.color}>
                        {stat.trend}
                      </Badge>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg bg-muted ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {dashboardCards.map((card, index) => (
            <Card key={index} className="group hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${card.color} text-white`}>
                    <card.icon className="h-6 w-6" />
                  </div>
                  {card.stats && (
                    <Badge variant="outline">{card.stats}</Badge>
                  )}
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

export default AdminDashboard;