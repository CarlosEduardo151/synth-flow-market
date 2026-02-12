import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";

import { getProducts } from "@/data/products";
import { ProductDemoCard } from "@/components/demo/ProductDemoCard";

const DemonstracaoPage = () => {
  const products = useMemo(() => getProducts(), []);

  return (
    <div className="min-h-screen bg-tech-lines">
      <Header />

      <main>
        <section className="relative overflow-hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background to-background" />

          <div className="container mx-auto px-4 py-14 lg:py-20 relative">
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 backdrop-blur px-4 py-2 text-sm">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">
                    Veja os produtos funcionando de verdade
                  </span>
                </div>

                <h1 className="mt-5 text-4xl lg:text-6xl font-bold tracking-tight">
                  Uma demonstração que dá
                  <span className="gradient-text"> confiança</span>
                </h1>

                <p className="mt-5 text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto">
                  Um tour visual, direto ao ponto, para sua equipe entender o que está comprando
                  — antes de decidir.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.08 }}
                className="mt-10"
              >
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold">Demonstrações por produto</h2>
                    <p className="text-muted-foreground mt-1">
                      Total no catálogo: <span className="font-semibold text-foreground">{products.length}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button variant="hero" asChild>
                      <Link to="/teste-gratis">
                        Teste grátis
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to="/busca">Ver catálogo completo</Link>
                    </Button>
                  </div>
                </div>

                <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => (
                    <ProductDemoCard key={product.slug} product={product} />
                  ))}
                </div>

                <p className="mt-8 text-sm text-muted-foreground">
                  Para cada produto, coloque o vídeo em <span className="font-mono">public/videos/{`{slug}`}.mp4</span>
                  (ex.: <span className="font-mono">public/videos/{products[0]?.slug ?? "produto"}.mp4</span>).
                </p>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default DemonstracaoPage;
