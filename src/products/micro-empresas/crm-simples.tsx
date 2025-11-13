import { Product } from '@/types/product';

export const crmSimples: Product = {
  title: "CRM Simples para Microempresas",
  slug: "crm-simples",
  price: 35000, // R$ 350,00/mês em centavos
  category: "micro-empresas",
  images: ["/images/produtos/crm-simples.png"],
  short: "Ferramenta para gerenciar clientes, histórico de compras e contatos de forma prática e acessível.",
  badges: ["Assinatura Mensal", "Fácil de Usar"],
  features: [
    "Gestão completa de clientes",
    "Histórico de compras",
    "Agenda de contatos",
    "Lembretes automáticos",
    "Funil de vendas visual",
    "Relatórios de performance",
    "Integração com WhatsApp",
    "Acesso mobile",
    "Automação de follow-ups",
    "Relatórios de conversão",
    "Integração com calendário"
  ],
  requiredCredentials: ["Dados de contatos", "Configurações de email", "WhatsApp API"],
  inStock: true,
  delivery: "Ativação imediata",
  specs: "Pagamento Mensal - R$ 350/mês",
  content: `
# CRM Simples para Microempresas

Gerencie seus clientes de forma profissional e aumente suas vendas.

## Recursos

- Cadastro completo de clientes
- Histórico de todas as interações
- Funil de vendas visual e intuitivo
- Lembretes de follow-up

## Benefícios

- Nunca perca uma oportunidade de venda
- Relacionamento mais próximo com clientes
- Aumento de vendas recorrentes
- Organização profissional

## Para quem é

Micro empresas que querem organizar vendas e relacionamento com clientes de forma simples e eficaz.

💥 **Promoção de Lançamento!** Aproveite 20% de desconto com o cupom **INAUGURACAO20**.
  `
};
