import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { 
  Rocket, 
  Target, 
  Globe, 
  Building2, 
  Users, 
  TrendingUp, 
  Lightbulb,
  Award,
  MapPin,
  Calendar
} from "lucide-react";

const timelineData = [
    {
      year: "2025",
      quarter: "Q4",
      title: "Fundação da TechAI",
      description: "Fundação oficial em 15/10/2025 com a missão de democratizar a inteligência artificial para empresas de todos os portes na América Latina.",
      icon: Rocket,
      status: "planned",
      achievements: [
        "Primeira linha de produtos SaaS de IA lançada",
        "20 clientes-piloto ativos",
        "Equipe fundadora e primeiros 10 colaboradores"
      ]
    },
    {
      year: "2026",
      quarter: "Q2",
      title: "Expansão Rápida no Brasil",
      description: "Consolidação no mercado nacional com foco em pequenas e médias empresas.",
      icon: Building2,
      status: "planned",
      achievements: [
        "300+ clientes pagantes",
        "Parcerias com grandes provedores de nuvem",
        "Uptime de 99,99% garantido"
      ]
    },
    {
      year: "2026",
      quarter: "Q4",
      title: "Inovação & Produtos Avançados",
      description: "Criação de IA multimodal e soluções low-code/no-code para empresas implementarem IA sem programação.",
      icon: Lightbulb,
      status: "planned",
      achievements: [
        "Plataforma de IA generativa proprietária",
        "Automação ponta a ponta integrada a ERPs",
        "Laboratório de P&D TechAI Labs"
      ]
    },
    {
      year: "2027",
      quarter: "Q2",
      title: "Escala Latino-Americana",
      description: "Expansão para Argentina, Chile, Colômbia e México com produtos localizados.",
      icon: Globe,
      status: "planned",
      achievements: [
        "Escritórios em 4 países",
        "Localização em espanhol e inglês",
        "Parcerias estratégicas regionais"
      ]
    },
    {
      year: "2027",
      quarter: "Q4",
      title: "Reconhecimento Internacional",
      description: "Tornar-se referência em IA para mercados emergentes.",
      icon: Award,
      status: "vision",
      achievements: [
        "5.000 empresas atendidas",
        "Prêmio internacional de Inovação em IA",
        "Plataforma multilíngue (PT/ES/EN)"
      ]
    },
    {
      year: "2028",
      quarter: "Q2",
      title: "Entrada em Mercados Globais",
      description: "Chegada à Europa e Ásia com soluções culturalmente adaptadas.",
      icon: TrendingUp,
      status: "vision",
      achievements: [
        "Presença em 15 países",
        "IA cultural adaptativa",
        "Hub Global de Inovação em IA"
      ]
    },
    {
      year: "2029",
      quarter: "Q1",
      title: "Impacto Mundial",
      description: "Transformação de 100.000+ empresas globalmente, com foco em IA ética e sustentável.",
      icon: Users,
      status: "vision",
      achievements: [
        "100k+ empresas transformadas",
        "Certificação de IA ética",
        "Sustentabilidade total (carbono zero)"
      ]
    }
  ];
  

const statusColors = {
  completed: "hsl(var(--success))",
  current: "hsl(var(--primary))",
  "in-progress": "hsl(var(--warning))",
  planned: "hsl(var(--accent))",
  vision: "hsl(var(--muted-foreground))"
};

const Jornada = () => {
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
              Nossa <span className="gradient-text">Jornada</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Da visão inicial à transformação global: como estamos revolucionando 
              o mundo dos negócios através da inteligência artificial
            </p>
          </motion.div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="relative">
            {/* Linha principal */}
            <div className="absolute left-8 md:left-1/2 transform md:-translate-x-px h-full w-0.5 bg-gradient-to-b from-primary via-accent to-muted-foreground opacity-30"></div>
            
            <div className="space-y-16">
              {timelineData.map((milestone, index) => {
                const isEven = index % 2 === 0;
                
                return (
                  <motion.div
                    key={`${milestone.year}-${milestone.quarter}`}
                    initial={{ opacity: 0, x: isEven ? -50 : 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className={`relative flex items-center ${
                      isEven ? 'md:flex-row' : 'md:flex-row-reverse'
                    } flex-col md:justify-center`}
                  >
                    {/* Ponto na linha */}
                    <div className="absolute left-8 md:left-1/2 transform md:-translate-x-1/2 -translate-y-1 z-10">
                      <div 
                        className="w-4 h-4 rounded-full border-4 border-background"
                        style={{ backgroundColor: statusColors[milestone.status] }}
                      />
                    </div>

                    {/* Card de conteúdo */}
                    <div className={`w-full md:w-5/12 ml-16 md:ml-0 ${isEven ? 'md:mr-8' : 'md:ml-8'}`}>
                      <div className="tech-border p-8 hover-lift hover-glow">
                        {/* Header do card */}
                        <div className="flex items-center space-x-4 mb-6">
                          <div 
                            className="w-16 h-16 rounded-2xl flex items-center justify-center"
                            style={{ background: `linear-gradient(135deg, ${statusColors[milestone.status]}22, ${statusColors[milestone.status]}11)` }}
                          >
                            <milestone.icon 
                              className="w-8 h-8" 
                              style={{ color: statusColors[milestone.status] }}
                            />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span 
                                className="text-sm font-bold"
                                style={{ color: statusColors[milestone.status] }}
                              >
                                {milestone.year} - {milestone.quarter}
                              </span>
                            </div>
                            <h3 className="text-2xl font-bold">{milestone.title}</h3>
                          </div>
                        </div>

                        {/* Descrição */}
                        <p className="text-muted-foreground leading-relaxed mb-6">
                          {milestone.description}
                        </p>

                        {/* Conquistas */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-foreground">Principais Conquistas:</h4>
                          <ul className="space-y-2">
                            {milestone.achievements.map((achievement, i) => (
                              <li key={i} className="flex items-center space-x-3">
                                <div 
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: statusColors[milestone.status] }}
                                />
                                <span className="text-sm text-muted-foreground">{achievement}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Status badge */}
                        <div className="mt-6">
                          <span 
                            className="px-3 py-1 rounded-full text-xs font-semibold"
                            style={{ 
                              backgroundColor: `${statusColors[milestone.status]}22`,
                              color: statusColors[milestone.status]
                            }}
                          >
                            {milestone.status === 'completed' && 'Concluído'}
                            {milestone.status === 'current' && 'Atual'}
                            {milestone.status === 'in-progress' && 'Em Progresso'}
                            {milestone.status === 'planned' && 'Planejado'}
                            {milestone.status === 'vision' && 'Visão Futura'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Espaçador para desktop */}
                    <div className="hidden md:block w-5/12"></div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Impacto Global */}
      <section className="py-20 bg-card/20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4">
              Nosso <span className="gradient-text">Impacto</span> no Mundo
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Cada marco em nossa jornada representa milhares de empresas transformadas 
              e milhões de pessoas impactadas pela democratização da IA
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Building2,
                number: "500+",
                label: "Empresas Transformadas",
                description: "Negócios revolucionados pela IA"
              },
              {
                icon: Globe,
                number: "15",
                label: "Estados Brasileiros",
                description: "Presença nacional consolidada"
              },
              {
                icon: Users,
                number: "10k+",
                label: "Usuários Ativos",
                description: "Profissionais empoderados pela IA"
              },
              {
                icon: TrendingUp,
                number: "99.9%",
                label: "Uptime Garantido",
                description: "Confiabilidade empresarial"
              }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center group"
              >
                <div className="w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <stat.icon className="w-10 h-10 text-primary-foreground" />
                </div>
                <div className="text-3xl font-bold gradient-text mb-2">{stat.number}</div>
                <h3 className="text-lg font-semibold mb-2">{stat.label}</h3>
                <p className="text-sm text-muted-foreground">{stat.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Jornada;