import { Product } from '@/types/product';

export const agenteIntegracao: Product = {
  title: "Agente de Integração de Sistemas",
  slug: "agente-integracao",
  price: 300000, // R$ 3.000,00 em centavos
  category: "agentes-de-ia",
  images: ["/images/produtos/agente-integracao.png"],
  short: "Conecta diferentes APIs e bancos de dados, mantendo dados sempre sincronizados.",
  badges: ["Assinatura Mensal", "Sincronização Total"],
  features: [
    "Integração de múltiplas APIs",
    "Sincronização automática",
    "Transformação de dados",
    "Monitoramento de erros",
    "Recuperação automática",
    "Logs detalhados",
    "Webhooks inteligentes",
    "Dashboard de integrações"
  ],
  inStock: true,
  delivery: "Ativação em 7 dias úteis",
  specs: "Assinatura mensal - R$ 3.000/mês",
  content: `
# Agente de Integração de Sistemas

Mantenha todos seus sistemas conectados e sincronizados automaticamente.

## Funcionalidades

- Conecta múltiplas APIs
- Sincronização em tempo real
- Transforma dados automaticamente
- Monitora e corrige erros

## Benefícios

- Dados sempre atualizados
- Eliminação de trabalho manual
- Redução de erros humanos
- Processos mais eficientes

## Ideal para

Empresas que usam múltiplos sistemas e precisam mantê-los integrados sem trabalho manual.
  `
};
