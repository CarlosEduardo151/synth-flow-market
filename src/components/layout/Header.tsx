import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingCart, User, Search, LogOut, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useAdminCheck } from "@/hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import { getProducts, formatPrice, type Product } from "@/data/products";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminCheck();
  const { itemCount } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const products = getProducts();
      const filtered = products.filter(product =>
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.short.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 4);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/busca?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery(""); 
      setShowSuggestions(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSuggestionClick = (product: Product) => {
    navigate(`/p/${product.slug}`);
    setSearchQuery("");
    setShowSuggestions(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 backdrop-blur-xl bg-background/80">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo com imagem favicon */}
        <Link
          to="/"
          className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-primary">
            <img
              src="/favicon.ico"
              alt="Logo"
              className="w-8 h-8 object-contain rounded-xl"
            />
          </div>
          <span className="font-bold text-lg gradient-text">StarAI</span>
        </Link>

        {/* Navegação */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link
            to="/c/agentes-de-ia"
            className="text-foreground/80 hover:text-primary transition-colors"
          >
            Agentes de IA
          </Link>
          <Link
            to="/c/ia-automatizada"
            className="text-foreground/80 hover:text-primary transition-colors"
          >
            IA Automatizada
          </Link>
          <Link
            to="/c/micro-empresas"
            className="text-foreground/80 hover:text-primary transition-colors"
          >
            Para Micro-Empresas
          </Link>
          <Link
            to="/sobre"
            className="text-foreground/80 hover:text-primary transition-colors"
          >
            Sobre
          </Link>
          <Link
            to="/jornada"
            className="text-foreground/80 hover:text-primary transition-colors"
          >
            Jornada
          </Link>
        </nav>

        {/* Busca e ações */}
        <div className="flex items-center space-x-4">
          {/* Busca - Desktop */}
          <div ref={searchRef} className="relative hidden lg:block">
            <form onSubmit={handleSearchSubmit}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <Input
                placeholder="Buscar produtos..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10 w-64 bg-card/50 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all duration-200"
                onFocus={() => searchQuery.length > 1 && setShowSuggestions(true)}
              />
            </form>
            
            {/* Dropdown de sugestões */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                {suggestions.map((product) => (
                  <button
                    key={product.slug}
                    onClick={() => handleSuggestionClick(product)}
                    className="w-full px-4 py-3 text-left hover:bg-accent/50 transition-colors border-b border-border/20 last:border-0 flex items-center space-x-3"
                  >
                    <img 
                      src={product.images[0]} 
                      alt={product.title}
                      className="w-10 h-10 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{product.short}</p>
                      <p className="text-xs font-bold text-primary">{formatPrice(product.price)}</p>
                    </div>
                  </button>
                ))}
                {searchQuery.trim() && (
                  <button
                    onClick={() => handleSearchSubmit({ preventDefault: () => {} } as React.FormEvent)}
                    className="w-full px-4 py-2 text-left hover:bg-accent/50 transition-colors text-primary text-sm font-medium border-t border-border/20"
                  >
                    Ver todos os resultados para "{searchQuery}"
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Botão de busca mobile */}
          <Button 
            variant="outline" 
            size="icon" 
            className="lg:hidden"
            onClick={() => navigate('/busca')}
          >
            <Search className="w-4 h-4" />
          </Button>

          {/* Botões de ação */}
          <Button variant="outline" size="icon" asChild className="relative">
            <Link to="/carrinho">
              <ShoppingCart className="w-4 h-4" />
              {itemCount > 0 && (
                <Badge className="absolute -top-2 -right-2 w-5 h-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {itemCount}
                </Badge>
              )}
            </Link>
          </Button>

          {user ? (
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/customer">Painel do Cliente</Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <User className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isAdmin ? (
                    <DropdownMenuItem asChild>
                      <Link to="/admin">
                        <Settings className="mr-2 h-4 w-4" />
                        Painel Admin
                      </Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem asChild>
                      <Link to="/customer">
                        <User className="mr-2 h-4 w-4" />
                        Minha Conta
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/meus-pedidos">
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Meus Pedidos
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Button variant="hero" size="sm" asChild>
              <Link to="/auth">Entrar</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}