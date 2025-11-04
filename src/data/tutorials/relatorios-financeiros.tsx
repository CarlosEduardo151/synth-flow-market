import { TutorialStep } from "@/components/ProductTutorial";

export const relatoriosFinanceirosTutorial: TutorialStep[] = [
  {
    title: "Bem-vindo aos Relatórios Financeiros Automáticos! 📊",
    description: "Controle total das finanças da sua empresa com relatórios sempre atualizados em tempo real.",
    content: (
      <div className="space-y-4">
        <p className="text-base leading-relaxed">
          Com os Relatórios Financeiros Automáticos, você terá:
        </p>
        <ul className="space-y-2">
          <li className="flex items-start gap-3">
            <span className="text-2xl">💰</span>
            <div>
              <strong>Visão completa do fluxo de caixa</strong> — Receitas e despesas organizadas
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-2xl">📈</span>
            <div>
              <strong>Gráficos interativos</strong> — Visualize tendências e padrões
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <strong>Atualização automática</strong> — Dados sempre em tempo real
            </div>
          </li>
        </ul>
      </div>
    ),
    tips: [
      "Empresas que acompanham finanças semanalmente têm 40% mais lucro",
      "Relatórios visuais facilitam a tomada de decisão estratégica",
    ],
  },
  {
    title: "Como Funciona a Alimentação de Dados",
    description: "O sistema recebe informações financeiras via webhook (n8n) ou manualmente.",
    content: (
      <div className="space-y-4">
        <div className="bg-background border rounded-lg p-4">
          <h4 className="font-semibold mb-2">📡 Automático via Webhook</h4>
          <p className="text-sm text-muted-foreground">
            Conecte seu sistema de vendas, ERP ou n8n para enviar dados automaticamente.
            Toda venda ou despesa será registrada instantaneamente.
          </p>
        </div>

        <div className="bg-background border rounded-lg p-4">
          <h4 className="font-semibold mb-2">✍️ Manual (Painel Admin)</h4>
          <p className="text-sm text-muted-foreground">
            Adicione receitas e despesas manualmente através do painel administrativo.
            Ideal para lançamentos pontuais.
          </p>
        </div>

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            💡 A URL do webhook está disponível na aba "Painel Admin"
          </p>
        </div>
      </div>
    ),
    example: "Venda de R$ 500 → Sistema registra automaticamente → Relatório atualiza em tempo real",
    tips: [
      "Use webhook para automatizar 100% dos lançamentos",
      "Categorize bem suas receitas e despesas para relatórios mais precisos",
    ],
  },
  {
    title: "Entendendo as Categorias",
    description: "Organize suas finanças por categorias para análises mais detalhadas.",
    content: (
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-600 dark:text-green-400 font-semibold">💚 Receitas</span>
            </div>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Vendas de produtos</li>
              <li>• Prestação de serviços</li>
              <li>• Outras receitas</li>
            </ul>
          </div>

          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-600 dark:text-red-400 font-semibold">💔 Despesas</span>
            </div>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Fornecedores</li>
              <li>• Salários</li>
              <li>• Aluguel</li>
              <li>• Marketing</li>
              <li>• Outras despesas</li>
            </ul>
          </div>
        </div>
      </div>
    ),
    tips: [
      "Crie categorias específicas para seu negócio",
      "Quanto mais detalhado, melhor será sua análise",
    ],
  },
  {
    title: "Usando os Filtros e Gráficos",
    description: "Explore diferentes visões dos seus dados financeiros.",
    content: (
      <div className="space-y-4">
        <div className="grid gap-3">
          <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
            <span className="text-2xl">📅</span>
            <div>
              <strong>Filtro por Período</strong>
              <p className="text-sm text-muted-foreground mt-1">
                Selecione data inicial e final para ver resultados específicos
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
            <span className="text-2xl">🏷️</span>
            <div>
              <strong>Filtro por Categoria</strong>
              <p className="text-sm text-muted-foreground mt-1">
                Veja receitas ou despesas de categorias específicas
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
            <span className="text-2xl">📊</span>
            <div>
              <strong>Gráficos Interativos</strong>
              <p className="text-sm text-muted-foreground mt-1">
                Barras e linhas mostram evolução mensal e comparações
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
    example: "Filtre 'Marketing' no último trimestre para ver o ROI dos anúncios",
    tips: [
      "Compare mês a mês para identificar tendências",
      "Exporte relatórios em Excel para análises mais profundas",
    ],
  },
  {
    title: "Exportando e Compartilhando",
    description: "Exporte seus relatórios para planilhas ou compartilhe com seu contador.",
    content: (
      <div className="space-y-4">
        <div className="bg-background border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📥</span>
            <div>
              <h4 className="font-semibold">Exportar para Excel</h4>
              <p className="text-sm text-muted-foreground">
                Clique em "Exportar XLSX" para baixar todos os dados filtrados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-3xl">🔄</span>
            <div>
              <h4 className="font-semibold">Atualização Automática</h4>
              <p className="text-sm text-muted-foreground">
                Os dados são atualizados em tempo real sempre que há novos lançamentos
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
    tips: [
      "Exporte mensalmente para manter backup dos seus dados",
      "Compartilhe com seu contador para facilitar a contabilidade",
    ],
  },
  {
    title: "Você está pronto! 🚀",
    description: "Agora você tem controle total das finanças da sua empresa.",
    content: (
      <div className="space-y-4 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <p className="text-lg font-medium">
          Seu Sistema de Relatórios Financeiros está ativo!
        </p>
        <p className="text-base text-muted-foreground">
          Comece alimentando o sistema com seus dados financeiros e acompanhe
          o crescimento do seu negócio com relatórios profissionais.
        </p>
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 mt-6">
          <p className="text-sm font-medium mb-2">💡 Próximos passos:</p>
          <ul className="text-sm space-y-1 text-left">
            <li>✅ Configure a integração via webhook (opcional)</li>
            <li>✅ Adicione seus primeiros lançamentos financeiros</li>
            <li>✅ Explore os gráficos e filtros</li>
            <li>✅ Exporte seu primeiro relatório</li>
          </ul>
        </div>
      </div>
    ),
    tips: [
      "Atualize diariamente para decisões mais assertivas",
      "Use os gráficos em reuniões para mostrar resultados",
    ],
  },
];
