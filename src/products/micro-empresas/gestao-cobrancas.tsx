import { Product } from '@/types/product';

export const gestaoCobrancas: Product = {
  title: "Gestão de Cobranças Automatizada",
  slug: "gestao-cobrancas",
  price: 35000, // R$ 350,00/mês em centavos
  category: "micro-empresas",
  images: ["/images/produtos/gestao-cobrancas.png"],
  short: "Sistema que automatiza o envio de boletos, PIX e cartões, com lembretes e relatórios para reduzir inadimplência.",
  badges: ["Assinatura Mensal", "Reduz Inadimplência"],
  features: [
    "Envio automático de boletos",
    "Integração com PIX",
    "Processamento de cartões",
    "Lembretes automáticos",
    "Relatórios de inadimplência",
    "Gestão de cobranças recorrentes",
    "Notificações por email e WhatsApp",
    "Dashboard de pagamentos",
    "Lembretes automáticos por WhatsApp",
    "Geração de boletos/PIX",
    "Notificações de pagamento"
  ],
  operationManual: [
    { step: "01", action: "Configurar empresa", detail: "Preencha dados fiscais, CNPJ e conta bancária para recebimentos." },
    { step: "02", action: "Integrar gateway de pagamento", detail: "Conecte Mercado Pago, PagSeguro ou banco para emissão de boletos/PIX." },
    { step: "03", action: "Cadastrar clientes", detail: "Importe clientes com CPF/CNPJ, email e telefone para cobrança." },
    { step: "04", action: "Configurar lembretes", detail: "Defina dias antes e após vencimento para envio de lembretes automáticos." },
    { step: "05", action: "Integrar WhatsApp", detail: "Conecte WhatsApp Business para envio de cobranças e lembretes." },
    { step: "06", action: "Definir régua de cobrança", detail: "Configure sequência de mensagens: lembrete, vencido, acordo." },
    { step: "07", action: "Criar cobranças recorrentes", detail: "Configure assinaturas e cobranças mensais automáticas." },
    { step: "08", action: "Monitorar dashboard", detail: "Acompanhe taxas de inadimplência e recebimentos em tempo real." }
  ],
  inStock: true,
  delivery: "Ativação imediata após contratação",
  specs: "Pagamento Mensal - R$ 350/mês",
  content: `
# Gestão de Cobranças Automatizada

Reduza a inadimplência e automatize todo o processo de cobrança do seu negócio.

## Funcionalidades

- Envio automático de boletos, PIX e links de pagamento
- Lembretes inteligentes antes e após o vencimento
- Relatórios completos de inadimplência
- Gestão de cobranças recorrentes

## Vantagens

- Redução de até 70% na inadimplência
- Economia de tempo com automação
- Aumento do fluxo de caixa
- Menos trabalho manual

## Para quem é

Empresas que precisam de um sistema profissional de cobrança sem complicação e com resultados comprovados.

💥 **Promoção de Lançamento!** Aproveite 20% de desconto com o cupom **INAUGURACAO20**.
  `
};
