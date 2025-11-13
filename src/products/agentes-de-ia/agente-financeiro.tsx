import { Product } from '@/types/product';

export const agenteFinanceiro: Product = {
  title: "Agente Financeiro",
  slug: "agente-financeiro",
  price: 40000, // R$ 400,00/mês em centavos
  category: "agentes-de-ia",
  images: ["/images/produtos/agente-financeiro.png"],
  short: "IA que monitora fluxo de caixa, gera alertas de despesas e faz previsões financeiras.",
  badges: ["Assinatura Mensal", "Controle Total"],
  features: [
    "Monitoramento de fluxo de caixa",
    "Alertas de despesas",
    "Previsões financeiras",
    "Análise de rentabilidade",
    "Recomendações automáticas",
    "Controle de inadimplência",
    "Integração bancária",
    "Relatórios executivos"
  ],
  inStock: true,
  delivery: "Ativação em 5 dias úteis",
  specs: "Pagamento Mensal - R$ 400/mês",
  content: `
# Agente Financeiro

Um CFO virtual gerenciando suas finanças 24/7.

## Funcionalidades

- Monitora fluxo de caixa constantemente
- Alertas inteligentes de despesas
- Previsões financeiras precisas
- Recomendações estratégicas

## Vantagens

- Nunca seja pego de surpresa
- Previsões precisas de caixa
- Identificação de problemas antecipada
- Decisões financeiras embasadas

## Ideal para

Empresas que precisam de controle financeiro profissional sem contratar um CFO full-time.

💥 **Promoção de Lançamento!** Aproveite 20% de desconto com o cupom **INAUGURACAO20**.
  `
};
