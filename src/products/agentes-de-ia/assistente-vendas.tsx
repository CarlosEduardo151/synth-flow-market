import { Product } from '@/types/product';

export const assistenteVendas: Product = {
  title: "Assistente de Vendas com IA",
  slug: "assistente-vendas",
  price: 50000, // R$ 500,00 em centavos (compra)
  rentalPrice: 250000, // R$ 2.500,00/mês em centavos
  category: "agentes-de-ia",
  images: ["/images/produtos/assistente-vendas.png"],
  short: "Agente que prospecta leads, faz follow-up automático e agenda reuniões para equipes comerciais.",
  badges: ["Assinatura Mensal", "Aumenta Vendas"],
  features: [
    "Prospecção automática de leads",
    "Follow-up inteligente",
    "Agendamento de reuniões",
    "Qualificação de leads",
    "Integração com CRM",
    "Análise de pipeline",
    "Relatórios de vendas",
    "Priorização automática"
  ],
  rentalAdvantages: [
    "💰 Economia de 29% no valor mensal",
    "🔄 Cancele quando quiser",
    "🚀 Atualizações e melhorias contínuas",
    "🤝 Suporte dedicado incluído",
    "🔐 Todas as credenciais configuradas automaticamente"
  ],
  requiredCredentials: ["OpenAI API Key", "Integração CRM", "Email SMTP"],
  inStock: true,
  delivery: "Ativação em 5 dias úteis",
  specs: "Assinatura mensal - R$ 500/mês (compra) ou R$ 2.500/mês (aluguel)",
  content: `
# Assistente de Vendas com IA

Seu time de vendas turbinado com inteligência artificial.

## O que faz

- Prospecta leads automaticamente
- Faz follow-up no momento certo
- Agenda reuniões qualificadas
- Qualifica leads por IA

## Resultados

- Aumento de 150% em leads qualificados
- 60% mais reuniões agendadas
- Time focado em fechar vendas
- Pipeline sempre cheio

## Para quem é

Equipes comerciais que querem focar em fechar vendas enquanto a IA cuida da prospecção e follow-up.

💥 **Promoção de Lançamento!** Aproveite 20% de desconto com o cupom **INAUGURACAO20**.
  `
};
