import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CreditCard, QrCode, ShieldCheck, User, Mail, Phone, Tag, ArrowRight, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

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

  const [paymentMethod, setPaymentMethod] = useState<'mercadopago' | 'pix'>('mercadopago');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth');
      return;
    }

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      // Create order in Supabase first
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: total,
          customer_name: formData.get('name') as string,
          customer_email: formData.get('email') as string,
          customer_phone: formData.get('phone') as string,
          payment_method: paymentMethod === 'mercadopago' ? 'mercadopago' : 'PIX',
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

      // If Mercado Pago, redirect to payment integration
      if (paymentMethod === 'mercadopago') {
        navigate(`/mercadopago-payment/${order.id}`);
      } else {
        // PIX payment flow
        navigate(`/pix-payment/${order.id}`);
      }

      clearCart();
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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/20">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header com indicador de progresso */}
          <div className="mb-12">
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  1
                </div>
                <span className="font-semibold">Carrinho</span>
              </div>
              <div className="w-16 h-1 bg-primary rounded"></div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold ring-4 ring-primary/20">
                  2
                </div>
                <span className="font-semibold text-primary">Checkout</span>
              </div>
              <div className="w-16 h-1 bg-muted rounded"></div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold">
                  3
                </div>
                <span className="text-muted-foreground">Pagamento</span>
              </div>
            </div>
            
            <h1 className="text-4xl font-bold text-center mb-3 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Finalizar Compra
            </h1>
            <p className="text-center text-muted-foreground text-lg">
              Preencha seus dados para prosseguir com o pagamento
            </p>
          </div>
          
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Formulário - 3 colunas */}
            <div className="lg:col-span-3">
              <Card className="shadow-xl border-0 bg-card/80 backdrop-blur overflow-hidden">
                <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <User className="w-6 h-6" />
                    Suas Informações
                  </h2>
                  <p className="text-primary-foreground/80 text-sm mt-1">
                    Precisamos destes dados para processar seu pedido
                  </p>
                </div>
                
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Nome */}
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-bold flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        Nome Completo <span className="text-destructive">*</span>
                      </Label>
                      <Input 
                        id="name" 
                        name="name" 
                        required 
                        defaultValue={user.user_metadata?.full_name || ''}
                        placeholder="Digite seu nome completo"
                        className="h-12 text-base"
                      />
                    </div>
                    
                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-bold flex items-center gap-2">
                        <Mail className="w-4 h-4 text-primary" />
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input 
                        id="email" 
                        name="email" 
                        type="email" 
                        required 
                        defaultValue={user.email || ''}
                        placeholder="seu@email.com"
                        className="h-12 text-base"
                      />
                    </div>
                    
                    {/* Telefone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-bold flex items-center gap-2">
                        <Phone className="w-4 h-4 text-primary" />
                        Telefone <span className="text-destructive">*</span>
                      </Label>
                      <Input 
                        id="phone" 
                        name="phone" 
                        type="tel" 
                        required 
                        placeholder="(11) 99999-9999"
                        className="h-12 text-base"
                      />
                    </div>
                    
                    {/* Cupom */}
                    <div className="space-y-2">
                      <Label htmlFor="coupon" className="text-sm font-bold flex items-center gap-2">
                        <Tag className="w-4 h-4 text-primary" />
                        Cupom de Desconto (Opcional)
                      </Label>
                      <Input 
                        id="coupon" 
                        name="coupon" 
                        placeholder="Digite seu cupom"
                        className="h-12 text-base"
                      />
                      <p className="text-xs text-muted-foreground">
                        💡 Deixe em branco se não tiver cupom
                      </p>
                    </div>

                    <Separator className="my-8" />

                    {/* Método de Pagamento */}
                    <div className="space-y-4">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary" />
                        Método de Pagamento <span className="text-destructive">*</span>
                      </Label>
                      <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                        <div className={`relative flex items-center space-x-4 p-5 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${paymentMethod === 'mercadopago' ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/50'}`}>
                          <RadioGroupItem value="mercadopago" id="mercadopago" className="shrink-0" />
                          <Label htmlFor="mercadopago" className="flex items-center gap-4 cursor-pointer flex-1">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <CreditCard className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-base">Mercado Pago</div>
                              <div className="text-sm text-muted-foreground">
                                Cartão de crédito, débito ou PIX
                              </div>
                              <div className="flex gap-2 mt-2">
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Parcelamento</span>
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Seguro</span>
                              </div>
                            </div>
                          </Label>
                        </div>
                        
                        <div className={`relative flex items-center space-x-4 p-5 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${paymentMethod === 'pix' ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/50'}`}>
                          <RadioGroupItem value="pix" id="pix" className="shrink-0" />
                          <Label htmlFor="pix" className="flex items-center gap-4 cursor-pointer flex-1">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <QrCode className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-base">PIX Direto</div>
                              <div className="text-sm text-muted-foreground">
                                Pagamento via PIX com comprovante
                              </div>
                              <div className="flex gap-2 mt-2">
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Instantâneo</span>
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Parcelável</span>
                              </div>
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    {/* Botão de Submit */}
                    <div className="pt-6">
                      <Button 
                        type="submit" 
                        className="w-full h-14 text-lg font-bold shadow-lg hover:shadow-xl transition-all" 
                        size="lg"
                        disabled={loading}
                      >
                        {loading ? (
                          <div className="flex items-center gap-3">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processando...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            Continuar para Pagamento
                            <ArrowRight className="w-5 h-5" />
                          </div>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Resumo - 2 colunas - Sticky */}
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-8 space-y-6">
                {/* Resumo dos Produtos */}
                <Card className="shadow-xl border-0 bg-card/80 backdrop-blur overflow-hidden">
                  <div className="bg-gradient-to-r from-primary/20 to-primary/10 p-6 border-b">
                    <h3 className="font-bold text-lg">Resumo do Pedido</h3>
                    <p className="text-sm text-muted-foreground">{items.length} {items.length === 1 ? 'produto' : 'produtos'}</p>
                  </div>
                  <CardContent className="p-6 max-h-[400px] overflow-y-auto space-y-4">
                    {items.map((item) => (
                      <div key={item.slug} className="flex gap-4 pb-4 border-b last:border-0">
                        {item.image && (
                          <img 
                            src={item.image} 
                            alt={item.title}
                            className="w-20 h-20 object-cover rounded-lg shadow-sm border-2 border-primary/20"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm line-clamp-2 mb-1">{item.title}</p>
                          <p className="text-xs text-muted-foreground mb-2">
                            Qtd: {item.quantity}x
                          </p>
                          <p className="text-base font-bold text-primary">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Total */}
                <Card className="shadow-xl border-0 bg-gradient-to-br from-primary/10 to-primary/5 overflow-hidden">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground font-medium">Subtotal</span>
                        <span className="font-bold">{formatPrice(total)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground font-medium">Desconto</span>
                        <span className="font-bold text-green-600">R$ 0,00</span>
                      </div>
                      <Separator />
                      <div className="bg-primary text-primary-foreground p-4 rounded-xl">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold">Total</span>
                          <span className="text-3xl font-bold">
                            {formatPrice(total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Info de Segurança */}
                <Card className="shadow-xl border-0 bg-green-50/80 dark:bg-green-950/20 overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-sm text-green-900 dark:text-green-100 mb-2">
                          Compra 100% Segura
                        </h3>
                        <p className="text-xs text-green-700 dark:text-green-300 leading-relaxed">
                          Seus dados estão protegidos e o pagamento é processado em ambiente seguro. Após a confirmação, você receberá acesso imediato aos produtos.
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