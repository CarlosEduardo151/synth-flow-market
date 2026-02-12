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
  operationManual: [
    {
      step: "01",
      action: "Definir Cultura da Empresa",
      detail: "Descreva valores, missão e perfil comportamental ideal. A IA usará para avaliar fit cultural."
    },
    {
      step: "02",
      action: "Criar Perfis de Vagas",
      detail: "Configure modelos de vaga com requisitos técnicos, comportamentais e faixa salarial."
    },
    {
      step: "03",
      action: "Configurar Integração",
      detail: "Conecte com portais de vaga (LinkedIn, Indeed, Catho) para receber candidaturas automaticamente."
    },
    {
      step: "04",
      action: "Definir Critérios de Triagem",
      detail: "Configure filtros obrigatórios (experiência mínima, formação, localização, idiomas)."
    },
    {
      step: "05",
      action: "Criar Testes Automatizados",
      detail: "Configure testes técnicos e comportamentais para aplicação automática após triagem."
    },
    {
      step: "06",
      action: "Configurar Comunicação",
      detail: "Crie templates de email para cada etapa: recebimento, aprovação, reprovação, convite."
    },
    {
      step: "07",
      action: "Conectar Calendário",
      detail: "Integre calendário dos entrevistadores para agendamento automático de entrevistas."
    },
    {
      step: "08",
      action: "Definir Pipeline",
      detail: "Configure etapas do processo: triagem → teste → entrevista RH → entrevista técnica → proposta."
    },
    {
      step: "09",
      action: "Ativar Ranking de Candidatos",
      detail: "O sistema ranqueará candidatos por aderência. Revise os top 5 de cada vaga."
    },
    {
      step: "10",
      action: "Configurar Feedback Automático",
      detail: "Ative feedback automático para candidatos não aprovados, mantendo boa experiência."
    }
  ],
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
