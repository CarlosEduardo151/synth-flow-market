import { Product } from '@/types/product';

export const fidelidadeDigital: Product = {
  title: "Sistema de Fidelidade Digital",
  slug: "fidelidade-digital",
  price: 25000, // R$ 250,00 em centavos
  rentalPrice: 90000, // R$ 900,00/mês em centavos
  category: "micro-empresas",
  images: ["/images/produtos/fidelidade-digital.png"],
  short: "Programa de pontos e recompensas para clientes, integrado ao WhatsApp e apps de fidelização.",
  badges: ["Compra ou Aluguel", "Fideliza Clientes"],
  features: [
    "Programa de pontos automático",
    "Recompensas personalizadas",
    "Integração com WhatsApp",
    "App de fidelização",
    "Gamificação de vendas",
    "Cupons e promoções",
    "Análise de comportamento",
    "Notificações push"
  ],
  rentalAdvantages: [
    "💰 Economia de 50% no custo mensal",
    "🔄 Flexibilidade total - cancele quando quiser",
    "🚀 Todas as atualizações incluídas",
    "🛠️ Suporte técnico prioritário",
    "🔐 Backup automático incluído"
  ],
  inStock: true,
  delivery: "Ativação em 48 horas",
  specs: "Compra única R$ 250 ou Aluguel R$ 900/mês",
  content: `
# Sistema de Fidelidade Digital

Transforme clientes em fãs com um programa de fidelidade moderno e eficaz.

## Funcionalidades

- Programa de pontos automático
- Recompensas personalizadas
- Integração total com WhatsApp
- Gamificação de vendas

## Resultados

- Aumento de 40% em vendas recorrentes
- Clientes mais engajados
- Ticket médio maior
- Marketing boca a boca

## Para quem é

Empresas que querem aumentar a retenção de clientes e criar uma base fiel e engajada.

💥 **Promoção de Lançamento!** Aproveite 20% de desconto com o cupom **INAUGURACAO20**.
  `
};
