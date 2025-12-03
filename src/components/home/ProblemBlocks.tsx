import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  FileWarning, 
  Users, 
  TrendingDown,
  ArrowRight 
} from "lucide-react";

const problems = [
  {
    icon: Clock,
    title: "Gastando tempo demais em cobranças?",
    description: "Automatize lembretes e reduza inadimplência em até 40% sem esforço manual.",
    cta: "Ver Sistema de Cobranças",
    link: "/p/gestao-cobrancas",
    color: "from-red-500/20 to-orange-500/20",
    borderColor: "border-red-500/30"
  },
  {
    icon: FileWarning,
    title: "Dados financeiros confusos?",
    description: "Relatórios automáticos prontos todos os dias. Saiba exatamente seu fluxo de caixa.",
    cta: "Ver Relatórios Financeiros",
    link: "/p/relatorios-financeiros",
    color: "from-yellow-500/20 to-amber-500/20",
    borderColor: "border-yellow-500/30"
  },
  {
    icon: Users,
    title: "Perdendo clientes por falta de organização?",
    description: "CRM simples que organiza seus clientes e aumenta suas vendas em até 30%.",
    cta: "Ver CRM Simples",
    link: "/p/crm-simples",
    color: "from-blue-500/20 to-cyan-500/20",
    borderColor: "border-blue-500/30"
  },
  {
    icon: TrendingDown,
    title: "Clientes não voltam a comprar?",
    description: "Programa de fidelidade automático que aumenta a retenção e o ticket médio.",
    cta: "Ver Sistema de Fidelidade",
    link: "/p/fidelidade-digital",
    color: "from-purple-500/20 to-pink-500/20",
    borderColor: "border-purple-500/30"
  }
];

export const ProblemBlocks = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Qual desses <span className="gradient-text">problemas</span> você enfrenta?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Clique no problema que mais te afeta e descubra a solução ideal
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {problems.map((problem, index) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Link to={problem.link} className="group block h-full">
                <div className={`relative overflow-hidden rounded-2xl border ${problem.borderColor} bg-gradient-to-br ${problem.color} p-6 h-full transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-background/50 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                      <problem.icon className="w-7 h-7 text-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2 text-foreground group-hover:text-primary transition-colors">
                        {problem.title}
                      </h3>
                      <p className="text-muted-foreground mb-4 leading-relaxed">
                        {problem.description}
                      </p>
                      <Button variant="ghost" size="sm" className="p-0 h-auto text-primary group-hover:translate-x-2 transition-transform">
                        {problem.cta}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
