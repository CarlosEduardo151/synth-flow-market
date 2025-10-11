import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price / 100);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth');
      return;
    }

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: total,
          customer_name: formData.get('name') as string,
          customer_email: formData.get('email') as string,
          customer_phone: formData.get('phone') as string,
          payment_method: 'PIX',
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_slug: item.slug,
        product_title: item.title,
        product_price: item.price,
        quantity: item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Create customer products and credentials
      for (const item of items) {
        const isRental = item.acquisitionType === 'rental';
        const rentalMonths = item.rentalMonths || 1;
        
        // Create customer product
        const customerProductData: any = {
          user_id: user.id,
          order_id: order.id,
          product_slug: item.slug,
          product_title: item.title,
          acquisition_type: item.acquisitionType,
          is_active: true,
        };

        if (isRental) {
          const startDate = new Date();
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + rentalMonths);
          
          customerProductData.rental_start_date = startDate.toISOString();
          customerProductData.rental_end_date = endDate.toISOString();
          customerProductData.monthly_rental_price = item.price;
          customerProductData.rental_payment_status = 'active';
          customerProductData.auto_renew = false;
        }

        const { data: customerProduct, error: cpError } = await supabase
          .from('customer_products')
          .insert(customerProductData)
          .select()
          .single();

        if (cpError) throw cpError;

        // Fetch required credentials for the product
        const { data: requiredCreds, error: reqCredsError } = await supabase
          .from('product_required_credentials')
          .select('*')
          .eq('product_slug', item.slug);

        if (reqCredsError) throw reqCredsError;

        // Create credentials for the product
        if (requiredCreds && requiredCreds.length > 0) {
          const credentialsToInsert = requiredCreds.map(reqCred => ({
            customer_product_id: customerProduct.id,
            credential_type: reqCred.credential_type,
            credential_name: reqCred.credential_name,
            n8n_doc_url: reqCred.n8n_doc_url,
            is_system_generated: !isRental, // Auto-generate for purchases
            credential_value: !isRental ? `AUTO_GENERATED_${Date.now()}` : null,
          }));

          const { error: credsError } = await supabase
            .from('product_credentials')
            .insert(credentialsToInsert);

          if (credsError) throw credsError;
        }
      }

      clearCart();
      toast({
        title: "Pedido criado com sucesso!",
        description: "Você receberá instruções de pagamento por email.",
      });
      
      navigate(`/pix-payment/${order.id}`);
    } catch (error: any) {
      toast({
        title: "Erro ao processar pedido",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Finalizar Compra
            </h1>
            <p className="text-muted-foreground text-lg">
              Preencha seus dados para continuar com o pagamento
            </p>
          </div>
          
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Formulário - 3 colunas */}
            <div className="lg:col-span-3">
              <Card className="shadow-lg border-primary/20">
                <CardHeader className="bg-primary/5">
                  <CardTitle className="text-xl">Informações do Pedido</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Preencha os dados abaixo
                  </p>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <Label htmlFor="name" className="text-sm font-semibold">
                        Nome completo <span className="text-destructive">*</span>
                      </Label>
                      <Input 
                        id="name" 
                        name="name" 
                        required 
                        defaultValue={user.user_metadata?.full_name || ''}
                        placeholder="Digite seu nome completo"
                        className="mt-1.5"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email" className="text-sm font-semibold">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input 
                        id="email" 
                        name="email" 
                        type="email" 
                        required 
                        defaultValue={user.email || ''}
                        placeholder="seu@email.com"
                        className="mt-1.5"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="phone" className="text-sm font-semibold">
                        Telefone <span className="text-destructive">*</span>
                      </Label>
                      <Input 
                        id="phone" 
                        name="phone" 
                        type="tel" 
                        required 
                        placeholder="(11) 99999-9999"
                        className="mt-1.5"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="coupon" className="text-sm font-semibold">
                        Cupom de Desconto
                      </Label>
                      <Input 
                        id="coupon" 
                        name="coupon" 
                        placeholder="Digite o código do cupom (opcional)"
                        className="mt-1.5"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Deixe em branco se não tiver cupom
                      </p>
                    </div>
                    
                    <div className="pt-4">
                      <Button 
                        type="submit" 
                        className="w-full h-12 text-base font-semibold" 
                        disabled={loading}
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Processando...
                          </div>
                        ) : (
                          `Continuar para Pagamento PIX`
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Resumo - 2 colunas */}
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-8 space-y-6">
                <Card className="shadow-lg border-primary/20">
                  <CardHeader className="bg-primary/5">
                    <CardTitle className="text-xl">Resumo do Pedido</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {items.map((item) => (
                      <div key={item.slug} className="flex gap-3 pb-4 border-b last:border-0">
                        {item.image && (
                          <img 
                            src={item.image} 
                            alt={item.title}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-2">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Quantidade: {item.quantity}
                          </p>
                          <p className="text-sm font-semibold text-primary mt-1">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="shadow-lg bg-primary/5 border-primary/20">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium">{formatPrice(total)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Desconto</span>
                        <span className="font-medium text-green-600">R$ 0,00</span>
                      </div>
                      <div className="border-t pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold">Total</span>
                          <span className="text-2xl font-bold text-primary">{formatPrice(total)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg bg-blue-50/50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-blue-900 mb-1">Pagamento Seguro</h3>
                        <p className="text-xs text-blue-700">
                          Na próxima etapa você receberá as instruções para realizar o pagamento via PIX.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}