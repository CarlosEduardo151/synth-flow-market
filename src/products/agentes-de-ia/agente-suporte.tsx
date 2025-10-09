import { Product } from '@/types/product';

export const agenteSuporte: Product = {
  title: "Agente de Suporte Técnico",
  slug: "agente-suporte",
  price: 250000, // R$ 2.500,00 em centavos
  category: "agentes-de-ia",
  images: ["/images/produtos/agente-suporte.png"],
  short: "Atende chamados, resolve problemas comuns e encaminha apenas casos complexos para humanos.",
  badges: ["Assinatura Mensal", "24/7"],
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
  inStock: true,
  delivery: "Ativação em 3 dias úteis",
  specs: "Assinatura mensal - R$ 2.500/mês",
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
  `
};
