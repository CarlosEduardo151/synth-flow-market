import { motion } from "framer-motion";
import { TrendingUp, Users, Clock, DollarSign } from "lucide-react";

const stats = [
  {
    icon: DollarSign,
    value: "R$ 2M+",
    label: "Economizados por clientes",
    description: "Em custos operacionais"
  },
  {
    icon: TrendingUp,
    value: "40%",
    label: "Redução em inadimplência",
    description: "Média dos clientes"
  },
  {
    icon: Clock,
    value: "15h",
    label: "Economizadas por semana",
    description: "Em tarefas manuais"
  },
  {
    icon: Users,
    value: "500+",
    label: "Empresas atendidas",
    description: "Em todo Brasil"
  }
];

export const ImpactNumbers = () => {
  return (
    <section className="py-16 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl lg:text-4xl font-bold gradient-text mb-1">
                {stat.value}
              </div>
              <div className="font-medium text-foreground mb-1">
                {stat.label}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.description}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
