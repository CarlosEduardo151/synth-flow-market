import { Product } from '@/types/product';

export const postsSociais: Product = {
  title: "Geração de Posts Sociais",
  slug: "posts-sociais",
  price: 200000, // R$ 2.000,00 em centavos
  category: "micro-empresas",
  images: ["/images/produtos/posts-sociais.png"],
  short: "Serviço de criação automática de posts para redes sociais, com textos e imagens otimizados para engajamento.",
  badges: ["Assinatura Mensal", "Alto Engajamento"],
  features: [
    "Posts automáticos diários",
    "Textos otimizados por IA",
    "Imagens personalizadas",
    "Agendamento inteligente",
    "Análise de engajamento",
    "Hashtags estratégicas",
    "Múltiplas redes sociais",
    "Relatórios mensais"
  ],
  inStock: true,
  delivery: "Ativação em 48 horas",
  specs: "Assinatura mensal - R$ 2.000/mês",
  content: `
# Geração de Posts Sociais

Mantenha suas redes sociais sempre ativas com conteúdo de qualidade automatizado.

## O que você recebe

- Posts diários criados automaticamente
- Textos e imagens otimizados por IA
- Agendamento inteligente
- Análise de performance

## Benefícios

- Presença constante nas redes sociais
- Aumento de engajamento
- Mais tempo para focar no negócio
- Conteúdo profissional sempre

## Para quem é

Micro e pequenas empresas que precisam manter presença digital ativa sem dedicar horas diárias às redes sociais.
  `
};
