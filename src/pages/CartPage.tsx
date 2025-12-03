import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight, Package } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Separator } from '@/components/ui/separator';

export default function CartPage() {
  const { items, updateQuantity, removeItem, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price / 100);
  };

  const handleCheckout = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-accent/20">
        <Header />
        <main className="container mx-auto px-4 py-20">
          <Card className="max-w-2xl mx-auto shadow-xl border-0 bg-card/50 backdrop-blur">
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-3xl font-bold mb-3">Seu carrinho está vazio</h2>
              <p className="text-muted-foreground text-lg mb-8">
                Explore nossa loja e adicione produtos incríveis!
              </p>
              <Button asChild size="lg" className="px-8">
                <Link to="/">
                  <Package className="w-5 h-5 mr-2" />
                  Explorar Produtos
                </Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/20">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Meu Carrinho
            </h1>
            <p className="text-muted-foreground text-lg">
              {items.length} {items.length === 1 ? 'produto' : 'produtos'} no carrinho
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Lista de Produtos */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="shadow-lg border-0 bg-card/80 backdrop-blur">
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {items.map((item, index) => (
                      <div key={item.slug}>
                        <div className="flex gap-6 items-start">
                          {/* Imagem do Produto */}
                          {item.image && (
                            <div className="relative shrink-0">
                              <img 
                                src={item.image} 
                                alt={item.title}
                                className="w-28 h-28 object-cover rounded-xl shadow-md border-2 border-primary/20"
                              />
                            </div>
                          )}
                          
                          {/* Detalhes do Produto */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg mb-2 line-clamp-2">{item.title}</h3>
                            <div className="flex items-center gap-4 mb-4">
                              <span className="text-2xl font-bold text-primary">
                                {formatPrice(item.price)}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                por unidade
                              </span>
                            </div>
                            
                            {/* Controles de Quantidade */}
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 bg-accent rounded-lg p-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9"
                                  onClick={() => updateQuantity(item.slug, item.quantity - 1)}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-12 text-center font-bold text-lg">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9"
                                  onClick={() => updateQuantity(item.slug, item.quantity + 1)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => removeItem(item.slug)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Subtotal do Item */}
                          <div className="text-right shrink-0">
                            <p className="text-sm text-muted-foreground mb-1">Subtotal</p>
                            <p className="text-2xl font-bold text-primary">
                              {formatPrice(item.price * item.quantity)}
                            </p>
                          </div>
                        </div>
                        
                        {index < items.length - 1 && (
                          <Separator className="mt-6" />
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <Separator className="my-6" />
                  
                  <Button 
                    variant="ghost" 
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={clearCart}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpar Carrinho
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Resumo do Pedido - Sticky */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-8">
                <Card className="shadow-xl border-0 bg-card/80 backdrop-blur overflow-hidden">
                  <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
                    <h2 className="text-2xl font-bold">Resumo</h2>
                  </div>
                  
                  <CardContent className="p-6 space-y-6">
                    {/* Itens */}
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-semibold">{formatPrice(total)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Desconto</span>
                        <span className="font-semibold text-green-600">R$ 0,00</span>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Total */}
                    <div className="flex justify-between items-center py-2 bg-primary/5 rounded-lg px-4">
                      <span className="text-lg font-semibold">Total</span>
                      <span className="text-3xl font-bold text-primary">
                        {formatPrice(total)}
                      </span>
                    </div>
                    
                    {/* Botão de Checkout */}
                    <Button 
                      className="w-full h-14 text-lg font-bold shadow-lg hover:shadow-xl transition-all" 
                      size="lg"
                      onClick={handleCheckout}
                    >
                      {!user ? (
                        <>Entrar para Continuar</>
                      ) : (
                        <>
                          Finalizar Compra
                          <ArrowRight className="ml-2 w-5 h-5" />
                        </>
                      )}
                    </Button>
                    
                    {/* Info de Segurança */}
                    <div className="text-center pt-4 border-t">
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Compra 100% Segura
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Continue Comprando */}
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  asChild
                >
                  <Link to="/">
                    <Package className="w-4 h-4 mr-2" />
                    Continuar Comprando
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}