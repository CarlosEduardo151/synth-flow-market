import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface OrderItem {
  id: string;
  product_slug: string;
  product_name?: string;
  unit_price: number;
  quantity: number;
}

interface Order {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  customer_name: string;
  order_items?: OrderItem[];
}

// Mapeamento de slugs para rotas do sistema
const systemRoutes: Record<string, string> = {
  'crm-simples': '/sistema/crm-simples',
  'dashboards-personalizados': '/sistema/dashboards-personalizados',
  'gestao-cobrancas': '/sistema/gestao-cobrancas',
  'posts-sociais': '/sistema/posts-sociais',
  'relatorios-financeiros': '/sistema/relatorios-financeiros',
  'fidelidade-digital': '/sistema/fidelidade-digital',
  'assistente-vendas': '/sistema/assistente-vendas',
  'bots-automacao': '/sistema/bots-automacao',
  'agente-financeiro': '/sistema/agente-financeiro',
  'agente-rh': '/sistema/agente-rh',
};

export default function MyOrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_slug,
            unit_price,
            quantity
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setOrders(data as any);
      }
      setLoading(false);
    };

    fetchOrders();
  }, [user, navigate]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price / 100);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'confirmed': return 'default';
      case 'processing': return 'outline';
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'confirmed': return 'Confirmado';
      case 'processing': return 'Processando';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const toggleOrder = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const getSystemRoute = (productSlug: string): string | null => {
    return systemRoutes[productSlug] || null;
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p>Carregando seus pedidos...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Meus Pedidos</h1>

          {orders.length === 0 ? (
            <div className="text-center py-16">
              <h2 className="text-xl font-semibold mb-4">Nenhum pedido encontrado</h2>
              <p className="text-muted-foreground mb-6">
                Você ainda não fez nenhum pedido.
              </p>
              <Button asChild>
                <Link to="/">Começar a comprar</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Collapsible 
                  key={order.id} 
                  open={expandedOrders.has(order.id)}
                  onOpenChange={() => toggleOrder(order.id)}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            Pedido #{order.id.slice(0, 8)}
                          </CardTitle>
                          <p className="text-muted-foreground">
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                        <Badge variant={getStatusColor(order.status)}>
                          {getStatusText(order.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-lg">
                            {formatPrice(order.total_amount)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Cliente: {order.customer_name}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <CollapsibleTrigger asChild>
                            <Button variant="outline" size="sm">
                              {expandedOrders.has(order.id) ? (
                                <>
                                  <ChevronUp className="h-4 w-4 mr-1" />
                                  Fechar
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4 mr-1" />
                                  Ver detalhes
                                </>
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                      </div>

                      <CollapsibleContent className="space-y-3">
                        <div className="border-t pt-4">
                          <h4 className="font-medium mb-3">Produtos do pedido:</h4>
                          <div className="space-y-2">
                            {order.order_items?.map((item) => {
                              const systemRoute = getSystemRoute(item.product_slug);
                              return (
                                <div 
                                  key={item.id} 
                                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                >
                                  <div>
                                    <p className="font-medium">{item.product_name || item.product_slug}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {formatPrice(item.unit_price)} x {item.quantity}
                                    </p>
                                  </div>
                                  {systemRoute && order.status === 'completed' && (
                                    <Button asChild size="sm" variant="default">
                                      <Link to={systemRoute}>
                                        <ExternalLink className="h-4 w-4 mr-1" />
                                        Acessar Sistema
                                      </Link>
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/order-success/${order.id}`}>
                              Ver página do pedido
                            </Link>
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </CardContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
