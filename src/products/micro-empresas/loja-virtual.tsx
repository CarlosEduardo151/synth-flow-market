import { Product } from '@/types/product';

export const lojaVirtual: Product = {
  title: "Loja Virtual Integrada com PIX",
  slug: "loja-virtual",
  price: 175000, // R$ 1.750,00/mês em centavos
  category: "micro-empresas",
  images: ["/images/produtos/loja-virtual.png"],
  short: "E-commerce rápido e acessível, com checkout integrado ao PIX e painel de controle simplificado.",
  badges: ["Assinatura Mensal", "E-commerce Completo"],
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
  operationManual: [
    { step: "01", action: "Configurar loja", detail: "Defina nome, logo, cores e informações da sua empresa." },
    { step: "02", action: "Cadastrar produtos", detail: "Adicione produtos com fotos, descrição, preço e estoque." },
    { step: "03", action: "Configurar PIX", detail: "Integre sua chave PIX para recebimentos instantâneos." },
    { step: "04", action: "Definir frete", detail: "Configure tabela de frete por região ou frete fixo/grátis." },
    { step: "05", action: "Configurar domínio", detail: "Vincule seu domínio personalizado (ex: minhaloja.com.br)." },
    { step: "06", action: "Ativar SSL", detail: "Certificado de segurança já incluso - apenas confirme ativação." },
    { step: "07", action: "Testar checkout", detail: "Faça uma compra teste para validar todo o fluxo de pagamento." },
    { step: "08", action: "Publicar loja", detail: "Ative a loja e divulgue o link nas redes sociais e WhatsApp." }
  ],
  inStock: true,
  delivery: "Entrega em até 20 dias úteis",
  specs: "Pagamento Mensal - R$ 1.750/mês",
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
