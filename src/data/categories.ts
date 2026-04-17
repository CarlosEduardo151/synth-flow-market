import { Bot, Cpu, Building2, Nfc } from "lucide-react";

export interface Category {
  title: string;
  slug: string;
  icon: typeof Bot;
  summary: string;
  order: number;
  content?: string;
}

export const categories: Category[] = [
  {
    title: "Agentes de IA",
    slug: "agentes-de-ia",
    icon: Bot,
    summary: "Soluções de agentes inteligentes para automação e atendimento.",
    order: 1
  },
  {
    title: "IA Automatizada",
    slug: "ia-automatizada", 
    icon: Cpu,
    summary: "Sistemas de inteligência artificial para automação de processos.",
    order: 2
  },
  {
    title: "Para Micro-Empresas",
    slug: "micro-empresas",
    icon: Building2,
    summary: "Soluções de IA para melhorar desempenho, faturamento e reconhecimento empresarial.",
    order: 3
  },
  {
    title: "NFC",
    slug: "nfc",
    icon: Nfc,
    summary: "Sistemas inteligentes com tecnologia NFC para identificação e automação.",
    order: 4
  },
  // Soluções Automotivas (Auditt) — DESATIVADA TEMPORARIAMENTE do catálogo público.
  // Todo o sistema permanece intacto em src/products/solucoes-automotivas/ e nas rotas /auditt e /sistema/gestao-frotas-oficinas.
  // Para reativar: descomente o objeto abaixo.
  // {
  //   title: "Soluções Automotivas",
  //   slug: "solucoes-automotivas",
  //   icon: Truck,
  //   summary: "Gestão inteligente de frotas e oficinas com IA de auditoria, split de pagamento e pagamento D+1.",
  //   order: 5
  // }
];

export function getCategories(): Category[] {
  return categories.sort((a, b) => a.order - b.order);
}

export function getCategory(slug: string): Category | null {
  return categories.find(category => category.slug === slug) || null;
}