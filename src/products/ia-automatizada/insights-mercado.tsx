import { Product } from '@/types/product';

export const insightsMercado: Product = {
  title: "Relatórios de Insights de Mercado",
  slug: "insights-mercado",
  price: 300000, // R$ 3.000,00 em centavos
  category: "ia-automatizada",
  images: ["/images/produtos/insights-mercado.png"],
  short: "Relatórios inteligentes com análise de tendências, benchmarking e previsões estratégicas.",
  badges: ["Assinatura Mensal", "Estratégico"],
  features: [
    "Relatórios semanais automáticos",
    "Análise de tendências",
    "Benchmarking competitivo",
    "Previsões estratégicas",
    "Identificação de oportunidades",
    "Análise de consumidor",
    "Mapas de mercado",
    "Recomendações IA"
  ],
  inStock: true,
  delivery: "Primeiro relatório em 7 dias",
  specs: "Assinatura mensal - R$ 3.000/mês",
  content: `
# Relatórios de Insights de Mercado

Inteligência de mercado estratégica na palma da sua mão.

## O que você recebe

- Relatórios semanais detalhados
- Análise profunda de tendências
- Benchmarking com concorrentes
- Previsões estratégicas por IA

## Benefícios

- Decisões estratégicas embasadas
- Identificação de oportunidades
- Vantagem competitiva
- Visão completa do mercado

## Ideal para

Gestores e empresários que precisam de inteligência de mercado para tomar decisões estratégicas.
  `
};
