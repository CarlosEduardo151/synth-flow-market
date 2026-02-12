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
  operationManual: [
    { step: "01", action: "Acessar o sistema", detail: "Entre com seu email e senha cadastrados na plataforma." },
    { step: "02", action: "Configurar empresa", detail: "Preencha nome da empresa, CNPJ e informações de contato." },
    { step: "03", action: "Importar contatos", detail: "Importe sua base de clientes via CSV ou adicione manualmente." },
    { step: "04", action: "Configurar funil de vendas", detail: "Defina as etapas do seu processo comercial (Lead, Proposta, Negociação, Fechado)." },
    { step: "05", action: "Integrar WhatsApp", detail: "Conecte sua conta do WhatsApp Business para comunicação direta." },
    { step: "06", action: "Configurar email", detail: "Adicione suas credenciais SMTP para envio de emails automáticos." },
    { step: "07", action: "Definir lembretes", detail: "Configure alertas automáticos para follow-ups e tarefas pendentes." },
    { step: "08", action: "Treinar equipe", detail: "Adicione usuários e defina permissões de acesso por perfil." }
  ],
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
