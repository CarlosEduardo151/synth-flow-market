import { TutorialStep } from "@/components/ProductTutorial";

export const postsSociaisTutorial: TutorialStep[] = [
  {
    title: "Bem-vindo aos Posts Sociais Automáticos! 📱",
    description: "Mantenha suas redes sociais ativas com conteúdo de qualidade automatizado.",
    content: (
      <div className="space-y-4">
        <p className="text-base leading-relaxed">
          Com a Geração de Posts Sociais você terá:
        </p>
        <ul className="space-y-2">
          <li className="flex items-start gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <strong>Criação automática de conteúdo</strong> — Textos otimizados por IA
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-2xl">📅</span>
            <div>
              <strong>Agendamento inteligente</strong> — Publique nos melhores horários
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-2xl">🎨</span>
            <div>
              <strong>Múltiplas plataformas</strong> — Instagram, Facebook, LinkedIn, Twitter
            </div>
          </li>
        </ul>
      </div>
    ),
    tips: [
      "Empresas que postam regularmente têm 67% mais leads",
      "Conteúdo visual aumenta engajamento em 80%",
    ],
  },
  {
    title: "Criando Seu Primeiro Post",
    description: "Aprenda a criar e agendar posts para redes sociais.",
    content: (
      <div className="space-y-4">
        <div className="bg-background border rounded-lg p-4 space-y-4">
          <div>
            <strong className="text-sm block mb-2">1. Escreva o Conteúdo</strong>
            <p className="text-sm text-muted-foreground">
              Crie um texto chamativo que atraia atenção do público. Use emojis e hashtags relevantes.
            </p>
          </div>

          <div>
            <strong className="text-sm block mb-2">2. Adicione Imagem (Opcional)</strong>
            <p className="text-sm text-muted-foreground">
              Posts com imagens têm 2x mais engajamento. Use fotos de qualidade.
            </p>
          </div>

          <div>
            <strong className="text-sm block mb-2">3. Escolha as Plataformas</strong>
            <p className="text-sm text-muted-foreground">
              Selecione onde publicar: Instagram, Facebook, LinkedIn ou Twitter.
            </p>
          </div>

          <div>
            <strong className="text-sm block mb-2">4. Agende a Publicação</strong>
            <p className="text-sm text-muted-foreground">
              Defina data e horário ideais para seu público-alvo.
            </p>
          </div>
        </div>
      </div>
    ),
    example: "Post para Instagram sobre promoção: foto do produto + texto com emojis + 3 hashtags relevantes + agendado para 19h (horário de pico)",
    tips: [
      "Melhores horários: 12h-13h (almoço) e 19h-21h (noite)",
      "Use no máximo 3-5 hashtags relevantes",
    ],
  },
  {
    title: "Tipos de Conteúdo que Funcionam",
    description: "Conheça os formatos que geram mais engajamento.",
    content: (
      <div className="space-y-3">
        <div className="p-4 bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">📸</span>
            <strong>Bastidores</strong>
          </div>
          <p className="text-sm text-muted-foreground">
            Mostre o dia a dia da empresa, equipe trabalhando, processos
          </p>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">💡</span>
            <strong>Dicas e Tutoriais</strong>
          </div>
          <p className="text-sm text-muted-foreground">
            Compartilhe conhecimento, ensine algo útil ao seu público
          </p>
        </div>

        <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🎁</span>
            <strong>Promoções e Ofertas</strong>
          </div>
          <p className="text-sm text-muted-foreground">
            Anuncie descontos, lançamentos, ofertas especiais
          </p>
        </div>

        <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">⭐</span>
            <strong>Depoimentos de Clientes</strong>
          </div>
          <p className="text-sm text-muted-foreground">
            Compartilhe avaliações positivas e casos de sucesso
          </p>
        </div>
      </div>
    ),
    tips: [
      "Varie os tipos de conteúdo para não ficar repetitivo",
      "Conte histórias - pessoas se conectam com narrativas",
    ],
  },
  {
    title: "Hashtags e Alcance",
    description: "Use hashtags estratégicas para aumentar seu alcance.",
    content: (
      <div className="space-y-4">
        <div className="bg-background border rounded-lg p-4">
          <h4 className="font-semibold mb-3">Estratégia de Hashtags:</h4>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">🔥</span>
              <div>
                <strong className="text-sm">1-2 hashtags populares</strong>
                <p className="text-xs text-muted-foreground mt-1">
                  Ex: #empreendedorismo #negocios (milhões de posts)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">🎯</span>
              <div>
                <strong className="text-sm">2-3 hashtags de nicho</strong>
                <p className="text-xs text-muted-foreground mt-1">
                  Ex: #marketingdigitalsp #agenciasp (milhares de posts)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">✨</span>
              <div>
                <strong className="text-sm">1 hashtag de marca</strong>
                <p className="text-xs text-muted-foreground mt-1">
                  Ex: #suamarca #seuservico (própria)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    example: "#empreendedorismo #marketingdigital #agenciasaopaulo #suamarca",
    tips: [
      "Evite hashtags genéricas demais (sua postagem se perde)",
      "Pesquise hashtags antes de usar - veja o volume de posts",
    ],
  },
  {
    title: "Frequência de Publicação",
    description: "Qual a melhor cadência para cada rede social.",
    content: (
      <div className="space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="p-3 bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-200 dark:border-pink-800 rounded-lg">
            <div className="font-semibold mb-2 flex items-center gap-2">
              <span>📷</span> Instagram
            </div>
            <p className="text-sm text-muted-foreground">
              1-2 posts/dia + Stories diários
            </p>
          </div>

          <div className="p-3 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="font-semibold mb-2 flex items-center gap-2">
              <span>👥</span> Facebook
            </div>
            <p className="text-sm text-muted-foreground">
              1 post/dia, melhor à noite
            </p>
          </div>

          <div className="p-3 bg-gradient-to-br from-blue-600/10 to-blue-700/10 border border-blue-300 dark:border-blue-700 rounded-lg">
            <div className="font-semibold mb-2 flex items-center gap-2">
              <span>💼</span> LinkedIn
            </div>
            <p className="text-sm text-muted-foreground">
              3-5 posts/semana em dias úteis
            </p>
          </div>

          <div className="p-3 bg-gradient-to-br from-sky-400/10 to-sky-500/10 border border-sky-200 dark:border-sky-800 rounded-lg">
            <div className="font-semibold mb-2 flex items-center gap-2">
              <span>🐦</span> Twitter/X
            </div>
            <p className="text-sm text-muted-foreground">
              3-5 posts/dia, mais interação
            </p>
          </div>
        </div>
      </div>
    ),
    tips: [
      "Consistência é mais importante que volume",
      "Prefira qualidade à quantidade",
    ],
  },
  {
    title: "Você está pronto! 🚀",
    description: "Suas redes sociais agora funcionarão no piloto automático!",
    content: (
      <div className="space-y-4 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <p className="text-lg font-medium">
          Parabéns! Você dominou a criação de Posts Sociais!
        </p>
        <p className="text-base text-muted-foreground">
          Mantenha presença ativa nas redes, engaje seu público e
          cresça sua marca com posts profissionais e estratégicos.
        </p>
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 mt-6">
          <p className="text-sm font-medium mb-2">💡 Próximos passos:</p>
          <ul className="text-sm space-y-1 text-left">
            <li>✅ Crie e agende seus primeiros 7 posts</li>
            <li>✅ Varie os tipos de conteúdo (dicas, promoções, bastidores)</li>
            <li>✅ Use imagens de alta qualidade</li>
            <li>✅ Monitore quais posts geram mais engajamento</li>
          </ul>
        </div>
      </div>
    ),
    tips: [
      "Analise resultados e ajuste estratégia semanalmente",
      "Responda comentários para criar relacionamento",
    ],
  },
];
