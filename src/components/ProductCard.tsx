import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Info, Star } from "lucide-react";
import { Product, formatPrice } from "@/data/products";
import { motion } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();

  const handleAddToCart = () => {
    addItem({
      slug: product.slug,
      title: product.title,
      price: product.price,
      image: product.images?.[0],
      acquisitionType: 'purchase' // Default para compra
    });
    
    toast({
      title: "Produto adicionado!",
      description: `${product.title} foi adicionado ao carrinho.`,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="group"
    >
      <div className="glass rounded-2xl overflow-hidden hover-lift hover-glow transition-all duration-300">
        {/* Imagem do produto */}
        <div className="relative overflow-hidden">
          <img
            src={product.images[0]}
            alt={product.title}
            className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
          />
          {/* Status de estoque */}
          <div className="absolute top-4 right-4">
            <Badge 
              variant={product.inStock ? "default" : "destructive"}
              className="backdrop-blur-sm"
            >
              {product.inStock ? "Em estoque" : "Esgotado"}
            </Badge>
          </div>
          {/* Badges do produto */}
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
            {product.badges.slice(0, 2).map((badge) => (
              <Badge key={badge} variant="secondary" className="text-xs backdrop-blur-sm">
                {badge}
              </Badge>
            ))}
          </div>
        </div>

        {/* Conteúdo do card */}
        <div className="p-6 space-y-4">
          {/* Título e avaliação */}
          <div className="space-y-2">
            <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
              {product.title}
            </h3>
            <div className="flex items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className="w-4 h-4 fill-primary text-primary" 
                />
              ))}
              <span className="text-sm text-muted-foreground ml-2">(4.8)</span>
            </div>
          </div>

          {/* Descrição */}
          <p className="text-muted-foreground text-sm leading-relaxed">
            {product.short}
          </p>

          {/* Features principais */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-foreground">Principais recursos:</h4>
            <ul className="space-y-1">
              {product.features.slice(0, 3).map((feature) => (
                <li key={feature} className="text-xs text-muted-foreground flex items-center">
                  <div className="w-1 h-1 rounded-full bg-primary mr-2" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Preço */}
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold gradient-text">
              {formatPrice(product.price)}
            </span>
            <span className="text-sm text-muted-foreground">
              {product.delivery}
            </span>
          </div>

          {/* Botões de ação */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button 
              variant="purchase" 
              size="lg"
              disabled={!product.inStock}
              className="flex-1"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Comprar
            </Button>
            <Button 
              variant="info" 
              size="lg" 
              asChild
              className="flex-1"
            >
              <Link to={`/p/${product.slug}`}>
                <Info className="w-4 h-4 mr-2" />
                Detalhes
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}