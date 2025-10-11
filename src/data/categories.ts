import { Bot, Cpu, Building2 } from "lucide-react";

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
  }
];

export function getCategories(): Category[] {
  return categories.sort((a, b) => a.order - b.order);
}

export function getCategory(slug: string): Category | null {
  return categories.find(category => category.slug === slug) || null;
}