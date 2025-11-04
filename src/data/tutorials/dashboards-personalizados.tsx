import { TutorialStep } from "@/components/ProductTutorial";

export const dashboardsPersonalizadosTutorial: TutorialStep[] = [
  {
    title: "Bem-vindo aos Dashboards Personalizados! 📊",
    description: "Visualize dados do seu negócio em tempo real com gráficos interativos.",
    content: (
      <div className="space-y-4">
        <p className="text-base leading-relaxed">
          Com Dashboards Personalizados você pode:
        </p>
        <ul className="space-y-2">
          <li className="flex items-start gap-3">
            <span className="text-2xl">📈</span>
            <div>
              <strong>Visualizar métricas em tempo real</strong> — Dados sempre atualizados
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <strong>Acompanhar KPIs importantes</strong> — Vendas, clientes, finanças
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <strong>Gráficos interativos</strong> — Barras, linhas, pizza e mais
            </div>
          </li>
        </ul>
      </div>
    ),
    tips: [
      "Empresas que usam dashboards tomam decisões 5x mais rápido",
      "Visualização de dados aumenta compreensão em 400%",
    ],
  },
  {
    title: "Escolhendo Suas Métricas",
    description: "Selecione os indicadores mais importantes para seu negócio.",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground mb-3">
          Configure quais métricas deseja acompanhar no dashboard:
        </p>
        
        <div className="space-y-3">
          <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <strong className="flex items-center gap-2 mb-2">
              <span className="text-xl">💰</span>
              Métricas de Vendas
            </strong>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Total de vendas do mês</li>
              <li>• Ticket médio por cliente</li>
              <li>• Produtos mais vendidos</li>
              <li>• Taxa de conversão</li>
            </ul>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <strong className="flex items-center gap-2 mb-2">
              <span className="text-xl">👥</span>
              Métricas de Clientes
            </strong>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Total de clientes ativos</li>
              <li>• Novos clientes no mês</li>
              <li>• Taxa de retenção</li>
              <li>• NPS (satisfação)</li>
            </ul>
          </div>

          <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <strong className="flex items-center gap-2 mb-2">
              <span className="text-xl">📊</span>
              Métricas Financeiras
            </strong>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Receita total</li>
              <li>• Lucro líquido</li>
              <li>• Despesas do mês</li>
              <li>• Fluxo de caixa</li>
            </ul>
          </div>
        </div>
      </div>
    ),
    example: "Dashboard de loja: Total de Vendas + Ticket Médio + Produtos Mais Vendidos + Novos Clientes",
    tips: [
      "Comece com 4-6 métricas principais",
      "Escolha indicadores que impactam diretamente seu negócio",
    ],
  },
  {
    title: "Como Funciona a Atualização de Dados",
    description: "Seus dados são alimentados automaticamente via webhook.",
    content: (
      <div className="space-y-4">
        <div className="bg-background border rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-3xl">🔗</span>
            <div>
              <h4 className="font-semibold mb-1">Integração via Webhook</h4>
              <p className="text-sm text-muted-foreground">
                Conecte seu sistema de vendas, ERP ou n8n para enviar dados automaticamente.
                Cada nova venda ou transação atualiza o dashboard instantaneamente.
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              📡 URL do Webhook
            </p>
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Disponível no painel de configurações do dashboard
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-2xl mb-1">1️⃣</div>
            <p className="text-xs font-medium">Venda realizada</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-2xl mb-1">2️⃣</div>
            <p className="text-xs font-medium">Webhook envia dados</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-2xl mb-1">3️⃣</div>
            <p className="text-xs font-medium">Dashboard atualiza</p>
          </div>
        </div>
      </div>
    ),
    tips: [
      "Dados em tempo real permitem reações rápidas",
      "Configure alertas para métricas importantes",
    ],
  },
  {
    title: "Tipos de Gráficos Disponíveis",
    description: "Escolha a melhor visualização para cada tipo de dado.",
    content: (
      <div className="space-y-3">
        <div className="p-3 bg-background border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">📊</span>
            <strong className="text-sm">Gráfico de Barras</strong>
          </div>
          <p className="text-xs text-muted-foreground">
            Ideal para: Comparar valores (vendas por mês, produtos mais vendidos)
          </p>
        </div>

        <div className="p-3 bg-background border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">📈</span>
            <strong className="text-sm">Gráfico de Linha</strong>
          </div>
          <p className="text-xs text-muted-foreground">
            Ideal para: Tendências ao longo do tempo (crescimento de vendas, evolução mensal)
          </p>
        </div>

        <div className="p-3 bg-background border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🥧</span>
            <strong className="text-sm">Gráfico de Pizza</strong>
          </div>
          <p className="text-xs text-muted-foreground">
            Ideal para: Distribuição percentual (categorias de produtos, origem de vendas)
          </p>
        </div>

        <div className="p-3 bg-background border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🔢</span>
            <strong className="text-sm">Cards de Números</strong>
          </div>
          <p className="text-xs text-muted-foreground">
            Ideal para: Valores únicos importantes (total de vendas, clientes ativos)
          </p>
        </div>
      </div>
    ),
    tips: [
      "Use cores consistentes para facilitar leitura",
      "Combine diferentes tipos de gráficos no mesmo dashboard",
    ],
  },
  {
    title: "Usando o Dashboard no Dia a Dia",
    description: "Aproveite ao máximo seus dados visuais.",
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <span className="text-xl">💡</span>
            Dicas de Uso Estratégico
          </h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="shrink-0">🌅</span>
              <div>
                <strong>Manhã:</strong> Revise métricas do dia anterior
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="shrink-0">🎯</span>
              <div>
                <strong>Durante o dia:</strong> Monitore vendas em tempo real
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="shrink-0">📅</span>
              <div>
                <strong>Semanalmente:</strong> Analise tendências e padrões
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="shrink-0">📊</span>
              <div>
                <strong>Mensalmente:</strong> Compare com meses anteriores
              </div>
            </li>
          </ul>
        </div>
      </div>
    ),
    tips: [
      "Compartilhe o dashboard com sua equipe",
      "Use em reuniões para mostrar resultados",
    ],
  },
  {
    title: "Você está pronto! 🚀",
    description: "Seu dashboard personalizado está configurado!",
    content: (
      <div className="space-y-4 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <p className="text-lg font-medium">
          Parabéns! Você tem um dashboard profissional!
        </p>
        <p className="text-base text-muted-foreground">
          Agora você pode acompanhar o desempenho do seu negócio em tempo real,
          tomar decisões baseadas em dados e identificar oportunidades rapidamente.
        </p>
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 mt-6">
          <p className="text-sm font-medium mb-2">💡 Próximos passos:</p>
          <ul className="text-sm space-y-1 text-left">
            <li>✅ Configure a URL do webhook</li>
            <li>✅ Escolha suas métricas principais</li>
            <li>✅ Personalize os gráficos</li>
            <li>✅ Acompanhe diariamente seus resultados</li>
          </ul>
        </div>
      </div>
    ),
    tips: [
      "Dados sem ação não geram resultados - use para decidir",
      "Ajuste métricas conforme seu negócio evolui",
    ],
  },
];
