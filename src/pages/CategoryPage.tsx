import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { getCategory } from "@/data/categories";
import { getProducts, type Product } from "@/data/products";
import { type Category } from "@/data/categories";
import { ChevronRight, ArrowLeft, Bot, Cpu } from "lucide-react";

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!slug) return;
      
      try {
        const categoryData = getCategory(slug);
        const productsData = getProducts(slug);
        setCategory(categoryData);
        setProducts(productsData);
      } catch (error) {
        console.error("Erro ao carregar categoria:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-tech-lines">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Carregando categoria...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-tech-lines">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl font-bold mb-4">Categoria não encontrada</h1>
          <p className="text-muted-foreground mb-8">A categoria que você está procurando não existe.</p>
          <Button variant="hero" asChild>
            <Link to="/">Voltar ao início</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const IconComponent = category.icon;

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
          <span className="text-foreground font-medium">{category.title}</span>
        </nav>
      </div>

      {/* Header da categoria */}
      <section className="py-12 bg-gradient-hero">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-6"
          >
            <div className="flex justify-center">
              <div className="w-24 h-24 bg-gradient-primary rounded-2xl flex items-center justify-center">
                <IconComponent className="w-12 h-12 text-primary-foreground" />
              </div>
            </div>
            
            <h1 className="text-5xl font-bold">
              <span className="gradient-text">{category.title}</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {category.summary}
            </p>

            <div className="flex justify-center">
              <Button variant="outline" asChild>
                <Link to="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar às categorias
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Lista de produtos */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          {products.length > 0 ? (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mb-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold">
                    Produtos disponíveis
                  </h2>
                  <span className="text-muted-foreground">
                    {products.length} produto{products.length !== 1 ? 's' : ''} encontrado{products.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </motion.div>

              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
                {products.map((product, index) => (
                  <motion.div
                    key={product.slug}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center py-20"
            >
              <div className="w-24 h-24 bg-muted/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <IconComponent className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Produtos em breve</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Estamos trabalhando em novos produtos incríveis para esta categoria. 
                Fique atento às novidades!
              </p>
              <Button variant="hero" asChild>
                <Link to="/">Explorar outras categorias</Link>
              </Button>
            </motion.div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}