import { Product } from '@/types/product';

export const precificacaoDinamica: Product = {
  title: "IA para Precificação Dinâmica",
  slug: "precificacao-dinamica",
  price: 35000, // R$ 350,00/mês em centavos
  category: "ia-automatizada",
  images: ["/images/produtos/precificacao-dinamica.png"],
  short: "Sistema que ajusta preços automaticamente de acordo com demanda, concorrência e sazonalidade.",
  badges: ["Assinatura Mensal", "Lucro Máximo"],
  features: [
    "Precificação dinâmica por IA",
    "Análise de concorrência",
    "Ajuste por demanda",
    "Sazonalidade inteligente",
    "Maximização de lucro",
    "Regras personalizáveis",
    "Monitoramento em tempo real",
    "Relatórios de margem"
  ],
  inStock: true,
  delivery: "Ativação em 5 dias úteis",
  specs: "Pagamento Mensal - R$ 350/mês",
  content: `
# IA para Precificação Dinâmica

Maximize lucros com preços inteligentes ajustados automaticamente.

## Funcionalidades

- Ajuste automático de preços
- Análise de concorrência em tempo real
- Otimização por demanda
- Consideração de sazonalidade

## Vantagens

- Aumento de até 30% na margem de lucro
- Competitividade constante
- Preços sempre otimizados
- Decisões baseadas em dados

## Para quem é

E-commerces e varejistas que querem maximizar lucros sem perder competitividade no mercado.

💥 **Promoção de Lançamento!** Aproveite 20% de desconto com o cupom **INAUGURACAO20**.
  `
};
