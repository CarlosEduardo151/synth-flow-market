import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useFreeTrial } from '@/hooks/useFreeTrial';
import { getProducts } from '@/data/products';
import { 
  CheckCircle2, 
  Clock, 
  Gift, 
  ArrowRight, 
  Sparkles,
  Timer,
  AlertCircle,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';

const FreeTrialPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { 
    activeTrials, 
    loading, 
    activating, 
    canAddMoreTrials, 
    hasActiveTrial,
    hasAnyTrialForProduct,
    activateTrial,
    getTrialTimeRemaining 
  } = useFreeTrial();

  const microEmpresasProducts = getProducts().filter(
    (product) => product.category === 'micro-empresas'
  );

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const handleSelectProduct = (slug: string) => {
    if (hasAnyTrialForProduct(slug)) {
      toast.error('Você já utilizou o teste grátis deste produto');
      return;
    }

    if (selectedProducts.includes(slug)) {
      setSelectedProducts(selectedProducts.filter(s => s !== slug));
    } else {
      const maxSelectable = 2 - activeTrials.length;
      if (selectedProducts.length >= maxSelectable) {
        toast.error(`Você só pode selecionar mais ${maxSelectable} produto(s)`);
        return;
      }
      setSelectedProducts([...selectedProducts, slug]);
    }
  };

  const handleActivateTrials = async () => {
    if (!user) {
      toast.error('Faça login para ativar seu teste grátis');
      navigate('/auth');
      return;
    }

    if (selectedProducts.length === 0) {
      toast.error('Selecione pelo menos 1 produto');
      return;
    }

    for (const slug of selectedProducts) {
      const product = microEmpresasProducts.find(p => p.slug === slug);
      if (product) {
        const success = await activateTrial(slug, product.title);
        if (!success) break;
      }
    }
    
    setSelectedProducts([]);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-tech-lines">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tech-lines">
      <Header />

      <main className="py-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 text-sm text-primary mb-4">
              <Gift className="w-4 h-4" />
              Teste Grátis por 2 Dias
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              Escolha <span className="gradient-text">2 produtos</span> para testar
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Selecione até 2 produtos da categoria Micro-Empresas e experimente 
              gratuitamente por 48 horas. Sem cartão de crédito, sem compromisso.
            </p>
          </motion.div>

          {/* Active Trials */}
          {activeTrials.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Timer className="w-6 h-6 text-primary" />
                Seus Testes Ativos
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {activeTrials.map((trial) => (
                  <Card key={trial.id} className="border-primary/30 bg-primary/5">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{trial.product_slug}</CardTitle>
                        <Badge className="bg-primary/20 text-primary">
                          <Clock className="w-3 h-3 mr-1" />
                          {getTrialTimeRemaining(trial)}
                        </Badge>
                      </div>
                      <CardDescription>
                        Ativo desde {new Date(trial.created_at).toLocaleDateString('pt-BR')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="hero" size="sm" asChild className="w-full">
                        <Link to={`/meus-produtos`}>
                          Acessar Produto
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* Login Required Notice */}
          {!user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="flex items-center gap-4 py-6">
                  <Lock className="w-8 h-8 text-amber-500" />
                  <div className="flex-1">
                    <p className="font-medium">Faça login para ativar seu teste grátis</p>
                    <p className="text-sm text-muted-foreground">
                      Você precisa estar logado para selecionar e ativar os produtos
                    </p>
                  </div>
                  <Button asChild>
                    <Link to="/auth">
                      Fazer Login
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Selection Info */}
          {user && canAddMoreTrials && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Card className="border-primary/30 bg-card/50">
                <CardContent className="flex items-center gap-4 py-6">
                  <Sparkles className="w-8 h-8 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">
                      Selecione {2 - activeTrials.length} produto{2 - activeTrials.length > 1 ? 's' : ''} abaixo
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedProducts.length} de {2 - activeTrials.length} selecionado(s)
                    </p>
                  </div>
                  {selectedProducts.length > 0 && (
                    <Button 
                      variant="hero" 
                      onClick={handleActivateTrials}
                      disabled={activating}
                    >
                      {activating ? 'Ativando...' : 'Ativar Teste Grátis'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* No More Trials Available */}
          {user && !canAddMoreTrials && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="flex items-center gap-4 py-6">
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                  <div className="flex-1">
                    <p className="font-medium">Limite de testes ativos atingido</p>
                    <p className="text-sm text-muted-foreground">
                      Você já possui 2 produtos em teste. Aguarde expirar ou adquira os produtos.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Products Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {microEmpresasProducts.map((product, index) => {
              const isSelected = selectedProducts.includes(product.slug);
              const hasTrialActive = hasActiveTrial(product.slug);
              const usedTrial = hasAnyTrialForProduct(product.slug);
              const canSelect = user && canAddMoreTrials && !usedTrial;

              return (
                <motion.div
                  key={product.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className={`relative cursor-pointer transition-all duration-300 h-full ${
                      isSelected 
                        ? 'border-primary ring-2 ring-primary/20' 
                        : hasTrialActive
                          ? 'border-green-500/50 bg-green-500/5'
                          : usedTrial
                            ? 'opacity-50 cursor-not-allowed'
                            : canSelect
                              ? 'hover:border-primary/50 hover:shadow-lg'
                              : ''
                    }`}
                    onClick={() => canSelect && handleSelectProduct(product.slug)}
                  >
                    {isSelected && (
                      <div className="absolute top-4 right-4 z-10">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
                        </div>
                      </div>
                    )}

                    {hasTrialActive && (
                      <div className="absolute top-4 right-4 z-10">
                        <Badge className="bg-green-500 text-white">
                          <Clock className="w-3 h-3 mr-1" />
                          Em teste
                        </Badge>
                      </div>
                    )}

                    {usedTrial && !hasTrialActive && (
                      <div className="absolute top-4 right-4 z-10">
                        <Badge variant="secondary">Já testado</Badge>
                      </div>
                    )}

                    <CardHeader>
                      <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-4">
                        <img 
                          src={product.images[0]} 
                          alt={product.title}
                          className="w-10 h-10 object-contain"
                        />
                      </div>
                      <CardTitle className="text-lg">{product.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {product.short}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {product.features.slice(0, 3).map((feature, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="truncate">{feature}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Valor normal</span>
                          <span className="font-bold">
                            R$ {product.price.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-primary">
                          <span className="text-sm font-medium">Teste grátis</span>
                          <span className="font-bold">2 dias</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* CTA Bottom */}
          {selectedProducts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-4 z-50"
            >
              <div className="container mx-auto flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {selectedProducts.length} produto(s) selecionado(s)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Clique para ativar seu teste grátis de 2 dias
                  </p>
                </div>
                <Button 
                  variant="hero" 
                  size="lg"
                  onClick={handleActivateTrials}
                  disabled={activating}
                >
                  {activating ? 'Ativando...' : 'Ativar Teste Grátis'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FreeTrialPage;
