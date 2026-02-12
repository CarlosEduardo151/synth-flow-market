import { Product } from '@/types/product';

export const relatoriosFinanceiros: Product = {
  title: "Relatórios Financeiros Automáticos",
  slug: "relatorios-financeiros",
  price: 25000, // R$ 250,00/mês em centavos
  category: "micro-empresas",
  images: ["/images/produtos/relatorios-financeiros.png"],
  short: "Relatórios prontos de fluxo de caixa, despesas e lucros, sempre atualizados com base nas vendas.",
  badges: ["Assinatura Mensal", "Sempre Atualizado"],
  features: [
    "Relatórios automáticos diários",
    "Fluxo de caixa em tempo real",
    "Análise de despesas",
    "Cálculo de lucros",
    "Projeções financeiras",
    "Alertas inteligentes",
    "Gráficos visuais",
    "Exportação em PDF/Excel"
  ],
  operationManual: [
    { step: "01", action: "Conectar fontes de dados", detail: "Integre planilhas, sistema de vendas ou banco de dados existente." },
    { step: "02", action: "Categorizar transações", detail: "Defina categorias de receitas e despesas do seu negócio." },
    { step: "03", action: "Configurar fluxo de caixa", detail: "Defina saldo inicial e contas bancárias a monitorar." },
    { step: "04", action: "Definir metas financeiras", detail: "Configure objetivos mensais de faturamento e controle de custos." },
    { step: "05", action: "Configurar alertas", detail: "Defina notificações para contas a pagar e limites de gastos." },
    { step: "06", action: "Personalizar relatórios", detail: "Escolha quais métricas e gráficos aparecem no seu dashboard." },
    { step: "07", action: "Agendar envios", detail: "Configure relatórios automáticos diários/semanais por email." },
    { step: "08", action: "Exportar dados", detail: "Baixe relatórios em PDF ou Excel para compartilhar com contador." }
  ],
  inStock: true,
  delivery: "Ativação em 24 horas",
  specs: "Pagamento Mensal - R$ 250/mês",
  content: `
# Relatórios Financeiros Automáticos

Tenha controle total das finanças da sua empresa com relatórios sempre atualizados.

## O que você recebe

- Relatórios diários automáticos
- Fluxo de caixa em tempo real
- Análise completa de despesas
- Projeções financeiras

## Vantagens

- Decisões baseadas em dados reais
- Controle financeiro profissional
- Economia de tempo
- Previsão de problemas

## Ideal para

Microempresas que precisam de controle financeiro profissional sem precisar de contador em tempo integral.

💥 **Promoção de Lançamento!** Aproveite 20% de desconto com o cupom **INAUGURACAO20**.
  `
};
