import { Product } from '@/types/product';

export const postsSociais: Product = {
  title: "Geração de Posts Sociais",
  slug: "posts-sociais",
  price: 100000, // R$ 1.000,00/mês em centavos
  category: "micro-empresas",
  images: ["/images/produtos/posts-sociais.png"],
  short: "Serviço de criação automática de posts para redes sociais, com textos e imagens otimizados para engajamento.",
  badges: ["Assinatura Mensal", "Alto Engajamento"],
  features: [
    "Posts automáticos diários",
    "Textos otimizados por IA",
    "Imagens personalizadas",
    "Agendamento inteligente",
    "Análise de engajamento",
    "Hashtags estratégicas",
    "Múltiplas redes sociais",
    "Relatórios mensais"
  ],
  operationManual: [
    { step: "01", action: "Conectar redes sociais", detail: "Vincule suas contas do Instagram, Facebook, LinkedIn e Twitter." },
    { step: "02", action: "Definir identidade visual", detail: "Configure cores, fontes e estilo visual da sua marca." },
    { step: "03", action: "Escolher tom de voz", detail: "Defina se a comunicação será formal, descontraída ou técnica." },
    { step: "04", action: "Selecionar temas", detail: "Liste os principais assuntos do seu nicho para geração de conteúdo." },
    { step: "05", action: "Configurar calendário", detail: "Defina dias e horários ideais para publicação em cada rede." },
    { step: "06", action: "Definir hashtags", detail: "Configure hashtags estratégicas fixas e variáveis por tema." },
    { step: "07", action: "Revisar posts", detail: "Aprove ou edite os posts gerados antes da publicação automática." },
    { step: "08", action: "Analisar métricas", detail: "Acompanhe engajamento e ajuste estratégia com base nos relatórios." }
  ],
  inStock: true,
  delivery: "Ativação em 48 horas",
  specs: "Pagamento Mensal - R$ 1.000/mês",
  content: `
# Geração de Posts Sociais

Mantenha suas redes sociais sempre ativas com conteúdo de qualidade automatizado.

## O que você recebe

- Posts diários criados automaticamente
- Textos e imagens otimizados por IA
- Agendamento inteligente
- Análise de performance

## Benefícios

- Presença constante nas redes sociais
- Aumento de engajamento
- Mais tempo para focar no negócio
- Conteúdo profissional sempre

## Para quem é

Micro e pequenas empresas que precisam manter presença digital ativa sem dedicar horas diárias às redes sociais.
  `
};
