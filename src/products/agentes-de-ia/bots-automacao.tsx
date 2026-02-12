import { Product } from '@/types/product';

export const botsAutomacao: Product = {
  title: "Bots de Automação",
  slug: "bots-automacao",
  price: 25000, // R$ 250,00/mês em centavos
  category: "agentes-de-ia",
  images: ["/images/produtos/bots-automacao.png"],
  short: "Bots inteligentes para WhatsApp, Telegram, Discord e Instagram, usados em vendas, suporte e atendimento.",
  badges: ["Assinatura Mensal", "Multi-Plataforma"],
  features: [
    "Bots para múltiplas plataformas",
    "WhatsApp Business integrado",
    "Telegram e Discord",
    "Instagram Direct",
    "Respostas inteligentes",
    "Aprendizado contínuo",
    "Análise de conversas",
    "Dashboard unificado"
  ],
  inStock: true,
  delivery: "Ativação em 3 dias úteis",
  specs: "Pagamento Mensal - R$ 250/mês",
  operationManual: [
    {
      step: "01",
      action: "Selecionar Plataforma",
      detail: "Escolha entre WhatsApp ou Telegram como plataforma principal. Você pode adicionar mais plataformas posteriormente."
    },
    {
      step: "02",
      action: "Conectar Conta",
      detail: "Para WhatsApp: escaneie o QR Code com seu celular. Para Telegram: insira o token do BotFather."
    },
    {
      step: "03",
      action: "Configurar Personalidade",
      detail: "Defina nome, tom de voz (formal/informal) e área de atuação do bot (vendas, suporte, atendimento)."
    },
    {
      step: "04",
      action: "Criar Respostas Base",
      detail: "Configure as respostas para perguntas frequentes. O bot aprenderá a melhorar com o tempo."
    },
    {
      step: "05",
      action: "Definir Horários",
      detail: "Configure horários de funcionamento automático e mensagens fora do expediente."
    },
    {
      step: "06",
      action: "Testar Bot",
      detail: "Envie mensagens de teste antes de ativar. Verifique se as respostas estão corretas."
    },
    {
      step: "07",
      action: "Ativar Produção",
      detail: "Após validar os testes, ative o bot em produção. Monitore as primeiras conversas."
    },
    {
      step: "08",
      action: "Treinar Continuamente",
      detail: "Revise conversas semanalmente para melhorar respostas. O bot aprende com cada interação."
    }
  ],
  content: `
# Bots de Automação

Automatize atendimento e vendas em todas as plataformas de mensagens.

## Funcionalidades

- Bots inteligentes multi-plataforma
- WhatsApp, Telegram, Discord, Instagram
- Respostas automáticas inteligentes
- Aprendizado com cada interação

## Benefícios

- Atendimento 24/7 em todas plataformas
- Redução de 70% em tempo de resposta
- Mais vendas automatizadas
- Equipe focada em casos complexos

## Ideal para

Empresas que usam mensagens para vendas e suporte e querem automatizar processos.

💥 **Promoção de Lançamento!** Aproveite 20% de desconto com o cupom **INAUGURACAO20**.
  `
};
