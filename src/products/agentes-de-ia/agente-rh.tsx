import { Product } from '@/types/product';

export const agenteRH: Product = {
  title: "Agente de RH",
  slug: "agente-rh",
  price: 35000, // R$ 350,00/mês em centavos
  category: "agentes-de-ia",
  images: ["/images/produtos/agente-rh.png"],
  short: "Automatiza recrutamento, triagem de currículos e comunicação inicial com candidatos.",
  badges: ["Assinatura Mensal", "Contratações Rápidas"],
  features: [
    "Triagem automática de currículos",
    "Análise de fit cultural",
    "Agendamento de entrevistas",
    "Comunicação com candidatos",
    "Testes pré-seletivos",
    "Pipeline de recrutamento",
    "Análise de perfil comportamental",
    "Relatórios de contratação"
  ],
  inStock: true,
  delivery: "Ativação em 5 dias úteis",
  specs: "Pagamento Mensal - R$ 350/mês",
  content: `
# Agente de RH

Automatize recrutamento e contrate melhor, mais rápido.

## O que faz

- Triagem automática de currículos
- Avalia fit cultural por IA
- Agenda entrevistas automaticamente
- Mantém candidatos engajados

## Vantagens

- 70% menos tempo em triagem
- Contratações mais assertivas
- Candidatos melhor qualificados
- Processo de RH profissional

## Para quem é

Empresas em crescimento que precisam contratar rapidamente e de forma assertiva.

💥 **Promoção de Lançamento!** Aproveite 20% de desconto com o cupom **INAUGURACAO20**.
  `
};
