import { Product } from '@/types/product';

export const botsAutomacao: Product = {
  title: "Bots de Automação",
  slug: "bots-automacao",
  price: 200000, // R$ 2.000,00 em centavos
  rentalPrice: 100000, // R$ 1.000,00/mês em centavos
  category: "agentes-de-ia",
  images: ["/images/produtos/bots-automacao.png"],
  short: "Bots inteligentes para WhatsApp, Telegram, Discord e Instagram, usados em vendas, suporte e atendimento.",
  badges: ["Compra/Aluguel", "Multi-Plataforma"],
  features: [
    "Bots para múltiplas plataformas",
    "WhatsApp Business integrado",
    "Telegram e Discord",
    "Instagram Direct",
    "Respostas inteligentes",
    "Aprendizado contínuo",
    "Análise de conversas",
    "Dashboard unificado"
  ],
  rentalAdvantages: [
    "💰 Economia de 50% mensalmente",
    "🔄 Flexibilidade total",
    "🚀 Atualizações incluídas",
    "🛠️ Suporte prioritário",
    "📊 Analytics avançado"
  ],
  inStock: true,
  delivery: "Ativação em 3 dias úteis",
  specs: "Compra R$ 2.000 ou Aluguel R$ 1.000/mês",
  content: `
# Bots de Automação

Automatize atendimento e vendas em todas as plataformas de mensagens.

## Funcionalidades

- Bots inteligentes multi-plataforma
- WhatsApp, Telegram, Discord, Instagram
- Respostas automáticas inteligentes
- Aprendizado com cada interação

## Benefícios

- Atendimento 24/7 em todas plataformas
- Redução de 70% em tempo de resposta
- Mais vendas automatizadas
- Equipe focada em casos complexos

## Ideal para

Empresas que usam mensagens para vendas e suporte e querem automatizar processos.
  `
};
