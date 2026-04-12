import { Product } from '@/types/product';

export const microBusinessSuite: Product = {
  title: "Micro-Business Suite",
  slug: "micro-business-suite",
  price: 39900,
  rentalPrice: 19900,
  category: "agentes-de-ia",
  images: ["/images/produtos/micro-business-suite.png"],
  short: "Automação total de vendas, CRM invisível e marketing One-Click para MEIs, oficinas, lojas e prestadores de serviço.",
  badges: ["Assinatura Mensal", "IA Avançada", "WhatsApp"],
  features: [
    "Venda Automática via WhatsApp",
    "CRM Invisível (Zero Data Entry)",
    "Geração de criativos com IA (FLUX.1)",
    "Publicação direta no Meta Ads",
    "Análise visual de produtos",
    "Transcrição de áudio instantânea",
    "Extração automática de leads",
    "Dashboard completo de campanhas"
  ],
  rentalAdvantages: [
    "Sem fidelidade ou contrato",
    "Suporte prioritário incluso",
    "Atualizações automáticas",
    "Cancele quando quiser"
  ],
  inStock: true,
  delivery: "Ativação em 24 horas",
  specs: "Compra: R$ 399 | Aluguel: R$ 199/mês",
  systemPath: "/sistema/micro-business-suite",
  operationManual: [
    {
      step: "01",
      action: "Enviar Foto do Produto",
      detail: "Envie uma foto do seu produto ou serviço pelo WhatsApp. A IA analisa e gera descrições profissionais automaticamente."
    },
    {
      step: "02",
      action: "Revisar Criativo Gerado",
      detail: "A IA gera arte publicitária e 3 opções de copy persuasiva. Escolha a melhor para o seu negócio."
    },
    {
      step: "03",
      action: "Publicar Anúncio",
      detail: "Com um clique, publique o anúncio diretamente no Meta Ads com orçamento otimizado para micro-empresas."
    },
    {
      step: "04",
      action: "CRM Automático",
      detail: "Todo atendimento via WhatsApp alimenta seu CRM automaticamente — nome, contato, interesse e intenção de compra são extraídos pela IA."
    },
    {
      step: "05",
      action: "Acompanhar Resultados",
      detail: "Monitore leads, conversões e campanhas no dashboard integrado com métricas em tempo real."
    }
  ]
};
