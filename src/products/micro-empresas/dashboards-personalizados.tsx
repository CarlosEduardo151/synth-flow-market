import { Product } from '@/types/product';

export const dashboardsPersonalizados: Product = {
  title: "Dashboards de Dados Personalizados",
  slug: "dashboards-personalizados",
  price: 300000, // R$ 3.000,00 em centavos
  rentalPrice: 150000, // R$ 1.500,00/mês em centavos
  category: "micro-empresas",
  images: ["/images/produtos/dashboard-personalizados.png"],
  short: "Dashboards interativos e personalizados para pequenas empresas acompanharem métricas de vendas, clientes e finanças em tempo real.",
  badges: ["Compra/Aluguel", "Dados em Tempo Real"],
  features: [
    "Dashboards totalmente personalizados",
    "Métricas de vendas em tempo real",
    "Acompanhamento de clientes",
    "Análise financeira completa",
    "Interface intuitiva e responsiva",
    "Manutenção opcional incluída",
    "Relatórios exportáveis",
    "Suporte técnico"
  ],
  rentalAdvantages: [
    "💰 Economia de 50% mensalmente",
    "🔄 Flexibilidade total",
    "🚀 Atualizações automáticas",
    "🛠️ Customização contínua",
    "📊 Suporte técnico incluído"
  ],
  inStock: true,
  delivery: "Entrega em até 15 dias úteis",
  specs: "Compra R$ 3.000 ou Aluguel R$ 1.500/mês",
  content: `
# Dashboards de Dados Personalizados

Transforme dados em decisões estratégicas com nossos dashboards personalizados.

## O que você recebe

- Dashboard totalmente customizado para seu negócio
- Visualização de métricas em tempo real
- Gráficos interativos e intuitivos
- Integração com suas ferramentas atuais

## Benefícios

- Tome decisões baseadas em dados reais
- Acompanhe o desempenho do seu negócio 24/7
- Identifique oportunidades rapidamente
- Melhore a eficiência operacional

## Ideal para

Micro e pequenas empresas que precisam acompanhar vendas, clientes e finanças de forma profissional e acessível.
  `
};
