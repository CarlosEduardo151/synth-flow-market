import { Product } from '@/types/product';

export const agenteMarketing: Product = {
  title: "Agente de Marketing",
  slug: "agente-marketing",
  price: 350000, // R$ 3.500,00 em centavos
  category: "agentes-de-ia",
  images: ["/images/produtos/agente-marketing.png"],
  short: "Criação automática de campanhas publicitárias, monitoramento de resultados e sugestões de melhorias.",
  badges: ["Assinatura Mensal", "ROI Máximo"],
  features: [
    "Criação automática de campanhas",
    "Monitoramento 24/7",
    "Otimização contínua",
    "Análise de concorrência",
    "Sugestões de melhorias",
    "A/B testing automático",
    "Relatórios de ROI",
    "Múltiplas plataformas"
  ],
  inStock: true,
  delivery: "Ativação em 3 dias úteis",
  specs: "Assinatura mensal - R$ 3.500/mês",
  content: `
# Agente de Marketing

Um gerente de marketing digital trabalhando 24/7 para você.

## O que faz

- Cria e gerencia campanhas automaticamente
- Monitora resultados em tempo real
- Otimiza para melhor ROI
- Sugere melhorias continuamente

## Resultados

- Redução de 50% em custo de aquisição
- Aumento de 200% no ROI
- Campanhas sempre otimizadas
- Menos trabalho manual

## Para quem é

Empresas que investem em marketing digital e querem maximizar resultados com gestão automatizada.
  `
};
