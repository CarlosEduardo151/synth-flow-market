import { Product } from '@/types/product';

export const iaAtendimento: Product = {
  title: "IA para Atendimento ao Cliente",
  slug: "ia-atendimento",
  price: 35000, // R$ 350,00/mês em centavos
  category: "ia-automatizada",
  images: ["/images/produtos/ia-atendimento.png"],
  short: "Chatbots inteligentes que entendem linguagem natural e resolvem dúvidas comuns 24/7.",
  badges: ["Assinatura Mensal", "24/7"],
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
  inStock: true,
  delivery: "Ativação em 3 dias úteis",
  specs: "Pagamento Mensal - R$ 350/mês",
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

💥 **Promoção de Lançamento!** Aproveite 20% de desconto com o cupom **INAUGURACAO20**.
  `
};
