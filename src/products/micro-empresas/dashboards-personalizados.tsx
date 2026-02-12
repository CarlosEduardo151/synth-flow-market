import { Product } from '@/types/product';

export const dashboardsPersonalizados: Product = {
  title: "Dashboards de Dados Personalizados",
  slug: "dashboards-personalizados",
  price: 40000, // R$ 400,00/mês em centavos
  category: "micro-empresas",
  images: ["/images/produtos/dashboard-personalizados.png"],
  short: "Dashboards interativos e personalizados para pequenas empresas acompanharem métricas de vendas, clientes e finanças em tempo real.",
  badges: ["Assinatura Mensal", "Dados em Tempo Real"],
  features: [
    "Dashboards totalmente personalizados",
    "Métricas de vendas em tempo real",
    "Acompanhamento de clientes",
    "Análise financeira completa",
    "Interface intuitiva e responsiva",
    "Manutenção opcional incluída",
    "Relatórios exportáveis",
    "Suporte técnico"
  ],
  operationManual: [
    { step: "01", action: "Definir métricas", detail: "Liste as principais métricas que você precisa acompanhar (vendas, clientes, finanças)." },
    { step: "02", action: "Conectar fontes de dados", detail: "Integre planilhas Excel, Google Sheets ou banco de dados existente." },
    { step: "03", action: "Configurar atualização", detail: "Defina a frequência de atualização dos dados (tempo real, diário, semanal)." },
    { step: "04", action: "Personalizar visualização", detail: "Escolha tipos de gráficos e cores que melhor representam seus dados." },
    { step: "05", action: "Configurar alertas", detail: "Defina notificações para quando métricas atingirem valores críticos." },
    { step: "06", action: "Definir permissões", detail: "Configure quem pode visualizar cada dashboard e seção." },
    { step: "07", action: "Testar integrações", detail: "Valide que todos os dados estão sendo exibidos corretamente." },
    { step: "08", action: "Agendar relatórios", detail: "Configure envio automático de relatórios por email em PDF/Excel." }
  ],
  inStock: true,
  delivery: "Entrega em até 15 dias úteis",
  specs: "Pagamento Mensal - R$ 400/mês",
  content: `
# Dashboards de Dados Personalizados

Transforme dados em decisões estratégicas com nossos dashboards personalizados.

## O que você recebe

- Dashboard totalmente customizado para seu negócio
- Visualização de métricas em tempo real
- Gráficos interativos e intuitivos
- Integração com suas ferramentas atuais

## Benefícios

- Tome decisões baseadas em dados reais
- Acompanhe o desempenho do seu negócio 24/7
- Identifique oportunidades rapidamente
- Melhore a eficiência operacional

## Ideal para

Micro e pequenas empresas que precisam acompanhar vendas, clientes e finanças de forma profissional e acessível.

💥 **Promoção de Lançamento!** Aproveite 20% de desconto com o cupom **INAUGURACAO20**.
  `
};
