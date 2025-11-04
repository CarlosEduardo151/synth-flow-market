import { Product } from '@/types/product';

export const agenteSuporte: Product = {
  title: "Agente de Suporte Técnico",
  slug: "agente-suporte",
  price: 35000, // R$ 350,00 em centavos
  rentalPrice: 125000, // R$ 1.250,00/mês em centavos
  category: "agentes-de-ia",
  images: ["/images/produtos/agente-suporte.png"],
  short: "Atende chamados, resolve problemas comuns e encaminha apenas casos complexos para humanos.",
  badges: ["Compra/Aluguel", "24/7"],
  features: [
    "Atendimento técnico 24/7",
    "Resolução automática",
    "Base de conhecimento IA",
    "Escalonamento inteligente",
    "Tutoriais interativos",
    "Diagnóstico automático",
    "Integração com sistemas",
    "Análise de satisfação"
  ],
  rentalAdvantages: [
    "💰 Economia de 50% mensalmente",
    "🔄 Flexibilidade total",
    "🚀 Atualizações incluídas",
    "🛠️ Suporte prioritário",
    "📊 Base de conhecimento expandida"
  ],
  inStock: true,
  delivery: "Ativação em 3 dias úteis",
  specs: "Compra R$ 350 ou Aluguel R$ 1.250/mês",
  content: `
# Agente de Suporte Técnico

Suporte técnico inteligente que resolve 80% dos chamados automaticamente.

## Funcionalidades

- Atendimento técnico 24/7
- Resolve problemas comuns sozinho
- Encaminha casos complexos
- Base de conhecimento sempre atualizada

## Benefícios

- 80% dos chamados resolvidos automaticamente
- Tempo de resposta reduzido
- Equipe focada em casos complexos
- Clientes mais satisfeitos

## Ideal para

Empresas com produtos técnicos que querem oferecer suporte excelente sem aumentar custos.

💥 **Promoção de Lançamento!** Aproveite 20% de desconto com o cupom **INAUGURACAO20**.
  `
};
