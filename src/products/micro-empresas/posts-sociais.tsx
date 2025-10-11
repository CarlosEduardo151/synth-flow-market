import { Product } from '@/types/product';

export const postsSociais: Product = {
  title: "Geração de Posts Sociais",
  slug: "posts-sociais",
  price: 200000, // R$ 2.000,00 em centavos
  rentalPrice: 100000, // R$ 1.000,00/mês em centavos
  category: "micro-empresas",
  images: ["/images/produtos/posts-sociais.png"],
  short: "Serviço de criação automática de posts para redes sociais, com textos e imagens otimizados para engajamento.",
  badges: ["Compra/Aluguel", "Alto Engajamento"],
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
  rentalAdvantages: [
    "💰 Economia de 50% mensalmente",
    "🔄 Cancele quando quiser sem multa",
    "🚀 Todas as atualizações incluídas",
    "🛠️ Suporte prioritário",
    "📊 Analytics avançado incluído"
  ],
  inStock: true,
  delivery: "Ativação em 48 horas",
  specs: "Compra R$ 2.000 ou Aluguel R$ 1.000/mês",
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
