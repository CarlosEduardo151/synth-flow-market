import { Product } from '@/types/product';

export const webScraping: Product = {
  title: "Web Scraping Automatizado",
  slug: "web-scraping",
  price: 250000, // R$ 2.500,00 em centavos (compra)
  rentalPrice: 180000, // R$ 1.800,00/mês em centavos
  category: "ia-automatizada",
  images: ["/images/produtos/web-scraping.png"],
  short: "Extração de dados da internet em tempo real, monitorando preços, concorrentes e tendências de mercado.",
  badges: ["Assinatura Mensal", "Tempo Real"],
  features: [
    "Extração automática de dados",
    "Monitoramento de preços",
    "Análise de concorrência",
    "Tendências de mercado",
    "Alertas inteligentes",
    "Relatórios personalizados",
    "API de integração",
    "Dados estruturados"
  ],
  rentalAdvantages: [
    "💰 Economia de 28% no valor mensal",
    "🔄 Sem comprometimento de longo prazo",
    "🚀 Atualizações automáticas incluídas",
    "🛠️ Suporte técnico prioritário",
    "📊 Credenciais gerenciadas automaticamente"
  ],
  requiredCredentials: ["API Keys para sites alvo", "Configurações de proxy"],
  inStock: true,
  delivery: "Ativação em 72 horas",
  specs: "Assinatura mensal - R$ 2.500/mês (compra) ou R$ 1.800/mês (aluguel)",
  content: `
# Web Scraping Automatizado

Extraia inteligência de mercado automaticamente da internet.

## O que você recebe

- Extração automática de dados
- Monitoramento 24/7 de concorrentes
- Análise de tendências em tempo real
- Alertas de mudanças importantes

## Benefícios

- Decisões baseadas em dados de mercado
- Vantagem competitiva
- Identificação de oportunidades
- Economia de tempo

## Ideal para

Empresas que precisam monitorar concorrência, preços e tendências de mercado constantemente.
  `
};
