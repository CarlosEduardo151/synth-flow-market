import { Product } from '@/types/product';

export const agenteSuporte: Product = {
  title: "Agente de Suporte Técnico",
  slug: "agente-suporte",
  price: 35000, // R$ 350,00/mês em centavos
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
  specs: "Pagamento Mensal - R$ 350/mês",
  operationManual: [
    {
      step: "01",
      action: "Criar Base de Conhecimento",
      detail: "Documente problemas comuns e soluções. Quanto mais completa, melhor o desempenho do bot."
    },
    {
      step: "02",
      action: "Importar FAQs",
      detail: "Importe perguntas frequentes existentes (planilhas, docs) para alimentar o sistema."
    },
    {
      step: "03",
      action: "Configurar Categorias",
      detail: "Defina categorias de chamados (técnico, comercial, financeiro) para direcionamento."
    },
    {
      step: "04",
      action: "Definir Níveis de Suporte",
      detail: "Configure níveis (N1 automático, N2 humano, N3 especialista) e critérios de escalonamento."
    },
    {
      step: "05",
      action: "Integrar Canais",
      detail: "Conecte canais de atendimento: email, chat do site, WhatsApp, formulário de contato."
    },
    {
      step: "06",
      action: "Configurar SLA",
      detail: "Defina tempo máximo de resposta por categoria e prioridade (crítico, alto, médio, baixo)."
    },
    {
      step: "07",
      action: "Criar Fluxos de Diagnóstico",
      detail: "Configure perguntas sequenciais para diagnóstico automático de problemas."
    },
    {
      step: "08",
      action: "Definir Escalonamento",
      detail: "Configure quando e para quem escalonar: palavras-chave, tempo sem solução, frustração."
    },
    {
      step: "09",
      action: "Ativar Pesquisa de Satisfação",
      detail: "Configure CSAT automático após cada atendimento para medir qualidade."
    },
    {
      step: "10",
      action: "Treinar com Histórico",
      detail: "Importe histórico de atendimentos anteriores para o bot aprender com casos reais."
    }
  ],
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
