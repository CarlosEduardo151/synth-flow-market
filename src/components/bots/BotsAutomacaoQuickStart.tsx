import { CheckCircle2, Circle, ExternalLink } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  n8nConnected: boolean | null;
  workflowSelected: boolean;
  botActive: boolean;
  onGoToEngine: () => void;
  onGoToStatus: () => void;
};

function Step({ done, title, description }: { done: boolean; title: string; description: string }) {
  const Icon = done ? CheckCircle2 : Circle;
  return (
    <div className="flex gap-3">
      <Icon className={done ? "mt-0.5 h-5 w-5 text-primary" : "mt-0.5 h-5 w-5 text-muted-foreground"} />
      <div className="min-w-0">
        <div className="font-medium leading-6">{title}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
    </div>
  );
}

export function BotsAutomacaoQuickStart({ n8nConnected, workflowSelected, botActive, onGoToEngine }: Props) {
  const connected = n8nConnected === true;
  const unknown = n8nConnected === null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Guia rápido (primeira configuração)</CardTitle>
        <CardDescription>
          Siga estes passos em ordem. Em 2 minutos seu bot fica pronto para rodar no WhatsApp.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Step
            done={connected}
            title={unknown ? "Verificando conexão com o motor…" : "Conectar o motor de automação"}
            description={
              unknown
                ? "Aguarde a verificação automática."
                : connected
                  ? "Conexão OK."
                  : "Sem conexão, o bot não consegue executar automações."
            }
          />
          <Step
            done={workflowSelected}
            title="Escolher o workflow" 
            description="Selecione o workflow que este bot vai executar."
          />
          <Step
            done={botActive}
            title="Ativar o bot" 
            description="Ative para começar a responder e disparar ações automaticamente."
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Dica: se ficou perdido, comece pela aba <span className="font-medium text-foreground">Motor IA</span>.
          </div>
          <Button variant="outline" className="gap-2" onClick={onGoToEngine}>
            Ir para Motor IA
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
