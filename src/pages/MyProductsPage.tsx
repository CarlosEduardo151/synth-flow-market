import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { 
  Package, 
  Star, 
  Eye, 
  Calendar,
  Clock,
  Shield,
  FileText,
  Gift,
  Timer
} from 'lucide-react';

import { useFreeTrial, FreeTrial } from '@/hooks/useFreeTrial';

interface CustomerProduct {
  id: string;
  product_slug: string;
  product_title: string;
  delivered_at: string;
  access_expires_at: string | null;
  download_count: number;
  max_downloads?: number;
  is_active: boolean;
  acquisition_type: 'purchase' | 'rental';
  rental_start_date?: string | null;
  rental_end_date?: string | null;
  rental_payment_status?: string | null;
  monthly_rental_price?: number | null;
}

const MyProductsPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<CustomerProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { activeTrials, loading: trialsLoading, getTrialTimeRemaining } = useFreeTrial();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (user) {
      fetchProducts();
    }
  }, [user, loading, navigate]);

  const fetchProducts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('customer_products')
        .select('*')
        .eq('user_id', user.id)
        .order('delivered_at', { ascending: false });

      if (error) throw error;
      setProducts((data as CustomerProduct[]) || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getDaysUntilExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading || isLoading || trialsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Meus Produtos
              </h1>
              <p className="text-muted-foreground">
                Acesse todos os produtos digitais que você adquiriu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <Shield className="h-5 w-5 text-green-600" />
            <div className="text-sm">
              <p className="font-medium">Acesso Seguro</p>
              <p className="text-muted-foreground">
                Seus produtos estão protegidos e disponíveis apenas para você
              </p>
            </div>
          </div>
        </div>

        {/* Active Trials Section */}
        {activeTrials.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Gift className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold">Testes Grátis Ativos</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {activeTrials.map((trial) => (
                <Card key={trial.id} className="border-primary/30 bg-primary/5">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                          <Timer className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{trial.product_slug}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4" />
                            Iniciado em {new Date(trial.created_at).toLocaleDateString('pt-BR')}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className="bg-primary/20 text-primary">
                        <Clock className="w-3 h-3 mr-1" />
                        {getTrialTimeRemaining(trial)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button
                      asChild
                      className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    >
                      <Link to={`/sistema/${trial.product_slug}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        Acessar Sistema (Teste)
                      </Link>
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Expira em {new Date(trial.expires_at).toLocaleDateString('pt-BR')} às {new Date(trial.expires_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Purchased Products Section */}
        {products.length === 0 && activeTrials.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum produto encontrado</h3>
              <p className="text-muted-foreground mb-6">
                Você ainda não possui produtos digitais. Explore nossa loja ou experimente um teste grátis!
              </p>
              <div className="flex gap-4 justify-center">
                <Button asChild>
                  <Link to="/">Explorar Produtos</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/teste-gratis">
                    <Gift className="h-4 w-4 mr-2" />
                    Teste Grátis
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : products.length > 0 ? (
          <>
            {activeTrials.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-6 w-6 text-foreground" />
                <h2 className="text-xl font-bold">Produtos Adquiridos</h2>
              </div>
            )}
          <div className="grid gap-6">
            {products.map((product) => {
              const expired = isExpired(product.access_expires_at);
              const daysLeft = getDaysUntilExpiry(product.access_expires_at);

              return (
                <Card key={product.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Package className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{product.product_title}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4" />
                            Adquirido em {formatDate(product.delivered_at)}
                          </CardDescription>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Badge variant={product.acquisition_type === 'purchase' ? 'default' : 'outline'}>
                          {product.acquisition_type === 'purchase' ? 'Compra' : 'Aluguel'}
                        </Badge>
                        {expired ? (
                          <Badge variant="destructive">Expirado</Badge>
                        ) : product.access_expires_at ? (
                          <Badge variant={daysLeft && daysLeft <= 7 ? "destructive" : "secondary"}>
                            {daysLeft ? `${daysLeft} dias restantes` : 'Acesso Permanente'}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Acesso Permanente</Badge>
                        )}
                        {product.acquisition_type === 'rental' && product.rental_payment_status && (
                          <Badge variant={product.rental_payment_status === 'active' ? 'default' : 'destructive'}>
                            {product.rental_payment_status === 'active' ? 'Pagamento Ativo' : 'Pagamento Pendente'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {product.access_expires_at && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            Expira em: {formatDate(product.access_expires_at)}
                          </span>
                        </div>
                      )}

                      {product.access_expires_at && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            Expira em: {formatDate(product.access_expires_at)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          Status: {product.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex gap-3">
                      {['crm-simples', 'dashboards-personalizados', 'gestao-cobrancas', 'posts-sociais', 'relatorios-financeiros', 'fidelidade-digital', 'assistente-vendas', 'bots-automacao', 'agente-financeiro', 'agente-rh'].includes(product.product_slug) ? (
                        <Button
                          asChild
                          className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                          disabled={expired || !product.is_active}
                        >
                          <Link to={`/sistema/${product.product_slug}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Acessar Sistema
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          asChild
                          className="flex-1"
                          disabled={expired || !product.is_active}
                        >
                          <Link to={`/meus-produtos/${product.product_slug}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Acessar Produto
                          </Link>
                        </Button>
                      )}
                    </div>


                    <Button
                      asChild
                      className="w-full"
                      size="sm"
                      variant="outline"
                    >
                      <Link to={`/avaliar/${product.product_slug}`}>
                        <Star className="h-4 w-4 mr-2" />
                        Avaliar Produto
                      </Link>
                    </Button>

                    {product.acquisition_type === 'rental' && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-800 dark:text-blue-300 mb-1 font-medium">
                          Produto Alugado
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                          Configure as credenciais acessando o produto
                        </p>
                        {product.rental_end_date && (
                          <p className="text-xs text-blue-600 dark:text-blue-500 mt-2">
                            Renovação: {formatDate(product.rental_end_date)}
                          </p>
                        )}
                      </div>
                    )}




                    {expired && (
                      <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20 mt-3">
                        <p className="text-sm text-destructive">
                          Este produto expirou. Entre em contato com o suporte para renovar o acesso.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            </div>
          </>
        ) : null}
      </main>

      <Footer />
    </div>
  );
};

export default MyProductsPage;
