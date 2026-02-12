import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { 
  Bot, 
  Zap, 
  Shield, 
  Target, 
  Lightbulb, 
  Users, 
  Award,
  ArrowRight,
  Rocket,
  Brain,
  Globe
} from "lucide-react";

const About = () => {
  const stats = [
    { number: "2025", label: "Fundada em" },
    { number: "500+", label: "Clientes ativos" },
    { number: "10+", label: "Agentes de IA" },
    { number: "99.9%", label: "Uptime" }
  ];

  const values = [
    {
      icon: Lightbulb,
      title: "Inovação",
      description: "Sempre na vanguarda da tecnologia de IA, desenvolvendo soluções que transformam o futuro dos negócios."
    },
    {
      icon: Shield,
      title: "Confiabilidade",
      description: "Segurança e estabilidade são nossa prioridade, garantindo que sua operação nunca pare."
    },
    {
      icon: Users,
      title: "Colaboração",
      description: "Trabalhamos lado a lado com nossos clientes para criar soluções verdadeiramente personalizadas."
    },
    {
      icon: Target,
      title: "Excelência",
      description: "Compromisso com a qualidade em cada linha de código e cada interação com o cliente."
    }
  ];

  const team = [
    {
      name: "Carlos Eduardo F. M.",
      role: "CEO & Fundador",
      description: "Criador de sistemas inteligentes, unindo AI, Discord e web para experiências inovadoras e automatizadas.",
      icon: Brain
    },
    {
      name: "Carlos Eduardo P. B.",
      role: "Diretor de Operações",
      description: "Executor de estratégias inteligentes, unindo operações, marketing e automação para impulsionar o crescimento e a inovação da NovaLink.",
      icon: Lightbulb
    }
  ];

  return (
    <div className="min-h-screen bg-tech-lines">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-5xl lg:text-6xl font-bold mb-6">
              Sobre a <span className="gradient-text">NovaLink</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed mb-8">
              Somos pioneiros na criação de agentes de inteligência artificial que transformam 
              a maneira como as empresas operam. Nossa missão é democratizar o acesso à IA 
              avançada, tornando-a acessível e prática para negócios de todos os tamanhos.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <Button variant="hero" size="lg">
                Nossa jornada
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" size="lg">
                Conheça a equipe
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl font-bold gradient-text mb-2">{stat.number}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl font-bold mb-6">
                Nossa <span className="gradient-text">Missão</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                Acreditamos que a inteligência artificial deve ser uma força democratizadora, 
                capacitando empresas de todos os tamanhos a competir no mercado global. 
                Nossa plataforma torna a IA avançada acessível, prática e lucrativa.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Cada agente que desenvolvemos é projetado para resolver problemas reais, 
                aumentar a eficiência e abrir novas possibilidades de crescimento para 
                nossos clientes.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="tech-border p-8 hover-glow">
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                      <Globe className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-bold">Alcance Global</h3>
                      <p className="text-muted-foreground">Soluções para empresas em 40+ países</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                      <Award className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-bold">Reconhecimento</h3>
                      <p className="text-muted-foreground">Uma das raras potências de IA do Brasil.</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                      <Bot className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-bold">Tecnologia Própria</h3>
                      <p className="text-muted-foreground">100% desenvolvida internamente</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-card/20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4">
              Nossos <span className="gradient-text">Valores</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Os princípios que guiam cada decisão e cada linha de código que escrevemos
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="tech-border p-6 text-center hover-lift hover-glow"
              >
                <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-3">{value.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {value.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4">
              Nossa <span className="gradient-text">Equipe</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Líderes visionários que estão moldando o futuro da inteligência artificial
            </p>
          </motion.div>

          {/* Grid ajustado para duas pessoas e centralizado */}
          <div className="flex flex-col md:flex-row justify-center items-center gap-8">
            {team.slice(0, 2).map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="tech-border p-8 text-center hover-lift hover-glow w-full md:w-1/3"
              >
                <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <member.icon className="w-10 h-10 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">{member.name}</h3>
                <p className="text-primary font-medium mb-3">{member.role}</p>
                <p className="text-muted-foreground leading-relaxed">
                  {member.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* CTA Section */}
      <section className="py-20 bg-gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl mx-auto"
          >
            <h2 className="text-4xl font-bold mb-6">
              Pronto para <span className="gradient-text">transformar</span> seu negócio?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Junte-se a centenas de empresas que já estão usando nossa IA para crescer mais rápido
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="lg">
                Começar agora
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" size="lg">
                Agendar demonstração
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;