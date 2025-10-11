import { Product } from '@/types/product';

export const iaAtendimento: Product = {
  title: "IA para Atendimento ao Cliente",
  slug: "ia-atendimento",
  price: 250000, // R$ 2.500,00 em centavos
  rentalPrice: 125000, // R$ 1.250,00/mês em centavos
  category: "ia-automatizada",
  images: ["/images/produtos/ia-atendimento.png"],
  short: "Chatbots inteligentes que entendem linguagem natural e resolvem dúvidas comuns 24/7.",
  badges: ["Compra/Aluguel", "24/7"],
  features: [
    "Chatbot com IA avançada",
    "Entendimento de linguagem natural",
    "Respostas instantâneas 24/7",
    "Múltiplos canais",
    "Aprendizado contínuo",
    "Transferência para humanos",
    "Análise de satisfação",
    "Integração com CRM"
  ],
  rentalAdvantages: [
    "💰 Economia de 50% mensalmente",
    "🔄 Flexibilidade total",
    "🚀 Atualizações incluídas",
    "🛠️ Suporte prioritário",
    "📊 Analytics detalhado"
  ],
  inStock: true,
  delivery: "Ativação em 3 dias úteis",
  specs: "Compra R$ 2.500 ou Aluguel R$ 1.250/mês",
  content: `
# IA para Atendimento ao Cliente

Atendimento inteligente 24/7 que nunca dorme.

## Funcionalidades

- Chatbot com IA avançada
- Compreensão de linguagem natural
- Respostas automáticas e precisas
- Atendimento multi-canal

## Benefícios

- Redução de até 80% em chamados simples
- Atendimento 24/7 sem pausas
- Clientes mais satisfeitos
- Equipe focada em casos complexos

## Para quem é

Empresas que querem oferecer atendimento excelente 24/7 sem aumentar custos com equipe.
  `
};
