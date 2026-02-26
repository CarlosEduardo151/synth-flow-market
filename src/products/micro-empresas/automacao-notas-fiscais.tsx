import { Product } from '@/types/product';

export const automacaoNotasFiscais: Product = {
  title: "Automação de Notas Fiscais",
  slug: "automacao-notas-fiscais",
  price: 49900, // R$ 499,00/mês em centavos
  rentalPrice: 49900,
  category: "micro-empresas",
  images: ["/images/produtos/relatorios-financeiros.png"],
  short: "Motor inteligente que recebe dados de vendas via Webhook/API, valida tributos e emite NF-e/NFS-e automaticamente junto à SEFAZ e prefeituras.",
  badges: ["Assinatura Mensal", "Emissão Automática", "SEFAZ/Prefeitura"],
  features: [
    "Recebimento de vendas via Webhook e API REST",
    "Validação automática de dados tributários (ICMS, ISS, PIS, COFINS)",
    "Emissão automática de NF-e e NFS-e",
    "Comunicação direta com SEFAZ e prefeituras",
    "Integração com Focus NFe e PlugNotas",
    "Dashboard em tempo real com status das notas",
    "Histórico completo de emissões e rejeições",
    "Reenvio automático em caso de falha",
    "Relatórios fiscais por período",
    "Suporte a múltiplas empresas (CNPJ)",
    "Arquitetura modular preparada para ERP",
    "Split de pagamento com comissão automática de 15%"
  ],
  rentalAdvantages: [
    "Elimine erros manuais na emissão de notas",
    "Reduza o tempo de emissão de horas para segundos",
    "Conformidade fiscal garantida com SEFAZ",
    "Pronto para escalar com seu crescimento",
    "Base para futuro ERP completo"
  ],
  operationManual: [
    { step: "01", action: "Cadastrar empresa", detail: "Registre CNPJ, Inscrição Estadual/Municipal e certificado digital A1 da empresa." },
    { step: "02", action: "Configurar tributação", detail: "Defina regime tributário (Simples, Lucro Presumido/Real) e alíquotas padrão." },
    { step: "03", action: "Conectar fonte de vendas", detail: "Configure o Webhook ou API REST que enviará os dados de cada venda ao sistema." },
    { step: "04", action: "Integrar emissor fiscal", detail: "Conecte com Focus NFe ou PlugNotas inserindo as credenciais de API." },
    { step: "05", action: "Testar emissão em homologação", detail: "Envie notas de teste no ambiente de homologação da SEFAZ para validar o fluxo." },
    { step: "06", action: "Ativar produção", detail: "Após validação, ative o modo produção para emissão real de notas fiscais." },
    { step: "07", action: "Monitorar dashboard", detail: "Acompanhe em tempo real o status de cada nota: autorizada, rejeitada ou pendente." },
    { step: "08", action: "Configurar split de pagamento", detail: "Defina a taxa de 15% e configure a conta para recebimento automático da comissão." }
  ],
  requiredCredentials: [
    "CNPJ da empresa",
    "Certificado Digital A1",
    "API Key do emissor fiscal (Focus NFe ou PlugNotas)",
    "Inscrição Estadual ou Municipal"
  ],
  inStock: true,
  delivery: "Ativação em até 48 horas",
  specs: "Pagamento Mensal - R$ 499/mês",
  systemPath: "/sistema/automacao-notas-fiscais",
  content: `
# Automação de Notas Fiscais — Motor Inteligente NovaLink

Automatize 100% da emissão de notas fiscais da sua empresa com o motor inteligente da NovaLink.

## Como Funciona

O sistema recebe os dados de cada venda via **Webhook ou API REST**, valida automaticamente todas as informações tributárias (ICMS, ISS, PIS, COFINS) e se comunica diretamente com os webservices da **SEFAZ** ou da **prefeitura** para autorizar a nota fiscal — tudo sem intervenção humana.

## Diferenciais

- **Emissão em segundos**: Da venda à nota autorizada em menos de 10 segundos
- **Zero erros fiscais**: Validação automática de todos os campos tributários
- **Resiliência total**: Reenvio automático em caso de falha ou timeout
- **Multi-empresa**: Gerencie vários CNPJs em um único painel
- **Preparado para o futuro**: Arquitetura modular que servirá de base para nosso ERP completo

## Split de Pagamento Integrado

O motor financeiro já separa automaticamente **85% para o cliente** e **15% de comissão** antes do dinheiro chegar à conta final, eliminando problemas de inadimplência.

## Integrações

- Focus NFe
- PlugNotas
- SEFAZ (todos os estados)
- Prefeituras (NFS-e)
- Webhooks customizáveis

## Ideal Para

Micro e pequenas empresas que emitem notas fiscais regularmente e querem eliminar o trabalho manual, reduzir erros e garantir conformidade fiscal.

💥 **Promoção de Lançamento!** Aproveite 20% de desconto com o cupom **INAUGURACAO20**.
  `
};
