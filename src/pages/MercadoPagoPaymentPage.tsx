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
import { Loader2, CreditCard } from 'lucide-react';

export default function MercadoPagoPaymentPage() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pixData, setPixData] = useState<{
    txid: string;
    copia_e_cola: string;
    qrcode_image: string | null;
    qrcode_text: string;
  } | null>(null);
  const [paymentId, setPaymentId] = useState<string>('');
  const [orderData, setOrderData] = useState<any>(null);
  const { syncProductFromCart } = usePaymentProducts();

  useEffect(() => {
    if (!user || !orderId) {
      navigate('/auth');
      return;
    }
    initializePayment();
  }, [orderId, user]);

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  const initializePayment = async () => {
    try {
      setLoading(true);

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`*, order_items (*)`)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      setOrderData(order);

      const paymentItems = [];
      for (const item of order.order_items) {
        const productId = await syncProductFromCart({
          title: (item as any).product_name || item.product_slug,
          slug: item.product_slug,
          price: (item as any).unit_price,
        });
        if (productId) {
          paymentItems.push({ product_id: productId, quantity: (item as any).quantity || 1 });
        }
      }

      const pixKey = (import.meta as any).env.VITE_EFI_PIX_KEY || '';
      if (!pixKey) {
        throw new Error('Chave PIX recebedora não configurada (VITE_EFI_PIX_KEY no .env).');
      }

      const result = await paymentService.createEfiPixPayment({
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone || '',
        items: paymentItems,
        payment_type: 'efi',
        pix_key: pixKey,
      });

      if (result.success && result.data?.pix) {
        setPixData(result.data.pix);
        setPaymentId(result.data.payment_id);
        await supabase.from('orders').update({ payment_method: 'pix_efi' }).eq('id', orderId);
      } else {
        throw new Error(result.message || 'Erro ao criar pagamento PIX');
      }
    } catch (error: any) {
      console.error('Erro ao inicializar pagamento:', error);
      toast({
        title: 'Erro ao processar pagamento',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (pixData?.copia_e_cola) {
      navigator.clipboard.writeText(pixData.copia_e_cola);
      toast({ title: 'Código PIX copiado!' });
    }
  };

  const handleCheckStatus = async () => {
    if (!pixData?.txid) return;
    try {
      const res = await paymentService.checkEfiPayment(pixData.txid, paymentId);
      if (res.status === 'paid') {
        toast({ title: 'Pagamento confirmado!' });
        navigate(`/order-success/${orderId}`);
      } else {
        toast({ title: 'Aguardando pagamento', description: `Status: ${res.efi_status}` });
      }
    } catch (e: any) {
      toast({ title: 'Erro ao verificar', description: e.message, variant: 'destructive' });
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
              Pagamento PIX — Efí Bank
            </h1>
            <p className="text-muted-foreground text-lg">
              Escaneie o QR Code ou copie o código PIX para pagar
            </p>
          </div>

          {loading ? (
            <Card className="shadow-lg">
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">Gerando cobrança PIX...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-lg border-primary/20">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-6 h-6" />
                  Pague com PIX
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {orderData && (
                  <div className="flex justify-between items-center pb-4 border-b">
                    <span className="text-muted-foreground">Total a pagar:</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatPrice(orderData.total_amount)}
                    </span>
                  </div>
                )}

                {pixData?.qrcode_image && (
                  <div className="flex justify-center bg-white p-4 rounded-lg">
                    <img src={pixData.qrcode_image} alt="QR Code PIX" className="w-64 h-64" />
                  </div>
                )}

                {pixData?.copia_e_cola && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">PIX Copia e Cola</label>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={pixData.copia_e_cola}
                        className="flex-1 px-3 py-2 border rounded-md bg-muted text-xs font-mono"
                      />
                      <Button onClick={handleCopy} variant="outline">Copiar</Button>
                    </div>
                  </div>
                )}

                <Button onClick={handleCheckStatus} className="w-full h-12" size="lg">
                  Já paguei — Verificar status
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Ambiente de homologação Efí Bank · txid: {pixData?.txid}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
