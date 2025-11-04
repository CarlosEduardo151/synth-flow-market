import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  Download, 
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  ExternalLink,
  Copy,
  CheckCircle,
  Key
} from 'lucide-react';
import { ProductCredentials } from '@/components/ProductCredentials';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { ProductContent } from '@/components/ProductContent';

interface ProductContent {
  id: string;
  product_slug: string;
  product_title: string;
  file_content: string;
  content_type: string;
  file_path: string;
}

interface CustomerProduct {
  id: string;
  product_slug: string;
  product_title: string;
  delivered_at: string;
  access_expires_at: string | null;
  download_count: number;
  max_downloads: number;
  is_active: boolean;
  acquisition_type: 'purchase' | 'rental';
  rental_start_date?: string | null;
  rental_end_date?: string | null;
  rental_payment_status?: string | null;
}

const ProductViewPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams();
  const { toast } = useToast();
  
  const [product, setProduct] = useState<CustomerProduct | null>(null);
  const [content, setContent] = useState<ProductContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (user && slug) {
      fetchProductAndContent();
    }
  }, [user, loading, navigate, slug]);

  const fetchProductAndContent = async () => {
    if (!user || !slug) return;

    try {
      // Check if user has access to this product
      const { data: customerProduct, error: accessError } = await supabase
        .from('customer_products')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_slug', slug)
        .eq('is_active', true)
        .single();

      if (accessError || !customerProduct) {
        setHasAccess(false);
        setIsLoading(false);
        return;
      }

      // Check if access has expired
      const expired = customerProduct.access_expires_at 
        ? new Date(customerProduct.access_expires_at) < new Date()
        : false;

      if (expired) {
        setHasAccess(false);
        setIsLoading(false);
        return;
      }

      setProduct(customerProduct);
      setHasAccess(true);

      // Fetch product content
      const { data: productContent, error: contentError } = await supabase
        .from('products_content')
        .select('*')
        .eq('product_slug', slug)
        .eq('is_active', true)
        .single();

      if (contentError) {
        console.error('Error fetching content:', contentError);
      } else {
        setContent(productContent);
      }

    } catch (error) {
      console.error('Error fetching product:', error);
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Conteúdo copiado para a área de transferência",
    });
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card className="text-center py-12">
            <CardContent>
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Acesso Negado</h3>
              <p className="text-muted-foreground mb-6">
                Você não tem acesso a este produto ou ele expirou.
              </p>
              <Button asChild>
                <Link to="/meus-produtos">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar para Meus Produtos
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
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="outline" asChild className="mb-4">
            <Link to="/meus-produtos">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Meus Produtos
            </Link>
          </Button>
          
          <div className="flex items-center gap-3 mb-4">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {product?.product_title}
              </h1>
              <p className="text-muted-foreground">
                Produto digital adquirido em {product && formatDate(product.delivered_at)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar with product info */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Informações do Produto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Data de Aquisição</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {product && formatDate(product.delivered_at)}
                  </p>
                </div>

                {product?.access_expires_at && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Expira em</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(product.access_expires_at)}
                    </p>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Download className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Downloads</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                  ∞
                  </p>
                </div>

                <Separator />

                {/* Produtos de Micro-Empresas com Sistema */}
                {(product?.product_slug === 'gestao-cobrancas' || 
                  product?.product_slug === 'dashboards-personalizados' ||
                  product?.product_slug === 'crm-simples' ||
                  product?.product_slug === 'relatorios-financeiros' ||
                  product?.product_slug === 'posts-sociais' ||
                  product?.product_slug === 'fidelidade-digital' ||
                  product?.product_slug === 'starapp') && (
                  <div className="space-y-2">
                    <Button
                      className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                      size="sm"
                      onClick={() => navigate(`/sistema/${product?.product_slug}`)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Acessar Sistema
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      Sistema disponível 24/7
                    </p>
                  </div>
                )}

                {/* Download para produtos sem sistema */}
                {product?.acquisition_type === 'purchase' && 
                 product?.product_slug !== 'gestao-cobrancas' && 
                 product?.product_slug !== 'dashboards-personalizados' &&
                 product?.product_slug !== 'crm-simples' &&
                 product?.product_slug !== 'relatorios-financeiros' &&
                 product?.product_slug !== 'posts-sociais' &&
                 product?.product_slug !== 'fidelidade-digital' &&
                 product?.product_slug !== 'starapp' && (
                  <div className="space-y-2">
                    <a
                      href={`/produtos/${encodeURIComponent(product?.product_title || 'produto')}.zip`}
                      download
                    >
                      <Button
                        className="w-full"
                        size="sm"
                        disabled={
                          product?.max_downloads
                            ? product?.download_count >= product?.max_downloads
                            : false
                        }
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar
                      </Button>
                    </a>
                  </div>
                )}

                {product?.acquisition_type === 'rental' && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-1">
                      <Key className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        Produto Alugado
                      </span>
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      Download não disponível para produtos alugados
                    </p>
                  </div>
                )}

                <div>  
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    size="sm"
                    onClick={() => content && copyToClipboard(content.file_content)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Conteúdo
                  </Button>
                </div>

                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-300">
                      Acesso Ativo
                    </span>
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-400">
                    Você tem acesso completo a este produto
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main content area */}
          <div className="lg:col-span-3 space-y-6">
            {product && (
              <ProductCredentials 
                customerProductId={product.id}
                productSlug={product.product_slug}
                isRental={product.acquisition_type === 'rental'}
              />
            )}
            
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Conteúdo do Produto
                  </CardTitle>
                  <Badge variant="secondary">
                    {content?.content_type || 'markdown'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {content ? (
                  content.content_type === 'markdown' ? (
                    <ProductContent content={content.file_content} />
                  ) : (
                    <div className="prose prose-lg max-w-none dark:prose-invert">
                      <div className="space-y-4">
                        {content.file_content}
                      </div>
                    </div>
                  )
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Conteúdo não disponível no momento.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductViewPage;