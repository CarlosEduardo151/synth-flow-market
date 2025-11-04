import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";
import { FaDiscord } from "react-icons/fa";
import { CustomerReviews } from "../CustomerReviews";

export function Footer() {
  return (
    <>
      <CustomerReviews />
      <footer className="border-t border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo e descrição */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-primary">
                  <img
                    src="/favicon.ico"
                    alt="Logo"
                    className="w-6 h-6 object-contain rounded-lg"
                  />
                </div>
                <span className="font-bold gradient-text">StarAI Store</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Soluções avançadas em inteligência artificial para empresas
                modernas. Transformamos processos com tecnologia de ponta.
              </p>
            </div>

            {/* Produtos */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Produtos</h3>
              <nav className="space-y-2">
                <Link
                  to="/c/agentes-de-ia"
                  className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Agentes de IA
                </Link>
                <Link
                  to="/c/ia-automatizada"
                  className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  IA Automatizada
                </Link>
                <Link
                  to="/c/micro-empresas"
                  className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Para Micro-Empresas
                </Link>
              </nav>
            </div>

            {/* Empresa */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Empresa</h3>
              <nav className="space-y-2">
                <Link
                  to="/sobre"
                  className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Sobre nós
                </Link>
                <Link
                  to="/termos-de-uso"
                  className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Termos de uso
                </Link>
                <Link
                  to="/politica-de-privacidade"
                  className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Política De Privacidade
                </Link>
              </nav>
            </div>

            {/* Contato */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Contato</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    caduxim0@gmail.com
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    (99) 99189-8399
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Imperatriz, MA
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <FaDiscord className="w-4 h-4 text-muted-foreground" />
                  <a
                    href="https://discord.gg/KWBJXaKPYV"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    https://discord.gg/KWBJXaKPYV
                  </a>
                </div>
              </div>
            </div>
          </div> {/* ✅ fechamento da grid */}

          {/* Copyright */}
          <div className="border-t border-border/50 mt-8 pt-8 text-center">
            <p className="text-sm text-muted-foreground">
              © 2025 StarAI Store. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
