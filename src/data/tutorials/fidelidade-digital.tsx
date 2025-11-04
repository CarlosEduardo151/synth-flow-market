import { TutorialStep } from "@/components/ProductTutorial";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const fidelidadeDigitalTutorial: TutorialStep[] = [
  {
    title: "Bem-vindo ao Sistema de Fidelidade Digital! 🎉",
    description: "Este sistema transforma seus clientes em fãs do seu negócio através de pontos e recompensas automáticas.",
    content: (
      <div className="space-y-4">
        <p className="text-base leading-relaxed">
          Com o Sistema de Fidelidade Digital, você pode:
        </p>
        <ul className="space-y-2">
          <li className="flex items-start gap-3">
            <span className="text-2xl">🎁</span>
            <div>
              <strong>Recompensar clientes fiéis</strong> — Dê pontos a cada compra
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-2xl">📱</span>
            <div>
              <strong>Notificar via WhatsApp</strong> — Avisos automáticos de pontos e recompensas
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <strong>Acompanhar resultados</strong> — Veja o impacto na retenção de clientes
            </div>
          </li>
        </ul>
      </div>
    ),
    tips: [
      "Clientes fiéis compram 67% mais que novos clientes",
      "Programas de pontos aumentam a frequência de compras em até 40%",
    ],
  },
  {
    title: "Configuração Inicial do Programa",
    description: "Vamos definir como seus clientes ganharão pontos.",
    content: (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="conversion-rate">Taxa de Conversão (R$ para pontos)</Label>
          <Input
            id="conversion-rate"
            type="number"
            placeholder="Ex: 1 (cada R$1 = 1 ponto)"
            defaultValue="1"
          />
          <p className="text-sm text-muted-foreground">
            Defina quantos pontos o cliente ganha por cada real gasto.
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="expiry-days">Validade dos Pontos (dias)</Label>
          <Input
            id="expiry-days"
            type="number"
            placeholder="Ex: 365 (1 ano)"
            defaultValue="365"
          />
          <p className="text-sm text-muted-foreground">
            Deixe vazio se os pontos não expirarem.
          </p>
        </div>
      </div>
    ),
    example: "Se você definir taxa de conversão como 1, um cliente que comprar R$ 50 ganhará 50 pontos.",
    tips: [
      "Taxas mais altas motivam mais compras (ex: R$1 = 2 pontos)",
      "Validade de 12 meses é o padrão do mercado",
    ],
  },
  {
    title: "Crie Suas Recompensas",
    description: "Configure prêmios que seus clientes podem trocar por pontos.",
    content: (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reward-name">Nome da Recompensa</Label>
          <Input
            id="reward-name"
            placeholder="Ex: Desconto de R$ 10"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="points-cost">Custo em Pontos</Label>
          <Input
            id="points-cost"
            type="number"
            placeholder="Ex: 100 pontos"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Quantidade Disponível (opcional)</Label>
          <Input
            id="quantity"
            type="number"
            placeholder="Deixe vazio para ilimitado"
          />
        </div>
      </div>
    ),
    example: "Recompensa popular: 'Desconto de R$ 20' por 200 pontos — fácil de entender e valorizado pelos clientes.",
    tips: [
      "Comece com 3-5 recompensas simples",
      "Ofereça recompensas de diferentes valores (pequenas, médias e grandes)",
      "Recompensas experienciais (atendimento VIP) geram mais engajamento",
    ],
  },
  {
    title: "Integração com WhatsApp",
    description: "Configure mensagens automáticas para engajar seus clientes.",
    content: (
      <div className="space-y-4">
        <p className="text-base">
          O sistema pode enviar mensagens automáticas via WhatsApp quando:
        </p>
        <ul className="space-y-3">
          <li className="flex items-start gap-3 p-3 bg-background rounded-lg border">
            <span className="text-xl">👋</span>
            <div className="flex-1">
              <strong>Cliente se cadastra</strong>
              <p className="text-sm text-muted-foreground mt-1">
                "Bem-vindo! Você já tem X pontos iniciais."
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3 p-3 bg-background rounded-lg border">
            <span className="text-xl">🎁</span>
            <div className="flex-1">
              <strong>Ganha pontos</strong>
              <p className="text-sm text-muted-foreground mt-1">
                "Parabéns! Você ganhou 50 pontos. Total: 150 pontos."
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3 p-3 bg-background rounded-lg border">
            <span className="text-xl">🏆</span>
            <div className="flex-1">
              <strong>Pontos suficientes para recompensa</strong>
              <p className="text-sm text-muted-foreground mt-1">
                "Você pode resgatar um brinde! Acesse seu painel."
              </p>
            </div>
          </li>
        </ul>
      </div>
    ),
    tips: [
      "Mensagens automáticas aumentam o engajamento em 3x",
      "Personalize as mensagens com o nome do cliente",
      "Configure o webhook do Z-API na próxima tela",
    ],
  },
  {
    title: "Como Usar no Dia a Dia",
    description: "Veja o passo a passo para gerenciar o programa de fidelidade.",
    content: (
      <div className="space-y-4">
        <div className="grid gap-3">
          <div className="flex items-start gap-3 p-4 bg-background rounded-lg border">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
              1
            </span>
            <div>
              <strong>Cadastrar clientes</strong>
              <p className="text-sm text-muted-foreground mt-1">
                Adicione clientes manualmente ou importe via webhook
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-background rounded-lg border">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
              2
            </span>
            <div>
              <strong>Registrar transações</strong>
              <p className="text-sm text-muted-foreground mt-1">
                A cada venda, adicione pontos automaticamente
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-background rounded-lg border">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
              3
            </span>
            <div>
              <strong>Acompanhar resgates</strong>
              <p className="text-sm text-muted-foreground mt-1">
                Veja quando clientes trocam pontos por recompensas
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-background rounded-lg border">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
              4
            </span>
            <div>
              <strong>Analisar resultados</strong>
              <p className="text-sm text-muted-foreground mt-1">
                Use o dashboard para ver o impacto no seu negócio
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
    tips: [
      "Verifique o painel semanalmente para identificar clientes fiéis",
      "Crie campanhas especiais (pontos em dobro) para reativar clientes inativos",
    ],
  },
  {
    title: "Você está pronto! 🚀",
    description: "Parabéns! Agora você sabe tudo para fidelizar seus clientes.",
    content: (
      <div className="space-y-4 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <p className="text-lg font-medium">
          Seu Sistema de Fidelidade está configurado e pronto para usar!
        </p>
        <p className="text-base text-muted-foreground">
          Comece cadastrando seus primeiros clientes e criando recompensas atrativas.
          Seus clientes vão adorar ganhar pontos e benefícios!
        </p>
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 mt-6">
          <p className="text-sm font-medium mb-2">💡 Próximos passos recomendados:</p>
          <ul className="text-sm space-y-1 text-left">
            <li>✅ Cadastre seus primeiros 10 clientes</li>
            <li>✅ Crie 3 recompensas de valores diferentes</li>
            <li>✅ Configure a integração com WhatsApp</li>
            <li>✅ Divulgue o programa nas redes sociais</li>
          </ul>
        </div>
      </div>
    ),
    tips: [
      "Clientes adoram programas simples e transparentes",
      "Comunique sempre o saldo de pontos após cada compra",
      "Responda dúvidas rapidamente para manter o engajamento",
    ],
  },
];
