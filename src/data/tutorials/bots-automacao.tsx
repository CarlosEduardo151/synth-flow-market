import type { TutorialStep } from "@/components/ProductTutorial";
import { Badge } from "@/components/ui/badge";

export const botsAutomacaoTutorial: TutorialStep[] = [
  {
    title: "Escolha a plataforma",
    description: "No painel do produto, selecione WhatsApp (Z-API) como plataforma para ativar o fluxo.",
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Para este produto, o canal principal é o <strong>WhatsApp</strong>. Você pode começar por ele e
          expandir depois.
        </p>
        <div>
          <Badge>Recomendado: WhatsApp (Z-API)</Badge>
        </div>
      </div>
    ),
  },
  {
    title: "Cole a URL do webhook no Z-API",
    description:
      "O admin vai te fornecer uma URL única (com token) para colar no webhook do Z-API. Essa URL recebe eventos e salva no sistema.",
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          A URL do webhook é única por cliente/produto. Ela autentica por token e registra os eventos no painel.
        </p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li>Use o método <strong>POST</strong>.</li>
          <li>Mantenha o token em segredo.</li>
          <li>Se o token for rotacionado, atualize a URL no Z-API.</li>
        </ul>
      </div>
    ),
  },
  {
    title: "Script do bot (privado)",
    description:
      "O comportamento do bot é definido por um script privado (Python ou TypeScript) salvo com segurança no backend.",
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Seu código não é exposto no frontend. O admin faz upload/salva o script no bucket privado.
        </p>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li>Evite colocar chaves dentro do script; use credenciais no backend quando possível.</li>
          <li>Mantenha logs sem dados sensíveis.</li>
        </ul>
      </div>
    ),
  },
];
