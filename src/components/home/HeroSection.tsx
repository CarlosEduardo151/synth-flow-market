import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star } from "lucide-react";
import heroBannerVideo from "@/assets/hero-banner.mp4";

export const HeroSection = () => {
  return (
    <section className="relative py-20 overflow-hidden">
      {/* Vídeo como background */}
      <video
        src={heroBannerVideo}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Fade sobre o vídeo */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent"></div>
      {/* Fade inferior para transição */}
      <div className="absolute bottom-0 left-0 right-0 h-60 bg-gradient-to-t from-background via-background/80 to-transparent"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              {/* Badge de urgência */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-sm border border-primary/30 rounded-full px-4 py-2 text-sm text-primary-foreground"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Vagas limitadas para Dezembro
              </motion.div>

              {/* Headline focado em resultado */}
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight text-white">
                <span className="gradient-text">Reduza 40% da inadimplência</span>
                <br />
                <span className="text-white">em até 30 dias com</span>
                <br />
                <span className="text-white">Agentes de IA</span>
              </h1>
              
              {/* Subheadline com benefícios específicos */}
              <p className="text-lg lg:text-xl text-gray-200 leading-relaxed max-w-lg">
                Automatize cobranças, organize seus clientes e tenha relatórios prontos 
                <strong className="text-white"> sem precisar de equipe técnica</strong>. 
                Soluções prontas para microempresas.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://wa.me/559991898399?text=Olá!%20Quero%20saber%20mais%20sobre%20os%20Agentes%20de%20IA"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="hero" size="xl" className="group w-full sm:w-auto">
                  Falar com Especialista
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>
              <Link to="/planos">
                <Button size="xl" className="group w-full sm:w-auto bg-violet-700 hover:bg-violet-800 text-white border-0">
                  Planos
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>

            {/* Stats com números de impacto */}
            <div className="flex items-center space-x-8 pt-8 text-white">
              <div className="text-center">
                <div className="text-3xl font-bold gradient-text">R$ 2M+</div>
                <div className="text-sm text-gray-300">Economizados</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold gradient-text">500+</div>
                <div className="text-sm text-gray-300">Clientes ativos</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <div className="text-sm text-gray-300">4.9/5 Avaliação</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
