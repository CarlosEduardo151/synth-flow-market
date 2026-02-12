import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, Clock, Gift, ArrowRight, Loader2 } from "lucide-react";
import { getProducts } from "@/data/products";
import { useAuth } from "@/contexts/AuthContext";
import { useFreeTrial } from "@/hooks/useFreeTrial";
import { toast } from "sonner";

export const FreeTrial = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    activating, 
    hasAnyTrialForProduct, 
    activateTrial,
    canAddMoreTrials 
  } = useFreeTrial();

  const microEmpresasProducts = getProducts().filter(
    (product) => product.category === "micro-empresas"
  );

  const benefits = [
    "Escolha 2 produtos da categoria Micro-Empresas",
    "Acesso completo por 2 dias",
    "Suporte durante o período de teste",
    "Sem compromisso de compra"
  ];

  const handleActivateTrial = async (slug: string, title: string) => {
    if (!user) {
      toast.error('Faça login para ativar o teste grátis');
      navigate('/auth');
      return;
    }

    if (!canAddMoreTrials) {
      toast.error('Você já possui 2 produtos em teste grátis ativo');
      return;
    }

    if (hasAnyTrialForProduct(slug)) {
      toast.error('Você já utilizou o teste grátis deste produto');
      return;
    }

    const success = await activateTrial(slug, title);
    if (success) {
      navigate('/meus-produtos');
    }
  };

  return (
    <section id="teste-gratis" className="py-20 bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Conteúdo */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 text-sm text-primary">
                <Sparkles className="w-4 h-4" />
                Teste Grátis
              </div>

              <h2 className="text-3xl lg:text-4xl font-bold">
                <span className="gradient-text">Experimente por 2 dias</span>
                <br />
                Escolha 2 produtos para testar
              </h2>

              <p className="text-lg text-muted-foreground">
                Selecione <strong className="text-foreground">2 produtos</strong> da categoria 
                <strong className="text-foreground"> Micro-Empresas</strong> e teste 
                gratuitamente por 2 dias. Sem cartão de crédito, sem compromisso.
              </p>

              <ul className="space-y-3">
                {benefits.map((benefit, index) => (
                  <motion.li
                    key={benefit}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">{benefit}</span>
                  </motion.li>
                ))}
              </ul>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border">
                <Clock className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Clique em um produto abaixo para ativar automaticamente
                </span>
              </div>
            </motion.div>

            {/* Lista de Produtos */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                  <Gift className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-bold">Produtos Disponíveis</h3>
                  <p className="text-sm text-muted-foreground">Clique para ativar</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {microEmpresasProducts.map((product) => {
                  const alreadyUsed = user ? hasAnyTrialForProduct(product.slug) : false;
                  
                  return (
                    <motion.div
                      key={product.slug}
                      whileHover={!alreadyUsed ? { scale: 1.02 } : undefined}
                      className={`p-4 rounded-xl border transition-all ${
                        alreadyUsed 
                          ? 'opacity-50 cursor-not-allowed bg-muted/30' 
                          : 'cursor-pointer hover:border-primary hover:bg-primary/5'
                      }`}
                      onClick={() => !alreadyUsed && !activating && handleActivateTrial(product.slug, product.title)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-primary/10 flex items-center justify-center flex-shrink-0">
                          <img 
                            src={product.images[0]} 
                            alt={product.title}
                            className="w-8 h-8 object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{product.title}</h4>
                          <p className="text-sm text-muted-foreground truncate">{product.short}</p>
                        </div>
                        <div className="flex-shrink-0">
                          {alreadyUsed ? (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              Já testado
                            </span>
                          ) : activating ? (
                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                          ) : (
                            <ArrowRight className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {!user && (
                <Button variant="hero" size="lg" className="w-full mt-4" asChild>
                  <Link to="/auth">
                    Fazer Login para Ativar
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
