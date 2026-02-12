import { Product } from '@/types/product';

export const fidelidadeDigital: Product = {
  title: "Sistema de Fidelidade Digital",
  slug: "fidelidade-digital",
  price: 25000, // R$ 250,00/mês em centavos
  category: "micro-empresas",
  images: ["/images/produtos/fidelidade-digital.png"],
  short: "Programa de pontos e recompensas para clientes, integrado ao WhatsApp e apps de fidelização.",
  badges: ["Assinatura Mensal", "Fideliza Clientes"],
  features: [
    "Programa de pontos automático",
    "Recompensas personalizadas",
    "Integração com WhatsApp",
    "App de fidelização",
    "Gamificação de vendas",
    "Cupons e promoções",
    "Análise de comportamento",
    "Notificações push",
    "Gamificação (badges, níveis)",
    "Cashback automático",
    "Cupons personalizados"
  ],
  operationManual: [
    { step: "01", action: "Configurar programa", detail: "Defina nome do programa e regras de conversão (ex: R$1 = 1 ponto)." },
    { step: "02", action: "Cadastrar recompensas", detail: "Crie as recompensas disponíveis e quantidade de pontos necessária." },
    { step: "03", action: "Integrar WhatsApp", detail: "Conecte o WhatsApp Business para notificações automáticas." },
    { step: "04", action: "Configurar gamificação", detail: "Defina badges, níveis e desafios para engajar clientes." },
    { step: "05", action: "Cadastrar clientes", detail: "Importe sua base existente ou cadastre clientes conforme compram." },
    { step: "06", action: "Definir cashback", detail: "Configure percentual de cashback automático por compra." },
    { step: "07", action: "Criar cupons", detail: "Gere cupons personalizados para datas especiais e promoções." },
    { step: "08", action: "Ativar notificações", detail: "Configure mensagens automáticas de pontos, aniversário e promoções." }
  ],
  inStock: true,
  delivery: "Ativação em 48 horas",
  specs: "Pagamento Mensal - R$ 250/mês",
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
