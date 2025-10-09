import { Product } from '@/types/product';

export const automacaoEmails: Product = {
  title: "Automação de E-mails com IA",
  slug: "automacao-emails",
  price: 180000, // R$ 1.800,00 em centavos
  category: "ia-automatizada",
  images: ["/images/produtos/automacao-emails.png"],
  short: "Envio de campanhas personalizadas, segmentação de clientes e otimização automática de aberturas.",
  badges: ["Assinatura Mensal", "Personalizado"],
  features: [
    "Campanhas personalizadas por IA",
    "Segmentação inteligente",
    "Otimização de horários",
    "Testes A/B automáticos",
    "Templates profissionais",
    "Análise de performance",
    "Recuperação de carrinho",
    "Fluxos automatizados"
  ],
  inStock: true,
  delivery: "Ativação em 48 horas",
  specs: "Assinatura mensal - R$ 1.800/mês",
  content: `
# Automação de E-mails com IA

Envie e-mails que convertem, personalizados por inteligência artificial.

## O que você recebe

- Campanhas criadas e enviadas por IA
- Segmentação automática de clientes
- Otimização de horários de envio
- Personalização em massa

## Resultados

- Aumento de 200% em taxa de abertura
- Mais conversões
- Menos trabalho manual
- E-mails sempre relevantes

## Ideal para

Empresas que querem aumentar vendas através de e-mail marketing personalizado e automatizado.
  `
};
