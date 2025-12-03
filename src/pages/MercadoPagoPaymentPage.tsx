import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { paymentService } from '@/services/paymentService';
import { usePaymentProducts } from '@/hooks/usePaymentProducts';
import { Loader2, CreditCard, ExternalLink } from 'lucide-react';

export default function MercadoPagoPaymentPage() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentLink, setPaymentLink] = useState<string>('');
  const [orderData, setOrderData] = useState<any>(null);
  const { syncProductFromCart } = usePaymentProducts();

  useEffect(() => {
    if (!user || !orderId) {
      navigate('/auth');
      return;
    }
    
    initializePayment();
  }, [orderId, user]);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const initializePayment = async () => {
    try {
      setLoading(true);

      // Buscar dados do pedido
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      setOrderData(order);

      // Sincronizar produtos com o nodejs-payment-system
      const paymentItems = [];
      for (const item of order.order_items) {
        const productId = await syncProductFromCart({
          title: item.product_title,
          slug: item.product_slug,
          price: item.product_price,
        });

        if (productId) {
          paymentItems.push({
            product_id: productId,
            quantity: item.quantity,
          });
        }
      }

      // Criar pagamento no Mercado Pago
      const result = await paymentService.createAutomaticPayment({
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone || '',
        items: paymentItems,
        payment_type: 'automatic',
        success_url: `${window.location.origin}/order-success/${orderId}`,
        failure_url: `${window.location.origin}/checkout`,
        pending_url: `${window.location.origin}/order-success/${orderId}`,
      });

      if (result.success && result.data?.payment_link) {
        setPaymentLink(result.data.payment_link);
        
        // Atualizar pedido com preference_id
        await supabase
          .from('orders')
          .update({
            payment_method: 'mercadopago',
          })
          .eq('id', orderId);
      } else {
        throw new Error(result.message || 'Erro ao criar pagamento');
      }
    } catch (error: any) {
      console.error('Erro ao inicializar pagamento:', error);
      
      const isConnectionError = error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION_REFUSED');
      
      toast({
        title: 'Erro ao processar pagamento',
        description: isConnectionError 
          ? 'Não foi possível conectar ao servidor de pagamentos. Verifique se o nodejs-payment-system está rodando.'
          : error.message || 'Erro desconhecido',
        variant: 'destructive',
      });
      
      // Não redirecionar imediatamente em caso de erro de conexão
      if (!isConnectionError) {
        navigate('/checkout');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayment = () => {
    if (paymentLink) {
      window.open(paymentLink, '_blank');
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Pagamento Mercado Pago
            </h1>
            <p className="text-muted-foreground text-lg">
              Complete seu pagamento de forma rápida e segura
            </p>
          </div>

          {loading ? (
            <Card className="shadow-lg">
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">Preparando pagamento...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card className="shadow-lg border-primary/20">
                <CardHeader className="bg-primary/5">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-6 h-6" />
                    Detalhes do Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {orderData && (
                    <>
                      <div className="flex justify-between items-center pb-4 border-b">
                        <span className="text-muted-foreground">Total a pagar:</span>
                        <span className="text-2xl font-bold text-primary">
                          {formatPrice(orderData.total_amount)}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Cliente: <strong>{orderData.customer_name}</strong>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Email: <strong>{orderData.customer_email}</strong>
                        </p>
                      </div>
                    </>
                  )}

                  <div className="bg-accent/50 p-4 rounded-lg space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      Métodos de Pagamento Disponíveis
                    </h3>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>✓ Cartão de crédito (em até 12x)</li>
                      <li>✓ Cartão de débito</li>
                      <li>✓ PIX via Mercado Pago</li>
                      <li>✓ Boleto bancário</li>
                    </ul>
                  </div>

                  <Button 
                    onClick={handleOpenPayment}
                    className="w-full h-12 text-base font-semibold"
                    size="lg"
                  >
                    <ExternalLink className="w-5 h-5 mr-2" />
                    Abrir Mercado Pago
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Você será redirecionado para o ambiente seguro do Mercado Pago
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-lg bg-blue-50/50 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-blue-900 mb-1">Pagamento Seguro</h3>
                      <p className="text-xs text-blue-700">
                        Seu pagamento é processado de forma segura pelo Mercado Pago. 
                        Após a confirmação, você receberá acesso aos produtos.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
