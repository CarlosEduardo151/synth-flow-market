import { Product } from '@/types/product';

export const assistenteVendas: Product = {
  title: "Assistente de Vendas com IA",
  slug: "assistente-vendas",
  price: 50000, // R$ 500,00/mês em centavos
  category: "agentes-de-ia",
  images: ["/images/produtos/assistente-vendas.png"],
  short: "Agente que prospecta leads, faz follow-up automático e agenda reuniões para equipes comerciais.",
  badges: ["Assinatura Mensal", "Aumenta Vendas"],
  features: [
    "Prospecção automática de leads",
    "Follow-up inteligente",
    "Agendamento de reuniões",
    "Qualificação de leads",
    "Integração com CRM",
    "Análise de pipeline",
    "Relatórios de vendas",
    "Priorização automática"
  ],
  requiredCredentials: ["OpenAI API Key", "Integração CRM", "Email SMTP"],
  inStock: true,
  delivery: "Ativação em 5 dias úteis",
  specs: "Pagamento Mensal - R$ 500/mês",
  systemPath: "/sistema/assistente-vendas",
  operationManual: [
    {
      step: "01",
      action: "Conectar CRM",
      detail: "Integre com seu CRM atual (HubSpot, Pipedrive, RD Station). Credenciais de API são necessárias."
    },
    {
      step: "02",
      action: "Configurar Email",
      detail: "Configure servidor SMTP para envio de emails automáticos. Use email profissional da empresa."
    },
    {
      step: "03",
      action: "Definir Perfil Ideal",
      detail: "Descreva seu cliente ideal (ICP): segmento, porte, cargo, localização e outros critérios."
    },
    {
      step: "04",
      action: "Criar Templates",
      detail: "Crie templates de emails e mensagens para prospecção, follow-up e agendamento."
    },
    {
      step: "05",
      action: "Configurar Calendário",
      detail: "Conecte Google Calendar ou Outlook para agendamento automático de reuniões."
    },
    {
      step: "06",
      action: "Definir Regras de Follow-up",
      detail: "Configure intervalos entre follow-ups (ex: 2 dias, 5 dias, 10 dias) e quantidade máxima."
    },
    {
      step: "07",
      action: "Importar Base de Leads",
      detail: "Importe sua base atual de leads ou configure fontes de prospecção automática."
    },
    {
      step: "08",
      action: "Ativar Qualificação",
      detail: "Defina critérios de pontuação (lead scoring) para priorizar os melhores leads."
    },
    {
      step: "09",
      action: "Testar Fluxo Completo",
      detail: "Crie um lead de teste e acompanhe todo o fluxo de prospecção até agendamento."
    },
    {
      step: "10",
      action: "Monitorar Métricas",
      detail: "Acompanhe taxa de abertura, resposta e conversão. Ajuste templates conforme resultados."
    }
  ],
  content: `
# Assistente de Vendas com IA

Seu time de vendas turbinado com inteligência artificial.

## O que faz

- Prospecta leads automaticamente
- Faz follow-up no momento certo
- Agenda reuniões qualificadas
- Qualifica leads por IA

## Resultados

- Aumento de 150% em leads qualificados
- 60% mais reuniões agendadas
- Time focado em fechar vendas
- Pipeline sempre cheio

## Para quem é

Equipes comerciais que querem focar em fechar vendas enquanto a IA cuida da prospecção e follow-up.

💥 **Promoção de Lançamento!** Aproveite 20% de desconto com o cupom **INAUGURACAO20**.
  `
};
