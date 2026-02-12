import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Zap, 
  TrendingUp, 
  Shield, 
  BarChart3, 
  Target, 
  Activity,
  Cpu,
  Clock,
  Lock,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function HowBotWorksPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="container mx-auto px-4 mb-20">
          <motion.div 
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Cpu className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Tecnologia Avançada</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Por Trás da Magia:{' '}
              <span className="gradient-text">Como Nosso Sniper HFT</span>{' '}
              Opera Para Você
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Nossa plataforma utiliza <strong className="text-foreground">Inteligência Artificial</strong> e 
              algoritmos de <strong className="text-foreground">Alta Frequência (HFT)</strong> para operar no 
              mercado de criptomoedas <strong className="text-foreground">24 horas por dia, 7 dias por semana</strong>. 
              Enquanto você descansa, nosso bot trabalha incansavelmente para identificar as melhores oportunidades.
            </p>
          </motion.div>
        </section>

        {/* Section 1: What is HFT Sniper */}
        <section className="container mx-auto px-4 mb-20">
          <motion.div 
            className="glass rounded-2xl p-8 md:p-12 border border-border/50"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  O Coração da Estratégia
                </h2>
                <p className="text-primary font-medium">O Bot Sniper HFT</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                  O <strong className="text-foreground">Sniper HFT</strong> é um robô de trading de última geração, 
                  projetado para identificar e executar operações em <strong className="text-foreground">milissegundos</strong>. 
                  Diferente de traders humanos, ele nunca dorme, nunca se emociona e nunca perde uma oportunidade.
                </p>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Operando em <strong className="text-foreground">gráficos de 1 minuto</strong>, o bot busca 
                  pequenos lucros em grande volume de operações, acumulando ganhos consistentes ao longo do tempo.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 rounded-xl bg-card/50 border border-border/50 text-center">
                  <Clock className="w-8 h-8 text-primary mx-auto mb-3" />
                  <p className="text-2xl font-bold text-foreground">24/7</p>
                  <p className="text-sm text-muted-foreground">Operação Contínua</p>
                </div>
                <div className="p-6 rounded-xl bg-card/50 border border-border/50 text-center">
                  <Zap className="w-8 h-8 text-primary mx-auto mb-3" />
                  <p className="text-2xl font-bold text-foreground">&lt;50ms</p>
                  <p className="text-sm text-muted-foreground">Velocidade de Execução</p>
                </div>
                <div className="p-6 rounded-xl bg-card/50 border border-border/50 text-center">
                  <BarChart3 className="w-8 h-8 text-primary mx-auto mb-3" />
                  <p className="text-2xl font-bold text-foreground">1min</p>
                  <p className="text-sm text-muted-foreground">Timeframe</p>
                </div>
                <div className="p-6 rounded-xl bg-card/50 border border-border/50 text-center">
                  <Target className="w-8 h-8 text-primary mx-auto mb-3" />
                  <p className="text-2xl font-bold text-foreground">100+</p>
                  <p className="text-sm text-muted-foreground">Operações/Dia</p>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Section 2: Smart Filters */}
        <section className="container mx-auto px-4 mb-20">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Filtros Inteligentes</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              A Mira Afiada: Nossos Filtros de Decisão
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              O bot utiliza múltiplos filtros antes de executar qualquer operação, 
              garantindo que apenas as melhores oportunidades sejam aproveitadas.
            </p>
          </motion.div>
          
          <motion.div 
            className="grid md:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {/* Volume Analysis */}
            <motion.div 
              className="glass rounded-2xl p-8 border border-border/50 hover:border-primary/30 transition-all duration-300"
              variants={fadeInUp}
            >
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 w-fit mb-6">
                <BarChart3 className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Análise de Volume</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                O bot opera <strong className="text-foreground">exclusivamente</strong> em moedas com alta liquidez. 
                Isso significa grande volume de negociação, garantindo que possa comprar e vender rapidamente 
                sem impactar o preço.
              </p>
              <div className="flex items-center gap-2 text-sm text-blue-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Liquidez garantida</span>
              </div>
            </motion.div>

            {/* RSI */}
            <motion.div 
              className="glass rounded-2xl p-8 border border-border/50 hover:border-primary/30 transition-all duration-300"
              variants={fadeInUp}
            >
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 w-fit mb-6">
                <Activity className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Índice de Força Relativa (RSI)</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Funciona como um <strong className="text-foreground">"termômetro" do preço</strong>. 
                O bot espera a moeda estar "barata" (RSI abaixo de 55) antes de considerar uma compra, 
                evitando comprar em topos.
              </p>
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Evita compras no topo</span>
              </div>
            </motion.div>

            {/* Rejection Wick */}
            <motion.div 
              className="glass rounded-2xl p-8 border border-border/50 hover:border-primary/30 transition-all duration-300"
              variants={fadeInUp}
            >
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 w-fit mb-6">
                <TrendingUp className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Padrão de Pavio de Rejeição</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                O bot identifica velas de 1 minuto onde o preço tentou cair, mas foi 
                <strong className="text-foreground"> "rejeitado" pelos compradores</strong>. 
                Isso indica um possível ponto de virada para cima.
              </p>
              <div className="flex items-center gap-2 text-sm text-purple-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Identifica reversões</span>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Section 3: Risk Management */}
        <section className="container mx-auto px-4 mb-20">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Proteção do Capital</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Sua Segurança em Primeiro Lugar
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Gerenciamento automático de risco para proteger seu capital enquanto maximiza os lucros.
            </p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {/* Quick Profit Exit */}
            <motion.div 
              className="glass rounded-2xl p-8 border border-green-500/20 bg-green-500/5"
              variants={fadeInUp}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <TrendingUp className="w-8 h-8 text-green-400" />
                </div>
                <span className="text-3xl font-bold text-green-400">+0.8%</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Saída Rápida no Lucro</h3>
              <p className="text-muted-foreground leading-relaxed">
                O bot tem uma <strong className="text-foreground">meta de lucro precisa</strong> (0.8% por operação). 
                Assim que atingida, vende automaticamente, garantindo consistência e evitando a ganância.
              </p>
            </motion.div>

            {/* Stop Loss */}
            <motion.div 
              className="glass rounded-2xl p-8 border border-red-500/20 bg-red-500/5"
              variants={fadeInUp}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <Shield className="w-8 h-8 text-red-400" />
                </div>
                <span className="text-3xl font-bold text-red-400">-0.6%</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Stop Loss Automático</h3>
              <p className="text-muted-foreground leading-relaxed">
                Funciona como uma <strong className="text-foreground">"rede de segurança"</strong>. 
                Se a moeda cair 0.6%, o bot vende automaticamente para evitar perdas maiores e proteger seu capital.
              </p>
            </motion.div>

            {/* Position Control */}
            <motion.div 
              className="glass rounded-2xl p-8 border border-primary/20 bg-primary/5"
              variants={fadeInUp}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
                <span className="text-3xl font-bold text-primary">3 max</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Controle de Posições</h3>
              <p className="text-muted-foreground leading-relaxed">
                O bot limita o número de operações abertas simultaneamente 
                <strong className="text-foreground"> (máximo 3 posições)</strong>, 
                nunca expondo todo o seu capital de uma vez.
              </p>
            </motion.div>
          </motion.div>
        </section>

        {/* Conclusion & CTA */}
        <section className="container mx-auto px-4">
          <motion.div 
            className="glass rounded-2xl p-8 md:p-12 border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
              Trading Inteligente, 24 Horas Por Dia
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl mx-auto mb-8">
              Essa combinação única de <strong className="text-foreground">velocidade</strong>, 
              <strong className="text-foreground"> inteligência artificial</strong> e 
              <strong className="text-foreground"> gerenciamento de risco automatizado</strong> é o que permite 
              a você ter um sistema de trading otimizado funcionando 24/7, sem a necessidade de 
              acompanhar o mercado constantemente. Deixe a tecnologia trabalhar por você.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="group">
                <Link to="/customer">
                  Ver Meu Dashboard
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/">
                  Saiba Mais
                </Link>
              </Button>
            </div>
          </motion.div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
