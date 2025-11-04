import { TutorialStep } from "@/components/ProductTutorial";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const crmSimplesTutorial: TutorialStep[] = [
  {
    title: "Bem-vindo ao CRM Simples! 👥",
    description: "Organize e gerencie seus clientes de forma profissional e intuitiva.",
    content: (
      <div className="space-y-4">
        <p className="text-base leading-relaxed">
          O CRM Simples te ajuda a:
        </p>
        <ul className="space-y-2">
          <li className="flex items-start gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <strong>Organizar todos os clientes</strong> — Cadastro completo e histórico
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <strong>Gerenciar oportunidades</strong> — Funil de vendas visual
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-2xl">💬</span>
            <div>
              <strong>Comunicação automática</strong> — Mensagens via WhatsApp
            </div>
          </li>
        </ul>
      </div>
    ),
    tips: [
      "Empresas com CRM aumentam vendas em até 29%",
      "Organize informações para nunca esquecer detalhes importantes",
    ],
  },
  {
    title: "Cadastrando Seus Primeiros Clientes",
    description: "Aprenda a adicionar e organizar informações dos clientes.",
    content: (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="demo-name">Nome do Cliente *</Label>
          <Input id="demo-name" placeholder="Ex: João Silva" />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="demo-email">Email</Label>
            <Input id="demo-email" type="email" placeholder="joao@empresa.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-phone">Telefone</Label>
            <Input id="demo-phone" placeholder="(11) 98765-4321" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="demo-company">Empresa</Label>
          <Input id="demo-company" placeholder="Nome da empresa" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="demo-notes">Observações</Label>
          <Textarea id="demo-notes" placeholder="Anotações importantes sobre o cliente..." />
        </div>
      </div>
    ),
    example: "Cliente: João Silva | Empresa: Silva & Cia | Interesse: Pacote Premium",
    tips: [
      "Quanto mais informações, melhor o atendimento",
      "Use as observações para anotar preferências e detalhes",
    ],
  },
  {
    title: "Funil de Vendas e Oportunidades",
    description: "Acompanhe cada cliente no processo de venda.",
    content: (
      <div className="space-y-4">
        <div className="grid gap-3">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold">1️⃣ Lead</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Primeiro contato, ainda descobrindo o interesse
            </p>
          </div>

          <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold">2️⃣ Prospect</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Demonstrou interesse real, em negociação
            </p>
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold">3️⃣ Cliente</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Fechou negócio, é cliente ativo
            </p>
          </div>
        </div>
      </div>
    ),
    tips: [
      "Mova clientes entre os estágios conforme evoluem",
      "Foque mais tempo em prospects qualificados",
    ],
  },
  {
    title: "Registrando Interações",
    description: "Mantenha histórico de todas as conversas e contatos.",
    content: (
      <div className="space-y-4">
        <p className="text-base">
          Para cada cliente, você pode registrar:
        </p>
        <div className="grid gap-3">
          <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
            <span className="text-xl">📞</span>
            <div>
              <strong>Ligações</strong>
              <p className="text-sm text-muted-foreground mt-1">
                Registre o que foi discutido em cada call
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
            <span className="text-xl">📧</span>
            <div>
              <strong>Emails</strong>
              <p className="text-sm text-muted-foreground mt-1">
                Anote emails importantes enviados ou recebidos
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
            <span className="text-xl">💬</span>
            <div>
              <strong>WhatsApp</strong>
              <p className="text-sm text-muted-foreground mt-1">
                Registre conversas via WhatsApp
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
            <span className="text-xl">🤝</span>
            <div>
              <strong>Reuniões</strong>
              <p className="text-sm text-muted-foreground mt-1">
                Documente o que foi tratado em reuniões
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
    example: "Cliente João Silva ligou hoje às 14h querendo saber sobre o Plano Premium. Enviar proposta até sexta.",
    tips: [
      "Registre TUDO - memória falha, dados não",
      "Anote próximos passos e datas de follow-up",
    ],
  },
  {
    title: "Mensagens Automáticas (WhatsApp)",
    description: "Configure mensagens automáticas para engajar clientes.",
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <span className="text-xl">📱</span>
            Integração com WhatsApp
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            Envie mensagens personalizadas automaticamente via webhook ou Z-API
          </p>
        </div>

        <div className="space-y-3">
          <div className="p-3 bg-background rounded-lg border">
            <strong className="text-sm">Exemplo de template:</strong>
            <p className="text-sm text-muted-foreground mt-2 bg-muted/50 p-3 rounded">
              "Olá {'<nome>'}, tudo bem? Percebi que você demonstrou interesse em {'<produto>'}. 
              Podemos agendar uma conversa rápida?"
            </p>
          </div>
        </div>
      </div>
    ),
    tips: [
      "Personalize mensagens com o nome do cliente",
      "Configure lembretes automáticos de follow-up",
    ],
  },
  {
    title: "Você está pronto! 🚀",
    description: "Seu CRM está configurado e pronto para aumentar suas vendas.",
    content: (
      <div className="space-y-4 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <p className="text-lg font-medium">
          Parabéns! Você dominou o CRM Simples!
        </p>
        <p className="text-base text-muted-foreground">
          Agora você pode gerenciar clientes de forma profissional,
          nunca mais perder oportunidades e aumentar suas vendas.
        </p>
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 mt-6">
          <p className="text-sm font-medium mb-2">💡 Próximos passos:</p>
          <ul className="text-sm space-y-1 text-left">
            <li>✅ Importe sua lista de clientes atual</li>
            <li>✅ Crie oportunidades para leads ativos</li>
            <li>✅ Configure mensagens automáticas no WhatsApp</li>
            <li>✅ Revise o funil de vendas semanalmente</li>
          </ul>
        </div>
      </div>
    ),
    tips: [
      "Atualize o CRM diariamente para melhores resultados",
      "Use relatórios para identificar gargalos no processo",
    ],
  },
];
