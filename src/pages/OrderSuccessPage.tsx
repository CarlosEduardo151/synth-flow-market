import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

interface Order {
  id: string;
  total_amount: number;
  customer_name: string;
  customer_email: string;
  status: string;
  created_at: string;
}

export default function OrderSuccessPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (!error && data) {
        setOrder(data);
      }
      setLoading(false);
    };

    fetchOrder();
  }, [orderId]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price / 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p>Carregando...</p>
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
        <div className="max-w-2xl mx-auto text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-6" />
          
          <h1 className="text-3xl font-bold mb-4">Pedido Confirmado!</h1>
          
          <p className="text-muted-foreground mb-8">
            Obrigado pela sua compra. Você receberá as instruções de pagamento e entrega por email.
          </p>

          {order && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Detalhes do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Número do pedido:</span>
                  <span className="font-mono">{order.id.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cliente:</span>
                  <span>{order.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span>{order.customer_email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-bold text-primary">
                    {formatPrice(order.total_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="capitalize">{order.status}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-x-4">
            <Button asChild>
              <Link to="/">Continuar comprando</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/meus-pedidos">Ver meus pedidos</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}