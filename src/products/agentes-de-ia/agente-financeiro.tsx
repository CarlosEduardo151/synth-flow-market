import { Product } from '@/types/product';

export const agenteFinanceiro: Product = {
  title: "Agente Financeiro",
  slug: "agente-financeiro",
  price: 40000, // R$ 400,00/mês em centavos
  category: "agentes-de-ia",
  images: ["/images/produtos/agente-financeiro.png"],
  short: "IA que monitora fluxo de caixa, gera alertas de despesas e faz previsões financeiras.",
  badges: ["Assinatura Mensal", "Controle Total"],
  features: [
    "Monitoramento de fluxo de caixa",
    "Alertas de despesas",
    "Previsões financeiras",
    "Análise de rentabilidade",
    "Recomendações automáticas",
    "Controle de inadimplência",
    "Integração bancária",
    "Relatórios executivos"
  ],
  inStock: true,
  delivery: "Ativação em 5 dias úteis",
  specs: "Pagamento Mensal - R$ 400/mês",
  operationManual: [
    {
      step: "01",
      action: "Conectar Banco",
      detail: "Integre sua conta bancária via Open Banking ou importe extratos CSV/OFX manualmente."
    },
    {
      step: "02",
      action: "Configurar Categorias",
      detail: "Defina categorias de receitas e despesas (folha, aluguel, impostos, etc.) para organização."
    },
    {
      step: "03",
      action: "Definir Orçamento",
      detail: "Configure orçamento mensal por categoria. A IA alertará quando estiver próximo do limite."
    },
    {
      step: "04",
      action: "Cadastrar Contas a Pagar",
      detail: "Insira contas fixas e recorrentes (aluguel, folha, fornecedores) com datas de vencimento."
    },
    {
      step: "05",
      action: "Cadastrar Contas a Receber",
      detail: "Registre vendas e faturas em aberto. O sistema alertará sobre inadimplência."
    },
    {
      step: "06",
      action: "Configurar Alertas",
      detail: "Defina alertas por email/WhatsApp para vencimentos, saldo baixo e metas atingidas."
    },
    {
      step: "07",
      action: "Habilitar Previsões",
      detail: "Ative previsões de fluxo de caixa. O sistema precisa de 30 dias de dados para precisão."
    },
    {
      step: "08",
      action: "Revisar Relatórios",
      detail: "Acesse semanalmente o dashboard para análise de DRE, fluxo de caixa e indicadores."
    },
    {
      step: "09",
      action: "Definir Metas Financeiras",
      detail: "Configure metas de faturamento, lucro e redução de custos para acompanhamento."
    },
    {
      step: "10",
      action: "Consultar IA",
      detail: "Use o chat integrado para perguntas como 'Quanto gastei com marketing este mês?'."
    }
  ],
  content: `
# Agente Financeiro

Um CFO virtual gerenciando suas finanças 24/7.

## Funcionalidades

- Monitora fluxo de caixa constantemente
- Alertas inteligentes de despesas
- Previsões financeiras precisas
- Recomendações estratégicas

## Vantagens

- Nunca seja pego de surpresa
- Previsões precisas de caixa
- Identificação de problemas antecipada
- Decisões financeiras embasadas

## Ideal para

Empresas que precisam de controle financeiro profissional sem contratar um CFO full-time.

💥 **Promoção de Lançamento!** Aproveite 20% de desconto com o cupom **INAUGURACAO20**.
  `
};
