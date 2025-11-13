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
