import { TutorialStep } from "@/components/ProductTutorial";

export const gestaoCobrancasTutorial: TutorialStep[] = [
  {
    title: "Bem-vindo à Gestão de Cobranças! 💰",
    description: "Automatize cobranças e reduza a inadimplência do seu negócio.",
    content: (
      <div className="space-y-4">
        <p className="text-base leading-relaxed">
          Com a Gestão de Cobranças Automatizada você pode:
        </p>
        <ul className="space-y-2">
          <li className="flex items-start gap-3">
            <span className="text-2xl">📨</span>
            <div>
              <strong>Enviar cobranças automáticas</strong> — Boletos, PIX e cartões
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-2xl">⏰</span>
            <div>
              <strong>Lembretes inteligentes</strong> — Antes e depois do vencimento
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <strong>Relatórios de inadimplência</strong> — Controle total dos pagamentos
            </div>
          </li>
        </ul>
      </div>
    ),
    tips: [
      "Empresas com cobrança automática reduzem inadimplência em 70%",
      "Lembretes aumentam taxa de pagamento em 45%",
    ],
  },
  {
    title: "Cadastrando Clientes para Cobrança",
    description: "Adicione os dados dos clientes que serão cobrados.",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground mb-3">
          Cadastre os clientes que receberão cobranças recorrentes ou pontuais.
        </p>
        <div className="bg-background border rounded-lg p-4 space-y-3">
          <div>
            <strong className="text-sm">Informações necessárias:</strong>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li>• Nome completo</li>
              <li>• Email (para envio de boletos)</li>
              <li>• Telefone/WhatsApp (para lembretes)</li>
              <li>• CPF ou CNPJ (para emissão de boletos)</li>
            </ul>
          </div>
        </div>
      </div>
    ),
    example: "Cliente: Maria Santos | Email: maria@email.com | Tel: (11) 99999-9999 | CPF: 123.456.789-00",
    tips: [
      "WhatsApp ativo aumenta sucesso de cobrança",
      "Mantenha emails atualizados para envio automático",
    ],
  },
  {
    title: "Criando Cobranças",
    description: "Configure cobranças únicas ou recorrentes.",
    content: (
      <div className="space-y-4">
        <div className="grid gap-3">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold">💳 Cobrança Única</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Para pagamentos pontuais: produtos, serviços avulsos
            </p>
          </div>

          <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold">🔄 Cobrança Recorrente</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Para mensalidades, assinaturas, aluguéis
            </p>
          </div>
        </div>

        <div className="mt-4 bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            ⚙️ Formas de pagamento suportadas:
          </p>
          <ul className="text-sm text-amber-800 dark:text-amber-200 mt-2 space-y-1">
            <li>• PIX (instantâneo)</li>
            <li>• Boleto bancário</li>
            <li>• Cartão de crédito/débito</li>
          </ul>
        </div>
      </div>
    ),
    tips: [
      "PIX tem a maior taxa de conversão",
      "Envie link de pagamento junto com a cobrança",
    ],
  },
  {
    title: "Lembretes Automáticos",
    description: "Configure quando e como enviar lembretes aos clientes.",
    content: (
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-background rounded-lg border">
            <span className="text-2xl">📅</span>
            <div className="flex-1">
              <strong>Antes do Vencimento</strong>
              <p className="text-sm text-muted-foreground mt-1">
                3 a 7 dias antes: "Lembrete amigável de que sua cobrança vence em [data]"
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-background rounded-lg border">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <strong>No Dia do Vencimento</strong>
              <p className="text-sm text-muted-foreground mt-1">
                "Sua cobrança vence HOJE. Evite multas e juros!"
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-background rounded-lg border">
            <span className="text-2xl">🔴</span>
            <div className="flex-1">
              <strong>Após o Vencimento</strong>
              <p className="text-sm text-muted-foreground mt-1">
                "Sua cobrança está atrasada. Regularize para evitar bloqueios."
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
    example: "Envie lembrete 3 dias antes + no dia do vencimento + 1 dia depois (se não pago)",
    tips: [
      "Mensagens educadas geram mais pagamentos",
      "WhatsApp tem 98% de taxa de leitura",
    ],
  },
  {
    title: "Relatórios e Acompanhamento",
    description: "Monitore pagamentos e inadimplência em tempo real.",
    content: (
      <div className="space-y-4">
        <div className="grid md:grid-cols-3 gap-3">
          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800 text-center">
            <div className="text-3xl mb-2">💚</div>
            <strong className="text-sm">Pagos</strong>
            <p className="text-xs text-muted-foreground mt-1">
              Cobranças quitadas
            </p>
          </div>

          <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800 text-center">
            <div className="text-3xl mb-2">⏳</div>
            <strong className="text-sm">Pendentes</strong>
            <p className="text-xs text-muted-foreground mt-1">
              Dentro do prazo
            </p>
          </div>

          <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800 text-center">
            <div className="text-3xl mb-2">🚨</div>
            <strong className="text-sm">Atrasados</strong>
            <p className="text-xs text-muted-foreground mt-1">
              Requer ação
            </p>
          </div>
        </div>
      </div>
    ),
    tips: [
      "Exporte relatórios mensais para sua contabilidade",
      "Monitore taxa de inadimplência semanalmente",
    ],
  },
  {
    title: "Você está pronto! 🚀",
    description: "Sistema de cobranças configurado e funcionando.",
    content: (
      <div className="space-y-4 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <p className="text-lg font-medium">
          Parabéns! Seu sistema de cobranças está operacional!
        </p>
        <p className="text-base text-muted-foreground">
          Reduza inadimplência, economize tempo e mantenha seu fluxo de caixa saudável
          com cobranças automáticas e profissionais.
        </p>
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 mt-6">
          <p className="text-sm font-medium mb-2">💡 Próximos passos:</p>
          <ul className="text-sm space-y-1 text-left">
            <li>✅ Cadastre seus primeiros clientes</li>
            <li>✅ Configure suas primeiras cobranças</li>
            <li>✅ Ative lembretes automáticos via WhatsApp</li>
            <li>✅ Monitore o dashboard de pagamentos</li>
          </ul>
        </div>
      </div>
    ),
    tips: [
      "Cobrança profissional melhora a percepção da sua marca",
      "Automatização libera tempo para focar em crescimento",
    ],
  },
];
