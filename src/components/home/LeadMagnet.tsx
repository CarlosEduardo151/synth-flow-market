import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, CheckCircle2, Download, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const LeadMagnet = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Por favor, insira seu e-mail");
      return;
    }

    setIsLoading(true);
    
    // Simula envio - você pode integrar com seu backend aqui
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSubmitted(true);
    toast.success("E-book enviado para seu e-mail!");
    setIsLoading(false);
  };

  const benefits = [
    "5 automações essenciais para microempresas",
    "Cases reais com ROI comprovado",
    "Checklist de implementação passo a passo",
    "Calculadora de economia inclusa"
  ];

  return (
    <section id="lead-magnet" className="py-20 bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Conteúdo */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 text-sm text-primary">
                <Sparkles className="w-4 h-4" />
                Recurso Gratuito
              </div>

              <h2 className="text-3xl lg:text-4xl font-bold">
                <span className="gradient-text">Guia Completo:</span>
                <br />
                Automação com IA para Microempresas em 2025
              </h2>

              <p className="text-lg text-muted-foreground">
                Descubra como outras microempresas estão economizando até 
                <strong className="text-foreground"> R$ 15.000/mês</strong> com 
                automações simples de IA.
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
            </motion.div>

            {/* Formulário */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="tech-border p-8 bg-card/50 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center">
                    <BookOpen className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">E-book Gratuito</h3>
                    <p className="text-sm text-muted-foreground">PDF + Planilhas</p>
                  </div>
                </div>

                {isSubmitted ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8 text-primary" />
                    </div>
                    <h4 className="text-xl font-bold">E-book Enviado!</h4>
                    <p className="text-muted-foreground">
                      Verifique sua caixa de entrada e spam.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Input
                        type="email"
                        placeholder="Seu melhor e-mail"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12"
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      variant="hero" 
                      size="lg" 
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        "Enviando..."
                      ) : (
                        <>
                          <Download className="w-5 h-5 mr-2" />
                          Baixar E-book Grátis
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      Sem spam. Você pode cancelar a qualquer momento.
                    </p>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
