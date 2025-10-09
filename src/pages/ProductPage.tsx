import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProduct, formatPrice, type Product } from "@/data/products";
import { ChevronRight, ArrowLeft, ShoppingCart, Info, Star, Check, AlertCircle, Calendar, CreditCard } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedAcquisitionType, setSelectedAcquisitionType] = useState<'purchase' | 'rental'>('purchase');
  const [rentalMonths, setRentalMonths] = useState(1);

  useEffect(() => {
    const loadProduct = async () => {
      if (!slug) return;
      
      try {
        const productData = getProduct(slug);
        setProduct(productData);
        // Se o produto tem preço de aluguel, seleciona aluguel por padrão
        if (productData?.rentalPrice) {
          setSelectedAcquisitionType('rental');
        }
      } catch (error) {
        console.error("Erro ao carregar produto:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [slug]);

  const handleAddToCart = () => {
    if (!product) return;
    
    const price = selectedAcquisitionType === 'rental' && product.rentalPrice 
      ? product.rentalPrice 
      : product.price;
    
    addItem({
      slug: product.slug,
      title: product.title,
      price: price,
      image: product.images?.[0],
      acquisitionType: selectedAcquisitionType,
      rentalMonths: selectedAcquisitionType === 'rental' ? rentalMonths : undefined
    });
    
    const typeText = selectedAcquisitionType === 'rental' ? 'aluguel' : 'compra';
    toast({
      title: "Produto adicionado!",
      description: `${product.title} foi adicionado ao carrinho (${typeText}).`,
    });
  };

  const handleBuyNow = () => {
    if (!product) return;
    
    const price = selectedAcquisitionType === 'rental' && product.rentalPrice 
      ? product.rentalPrice 
      : product.price;
    
    addItem({
      slug: product.slug,
      title: product.title,
      price: price,
      image: product.images?.[0],
      acquisitionType: selectedAcquisitionType,
      rentalMonths: selectedAcquisitionType === 'rental' ? rentalMonths : undefined
    });
    
    navigate('/checkout');
  };

  const getCurrentPrice = () => {
    if (!product) return 0;
    if (selectedAcquisitionType === 'rental' && product.rentalPrice) {
      return product.rentalPrice * rentalMonths;
    }
    return product.price;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-tech-lines">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Carregando produto...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-tech-lines">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl font-bold mb-4">Produto não encontrado</h1>
          <p className="text-muted-foreground mb-8">O produto que você está procurando não existe.</p>
          <Button variant="hero" asChild>
            <Link to="/">Voltar ao início</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tech-lines">
      <Header />
      
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-6">
        <nav className="flex items-center space-x-2 text-sm">
          <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
            Início
          </Link>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <Link 
            to={`/c/${product.category}`} 
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            Categoria
          </Link>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground font-medium">{product.title}</span>
        </nav>
      </div>

      {/* Produto principal */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Galeria de imagens */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-4"
            >
              {/* Imagem principal */}
              <div className="aspect-square rounded-2xl overflow-hidden bg-card/50 backdrop-blur-sm">
                <img
                  src={product.images[selectedImage]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Miniaturas */}
              {product.images.length > 1 && (
                <div className="flex space-x-2">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`w-20 h-20 rounded-xl overflow-hidden transition-all ${
                        selectedImage === index 
                          ? 'ring-2 ring-primary' 
                          : 'ring-1 ring-border hover:ring-primary/50'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.title} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Informações do produto */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-8"
            >
              {/* Cabeçalho */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={product.inStock ? "default" : "destructive"}
                  >
                    {product.inStock ? "Em estoque" : "Esgotado"}
                  </Badge>
                  <Badge variant="secondary">{product.delivery}</Badge>
                </div>

                <h1 className="text-4xl font-bold leading-tight">
                  {product.title}
                </h1>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <span className="text-muted-foreground">(4.8 • 127 avaliações)</span>
                </div>

                <p className="text-lg text-muted-foreground leading-relaxed">
                  {product.short}
                </p>
              </div>

              {/* Opções de compra/aluguel */}
              {product.rentalPrice && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Escolha sua opção:</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Opção Compra */}
                    <Card 
                      className={`cursor-pointer transition-all ${
                        selectedAcquisitionType === 'purchase' 
                          ? 'ring-2 ring-primary bg-primary/5' 
                          : 'hover:bg-card/50'
                      }`}
                      onClick={() => setSelectedAcquisitionType('purchase')}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            Compra
                          </CardTitle>
                          {selectedAcquisitionType === 'purchase' && (
                            <Check className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-2xl font-bold text-primary">
                            {formatPrice(product.price)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Pagamento único
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Opção Aluguel */}
                    <Card 
                      className={`cursor-pointer transition-all ${
                        selectedAcquisitionType === 'rental' 
                          ? 'ring-2 ring-primary bg-primary/5' 
                          : 'hover:bg-card/50'
                      }`}
                      onClick={() => setSelectedAcquisitionType('rental')}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Aluguel
                          </CardTitle>
                          {selectedAcquisitionType === 'rental' && (
                            <Check className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-2xl font-bold text-success">
                            {formatPrice(product.rentalPrice)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Por mês
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Período de aluguel */}
                  {selectedAcquisitionType === 'rental' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Período de aluguel:</label>
                      <select 
                        className="w-full p-2 rounded-lg bg-card border border-border"
                        value={rentalMonths}
                        onChange={(e) => setRentalMonths(Number(e.target.value))}
                      >
                        {[1, 3, 6, 12].map(months => (
                          <option key={months} value={months}>
                            {months} {months === 1 ? 'mês' : 'meses'} - {formatPrice(product.rentalPrice! * months)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Vantagens do aluguel */}
                  {selectedAcquisitionType === 'rental' && product.rentalAdvantages && (
                    <Card className="bg-success/5 border-success/20">
                      <CardHeader>
                        <CardTitle className="text-sm">Vantagens do Aluguel</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {product.rentalAdvantages.map((advantage, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-2">
                              <span>{advantage}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Preço (quando não tem opção de aluguel) */}
              {!product.rentalPrice && (
                <div className="space-y-2">
                  <div className="flex items-baseline space-x-4">
                    <span className="text-4xl font-bold gradient-text">
                      {formatPrice(product.price)}
                    </span>
                    <span className="text-lg text-muted-foreground">
                      à vista via PIX
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ou 12x de {formatPrice(Math.round(product.price / 12))} sem juros
                  </p>
                </div>
              )}

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {product.badges.map((badge) => (
                  <Badge key={badge} variant="secondary" className="text-sm">
                    {badge}
                  </Badge>
                ))}
              </div>

              {/* Features principais */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Principais recursos</h3>
                <div className="grid grid-cols-1 gap-3">
                  {product.features.map((feature) => (
                    <div key={feature} className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-success/20 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-success" />
                      </div>
                      <span className="text-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Aviso para bancos */}
              <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-warning">
                      Atenção: Restrição de pagamento
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Por questões técnicas, não aceitamos PIX de PicPay e Banco Inter no modo automático.
                    </p>
                  </div>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="space-y-3">
                <Button 
                  variant="purchase" 
                  size="xl" 
                  disabled={!product.inStock}
                  className="w-full"
                  onClick={handleBuyNow}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {product.inStock ? (
                    selectedAcquisitionType === 'rental' 
                      ? `Alugar agora - ${formatPrice(getCurrentPrice())}` 
                      : `Comprar agora - ${formatPrice(getCurrentPrice())}`
                  ) : "Indisponível"}
                </Button>
                
                <Button 
                  variant="outline" 
                  size="xl" 
                  disabled={!product.inStock}
                  className="w-full"
                  onClick={handleAddToCart}
                >
                  Adicionar ao carrinho
                </Button>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="info" size="xl" className="w-full">
                      <Info className="w-5 h-5 mr-2" />
                      Especificações
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Especificações técnicas</DialogTitle>
                    </DialogHeader>
                    <div 
                      className="prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: product.specs || "" }}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              <Button variant="outline" size="lg" asChild className="w-full">
                <Link to={`/c/${product.category}`}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Ver outros produtos da categoria
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Descrição detalhada */}
      <section className="py-20 bg-card/20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-3xl font-bold mb-8 text-center">
              Descrição completa
            </h2>
            <div 
              className="prose prose-invert prose-lg max-w-none space-y-6"
              dangerouslySetInnerHTML={{ __html: product.content || "" }}
            />
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}