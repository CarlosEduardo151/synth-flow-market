import { Product } from '@/types/product';

export const lojaVirtual: Product = {
  title: "Loja Virtual Integrada com PIX",
  slug: "loja-virtual",
  price: 350000, // R$ 3.500,00 em centavos
  rentalPrice: 175000, // R$ 1.750,00/mês em centavos
  category: "micro-empresas",
  images: ["/images/produtos/loja-virtual.png"],
  short: "E-commerce rápido e acessível, com checkout integrado ao PIX e painel de controle simplificado.",
  badges: ["Compra ou Aluguel", "E-commerce Completo"],
  features: [
    "Loja completa e responsiva",
    "Checkout com PIX integrado",
    "Painel administrativo",
    "Gestão de produtos",
    "Controle de estoque",
    "Relatórios de vendas",
    "Certificado SSL incluído",
    "Suporte técnico mensal"
  ],
  rentalAdvantages: [
    "💰 Economia de 50% mensalmente",
    "🔄 Flexibilidade total - cancele quando quiser",
    "🚀 Todas as atualizações incluídas",
    "🛠️ Suporte técnico prioritário",
    "🔐 Backup automático incluído"
  ],
  inStock: true,
  delivery: "Entrega em até 20 dias úteis",
  specs: "Compra R$ 3.500 ou Aluguel R$ 1.750/mês",
  content: `
# Loja Virtual Integrada com PIX

Venda online com uma loja profissional e checkout facilitado com PIX.

## Funcionalidades

- Loja completa e responsiva
- Checkout rápido com PIX
- Painel de controle simplificado
- Gestão completa de produtos

## Vantagens

- Comece a vender online rapidamente
- Receba pagamentos via PIX instantaneamente
- Controle total da sua loja
- Suporte técnico incluído

## Ideal para

Micro empresas que querem iniciar vendas online de forma profissional e sem complicação.
  `
};
