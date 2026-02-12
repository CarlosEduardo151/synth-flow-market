import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { PromoCarousel } from "@/components/home/PromoCarousel";
import { ProblemBlocks } from "@/components/home/ProblemBlocks";
import { FreeTrial } from "@/components/home/FreeTrial";
import { ImpactNumbers } from "@/components/home/ImpactNumbers";
import { PackagesSection } from "@/components/home/PackagesSection";
import { getProducts, type Product } from "@/data/products";
import { getCategories, type Category } from "@/data/categories";
import { Bot, Zap, Shield, ArrowRight } from "lucide-react";

const Index = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const products = getProducts();
        const cats = getCategories();
        setFeaturedProducts(products.slice(0, 4));
        setCategories(cats);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
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

      <PromoCarousel />

      {/* Hero Section - TOFU */}
      <HeroSection />

      {/* Transição */}
      <div className="relative h-16 bg-gradient-to-b from-transparent to-background"></div>

      {/* Números de Impacto */}
      <ImpactNumbers />

      {/* Blocos de Problemas - TOFU */}
      <ProblemBlocks />

      {/* Teste Grátis - TOFU */}
      <FreeTrial />

      {/* Categorias */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4">
              Explore nossas <span className="gradient-text">soluções</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Cada categoria foi pensada para resolver problemas específicos do seu negócio
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {categories.map((category, index) => (
              <motion.div
                key={category.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Link to={`/c/${category.slug}`} className="group block">
                  <div className="tech-border p-8 hover-lift hover-glow transition-all duration-300">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <category.icon className="w-8 h-8 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                          {category.title}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                          {category.summary}
                        </p>
                        <div className="flex items-center mt-4 text-primary group-hover:translate-x-2 transition-transform">
                          <span className="font-medium">Ver soluções</span>
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Produtos em destaque */}
      <section className="py-20 bg-card/20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4">
              Produtos <span className="gradient-text">mais escolhidos</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              As soluções que mais geram resultados para nossos clientes
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
            {featuredProducts.map((product, index) => (
              <motion.div
                key={product.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center mt-12"
          >
            <Button variant="hero" size="lg" asChild>
              <Link to="/busca">
                Ver Todos os Produtos
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4">
              Por que escolher a <span className="gradient-text">NovaLink</span>?
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Bot,
                title: "IA Avançada",
                description: "Tecnologia de ponta com algoritmos proprietários que realmente funcionam",
              },
              {
                icon: Zap,
                title: "Resultados em 30 dias",
                description: "Configuração rápida e resultados mensuráveis no primeiro mês",
              },
              {
                icon: Shield,
                title: "Suporte Especializado",
                description: "Time dedicado para garantir o sucesso da sua implementação",
              },
            ].map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center group"
              >
                <div className="w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <benefit.icon className="w-10 h-10 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-3">{benefit.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pacotes de Assinatura */}
      <PackagesSection />

      <Footer />
    </div>
  );
};

export default Index;
