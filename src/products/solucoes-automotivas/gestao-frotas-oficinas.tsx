import { Product } from '@/types/product';

export const gestaoFrotasOficinas: Product = {
  title: "Gestão de Frotas & Oficinas",
  slug: "gestao-frotas-oficinas",
  price: 79900,
  rentalPrice: 79900,
  category: "solucoes-automotivas",
  images: ["/images/produtos/relatorios-financeiros.png"],
  short: "Plataforma inteligente de intermediação entre frotas e oficinas mecânicas com IA de auditoria, split de pagamento automático (15%) e liquidação em D+1.",
  badges: ["Assinatura Mensal", "IA Auditoria", "Split 15%", "D+1"],
  features: [
    "Cadastro completo de frotas (veículos, placas, km, modelos)",
    "Cadastro de oficinas credenciadas (CNPJ, especialidades, localização)",
    "IA de auditoria: validação de preços regionais (BR-010)",
    "IA de compatibilidade: verificação peça × modelo do veículo",
    "IA preventiva: sugestões de manutenção baseadas em histórico",
    "Split de pagamento automático: 85% oficina / 15% NovaLink",
    "Pagamento D+1 para oficinas",
    "Aprovação de orçamentos via portal",
    "Acompanhamento de serviço via QR Code",
    "Dashboard financeiro centralizado",
    "Sistema de avaliação de oficinas",
    "Saldo pré-pago ou trava de liberação",
    "NF sobre comissão (sem bitributação)",
    "Multi-empresa: gerencie várias frotas"
  ],
  rentalAdvantages: [
    "Elimine fraudes e sobrepreços em manutenções",
    "Liquidez imediata para oficinas parceiras",
    "Reduza custos de manutenção com IA preditiva",
    "Transparência total para gestores de frota",
    "Modelo escalável para qualquer cidade"
  ],
  operationManual: [
    { step: "01", action: "Escolher perfil", detail: "Selecione se você é Operador de Frota ou Operador de Oficina para acessar o painel correto." },
    { step: "02", action: "Cadastrar dados", detail: "Frotas: registre veículos (placa, modelo, ano, km). Oficinas: registre CNPJ, especialidades e localização." },
    { step: "03", action: "Solicitar serviço (Frota)", detail: "Selecione o veículo, descreva o problema e veja oficinas próximas ranqueadas por avaliação." },
    { step: "04", action: "Enviar orçamento (Oficina)", detail: "Receba a solicitação, monte o orçamento com peças e mão de obra. A IA validará automaticamente." },
    { step: "05", action: "Aprovar orçamento (Frota)", detail: "Receba o orçamento com alertas da IA sobre sobrepreços. Aprove ou solicite revisão." },
    { step: "06", action: "Executar e registrar (Oficina)", detail: "Execute o serviço e registre a conclusão. O pagamento é processado automaticamente." },
    { step: "07", action: "Receber pagamento (Oficina)", detail: "Receba 85% do valor em D+1 na sua conta. NovaLink retém 15% de comissão." },
    { step: "08", action: "Monitorar tudo (Admin)", detail: "Acompanhe todas as transações, splits e alertas da IA no painel centralizado." }
  ],
  requiredCredentials: [
    "CNPJ da empresa (Frota ou Oficina)",
    "Dados bancários para recebimento (Oficina)",
    "Documentos dos veículos (Frota)"
  ],
  inStock: true,
  delivery: "Ativação em até 24 horas",
  specs: "Pagamento Mensal - R$ 799/mês",
  systemPath: "/sistema/gestao-frotas-oficinas",
  content: `
# Gestão de Frotas & Oficinas — Plataforma Inteligente NovaLink

Conecte sua frota às melhores oficinas com inteligência artificial, transparência total e pagamento ultrarrápido.

## Como Funciona

A NovaLink opera como intermediária inteligente entre **frotas de veículos** e **oficinas mecânicas credenciadas**. Cada perfil tem seu painel dedicado:

### Para Operadores de Frota
- Cadastre seus veículos com todos os dados técnicos
- Solicite serviços e veja oficinas próximas ranqueadas
- Receba orçamentos auditados pela IA (alertas de sobrepreço)
- Aprove e acompanhe o serviço em tempo real via QR Code

### Para Operadores de Oficina
- Cadastre sua oficina com CNPJ e especialidades
- Receba solicitações de frotas da sua região
- Envie orçamentos que serão validados pela IA
- Receba pagamento de 85% do valor em D+1

## IA de Auditoria (O "Cérebro")

1. **Auditoria de Preços** — Cruza orçamentos com banco de preços regional
2. **Validação Técnica** — Verifica compatibilidade peça × modelo do veículo
3. **Manutenção Preventiva** — Sugere intervenções baseadas no histórico

## Split de Pagamento

O sistema retém automaticamente **15% de comissão** e repassa **85% à oficina em D+1**, sem bitributação.

💥 **Promoção de Lançamento!** Aproveite 20% de desconto com o cupom **INAUGURACAO20**.
  `
};
