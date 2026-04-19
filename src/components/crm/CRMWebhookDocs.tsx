import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, BookOpen, Webhook, Lock, Code2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  customerProductId: string;
}

const SUPABASE_URL = "https://lqduauyrwwlrbtnxkiev.supabase.co";

export function CRMWebhookDocs({ customerProductId }: Props) {
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("crm_webhook_config")
        .select("webhook_token")
        .eq("customer_product_id", customerProductId)
        .maybeSingle();
      setToken(data?.webhook_token || "");
      setLoading(false);
    })();
  }, [customerProductId]);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  const webhookUrl = `${SUPABASE_URL}/functions/v1/crm-webhook`;

  const samplePayload = {
    token: token || "<seu_token>",
    customer_product_id: customerProductId,
    event: "lead.created",
    data: {
      name: "João da Silva",
      email: "joao@empresa.com",
      phone: "+5511999999999",
      company: "ACME Ltda",
      business_type: "varejo",
      status: "lead",
      source: "site",
      notes: "Veio pelo formulário de contato",
    },
  };

  const curlExample = `curl -X POST '${webhookUrl}' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify(samplePayload, null, 2)}'`;

  const events = [
    { name: "lead.created", desc: "Cria um novo lead em crm_customers" },
    { name: "lead.updated", desc: "Atualiza dados de um lead existente (busca por phone ou email)" },
    { name: "interaction.created", desc: "Registra uma interação (call, email, meeting, note)" },
    { name: "opportunity.created", desc: "Cria uma oportunidade vinculada a um cliente" },
    { name: "opportunity.stage_changed", desc: "Move uma oportunidade entre estágios do pipeline" },
  ];

  if (loading) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" /> Documentação de Webhooks
          </CardTitle>
          <CardDescription>
            Integre sistemas externos (Zapier, Make, n8n, formulários, etc.) ao CRM via webhook HTTP.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Webhook className="w-3 h-3" /> Endpoint
            </p>
            <div className="flex gap-2">
              <code className="flex-1 text-xs bg-muted/50 px-3 py-2 rounded-md font-mono break-all">
                {webhookUrl}
              </code>
              <Button size="sm" variant="outline" onClick={() => copy(webhookUrl, "URL")}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Lock className="w-3 h-3" /> Token de autenticação
            </p>
            <div className="flex gap-2">
              <code className="flex-1 text-xs bg-muted/50 px-3 py-2 rounded-md font-mono break-all">
                {token || "Token ainda não gerado — abra a aba Integração para gerar."}
              </code>
              {token && (
                <Button size="sm" variant="outline" onClick={() => copy(token, "Token")}>
                  <Copy className="w-3 h-3" />
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Envie sempre o token no corpo do payload. Mantenha-o privado.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eventos suportados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {events.map((ev) => (
              <div key={ev.name} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/30">
                <Badge variant="secondary" className="font-mono text-[10px] mt-0.5">
                  {ev.name}
                </Badge>
                <p className="text-xs text-muted-foreground">{ev.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Code2 className="w-4 h-4" /> Exemplo de payload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Button
              size="sm"
              variant="outline"
              className="absolute top-2 right-2 z-10"
              onClick={() => copy(JSON.stringify(samplePayload, null, 2), "Payload")}
            >
              <Copy className="w-3 h-3" />
            </Button>
            <pre className="text-[11px] bg-muted/50 p-3 rounded-md overflow-x-auto font-mono">
{JSON.stringify(samplePayload, null, 2)}
            </pre>
          </div>

          <div className="relative">
            <p className="text-xs font-medium text-muted-foreground mb-1">Exemplo cURL</p>
            <Button
              size="sm"
              variant="outline"
              className="absolute top-6 right-2 z-10"
              onClick={() => copy(curlExample, "cURL")}
            >
              <Copy className="w-3 h-3" />
            </Button>
            <pre className="text-[11px] bg-muted/50 p-3 rounded-md overflow-x-auto font-mono">
{curlExample}
            </pre>
          </div>

          <div className="border-l-2 border-amber-500 pl-3 py-1 bg-amber-500/5">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Respostas</p>
            <ul className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
              <li>• <code className="font-mono">200</code> — sucesso, retorna o registro criado/atualizado</li>
              <li>• <code className="font-mono">401</code> — token inválido ou ausente</li>
              <li>• <code className="font-mono">400</code> — payload inválido (faltam campos obrigatórios)</li>
              <li>• <code className="font-mono">429</code> — rate limit (100 req/min por token)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
