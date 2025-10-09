import { Product } from '@/types/product';

export const analisePreditiva: Product = {
  title: "Análise Preditiva de Vendas",
  slug: "analise-preditiva",
  price: 300000, // R$ 3.000,00 em centavos
  category: "ia-automatizada",
  images: ["/images/produtos/analise-preditiva.png"],
  short: "Modelos de IA que preveem demanda futura e ajudam na tomada de decisão de estoque e marketing.",
  badges: ["Assinatura Mensal", "Previsão IA"],
  features: [
    "Previsão de demanda futura",
    "Análise de sazonalidade",
    "Otimização de estoque",
    "Planejamento de marketing",
    "Modelos de IA avançados",
    "Relatórios estratégicos",
    "Alertas proativos",
    "Integração com ERP"
  ],
  inStock: true,
  delivery: "Ativação em 5 dias úteis",
  specs: "Assinatura mensal - R$ 3.000/mês",
  content: `
# Análise Preditiva de Vendas

Preveja o futuro das suas vendas e tome decisões estratégicas.

## O que você recebe

- Previsões precisas de demanda
- Análise de tendências e sazonalidade
- Recomendações de estoque
- Insights para marketing

## Vantagens

- Redução de perdas por estoque parado
- Não perca vendas por falta de produto
- Planejamento mais assertivo
- Decisões baseadas em previsões IA

## Ideal para

Empresas que querem otimizar estoque, reduzir custos e aumentar vendas com previsões inteligentes.
  `
};
