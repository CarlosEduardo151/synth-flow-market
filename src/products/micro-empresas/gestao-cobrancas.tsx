import { Product } from '@/types/product';

export const gestaoCobrancas: Product = {
  title: "Gestão de Cobranças Automatizada",
  slug: "gestao-cobrancas",
  price: 250000, // R$ 2.500,00 em centavos
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
    "Dashboard de pagamentos"
  ],
  inStock: true,
  delivery: "Ativação imediata após contratação",
  specs: "Assinatura mensal - R$ 2.500/mês",
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
  `
};
