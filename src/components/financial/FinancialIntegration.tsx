import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, Webhook, Code, MessageSquare, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Props {
  customerProductId: string;
}

interface Config {
  id: string;
  webhook_token: string;
  n8n_webhook_url: string | null;
}

export function FinancialIntegration({ customerProductId }: Props) {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  const baseUrl = 'https://agndhravgmcwpdjkozka.supabase.co/functions/v1/financial-agent-webhook';

  useEffect(() => {
    fetchConfig();
  }, [customerProductId]);

  const fetchConfig = async () => {
    setLoading(true);
    const { data, error } = await (supabase
      .from('financial_agent_config' as any)
      .select('id, webhook_token, n8n_webhook_url')
      .eq('customer_product_id', customerProductId)
      .single() as any);

    if (error) {
      toast({ title: "Erro ao carregar configurações", variant: "destructive" });
    } else {
      setConfig(data as Config);
    }
    setLoading(false);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast({ title: `${label} copiado!` });
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRegenerateToken = async () => {
    if (!config) return;

    const newToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    
    const { error } = await (supabase
      .from('financial_agent_config' as any)
      .update({ webhook_token: newToken })
      .eq('id', config.id) as any);

    if (error) {
      toast({ title: "Erro ao regenerar token", variant: "destructive" });
    } else {
      toast({ title: "Token regenerado!" });
      setConfig({ ...config, webhook_token: newToken });
    }
  };

  if (loading || !config) {
    return <div className="animate-pulse space-y-4">
      {[...Array(3)].map((_, i) => <Card key={i} className="h-32 bg-muted/50" />)}
    </div>;
  }

  const webhookUrl = `${baseUrl}?customer_product_id=${customerProductId}&token=${config.webhook_token}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Integração com Chatbot</h2>
      </div>

      {/* Webhook URL */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-primary/20">
            <Webhook className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Sua URL de Webhook</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Use esta URL no seu workflow n8n para enviar comandos ao Agente Financeiro
            </p>
            <div className="flex items-center gap-2">
              <Input 
                value={webhookUrl} 
                readOnly 
                className="font-mono text-sm bg-background/50"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(webhookUrl, 'URL')}
              >
                {copied === 'URL' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRegenerateToken}>
                <RefreshCw className="h-4 w-4 mr-2" /> Regenerar Token
              </Button>
              <p className="text-xs text-muted-foreground">
                Isso invalidará a URL antiga
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Documentation */}
      <Card className="p-6 bg-card/80 backdrop-blur-sm">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Code className="h-5 w-5" />
          Documentação da API
        </h3>

        <Tabs defaultValue="structure" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="structure">Estrutura</TabsTrigger>
            <TabsTrigger value="fields">Campos</TabsTrigger>
            <TabsTrigger value="example">Exemplo Completo</TabsTrigger>
          </TabsList>

          <TabsContent value="structure" className="space-y-4">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <h4 className="font-semibold text-emerald-600 mb-2">Requisição Única</h4>
              <p className="text-sm text-muted-foreground">
                Todos os campos são <strong>opcionais</strong>. Envie apenas o que precisar em uma única requisição.
                O webhook processa automaticamente cada campo presente.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-2">Campos de Identificação</h4>
              <div className="space-y-2 text-sm">
                <p><code className="text-primary">session_id</code> - ID da conversa (para separar históricos)</p>
                <p><code className="text-primary">message</code> - Mensagem para registrar no chat</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-2">Campos de Transação</h4>
              <div className="space-y-2 text-sm">
                <p><code className="text-primary">transaction_type</code> - "income" ou "expense"</p>
                <p><code className="text-primary">amount</code> - Valor da transação</p>
                <p><code className="text-primary">description</code> - Descrição</p>
                <p><code className="text-primary">date</code> - Data (YYYY-MM-DD)</p>
                <p><code className="text-primary">payment_method</code> - Forma de pagamento</p>
                <p><code className="text-primary">tags</code> - Array de tags</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-2">Campos de Fatura</h4>
              <div className="space-y-2 text-sm">
                <p><code className="text-primary">invoice_title</code> - Título da fatura</p>
                <p><code className="text-primary">invoice_amount</code> - Valor</p>
                <p><code className="text-primary">invoice_due_date</code> - Data de vencimento</p>
                <p><code className="text-primary">invoice_notes</code> - Observações</p>
                <p><code className="text-primary">invoice_recurring</code> - true/false</p>
                <p><code className="text-primary">mark_paid_invoice_id</code> - ID para marcar como paga</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-2">Campos de Consulta</h4>
              <div className="space-y-2 text-sm">
                <p><code className="text-primary">get_balance</code> - true para obter saldo</p>
                <p><code className="text-primary">get_pending_invoices</code> - true para listar pendentes</p>
                <p><code className="text-primary">get_summary</code> - true para resumo mensal</p>
                <p><code className="text-primary">balance_start_date</code> - Filtro de data início</p>
                <p><code className="text-primary">balance_end_date</code> - Filtro de data fim</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="fields" className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Campo</th>
                    <th className="text-left p-2">Tipo</th>
                    <th className="text-left p-2">Descrição</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr><td className="p-2"><code>session_id</code></td><td className="p-2">string</td><td className="p-2">ID da sessão de conversa</td></tr>
                  <tr><td className="p-2"><code>message</code></td><td className="p-2">string</td><td className="p-2">Mensagem para o chat</td></tr>
                  <tr><td className="p-2"><code>transaction_type</code></td><td className="p-2">string</td><td className="p-2">"income" ou "expense"</td></tr>
                  <tr><td className="p-2"><code>amount</code></td><td className="p-2">number</td><td className="p-2">Valor monetário</td></tr>
                  <tr><td className="p-2"><code>description</code></td><td className="p-2">string</td><td className="p-2">Descrição da transação</td></tr>
                  <tr><td className="p-2"><code>date</code></td><td className="p-2">string</td><td className="p-2">Data (YYYY-MM-DD)</td></tr>
                  <tr><td className="p-2"><code>payment_method</code></td><td className="p-2">string</td><td className="p-2">Forma de pagamento</td></tr>
                  <tr><td className="p-2"><code>tags</code></td><td className="p-2">array</td><td className="p-2">Lista de categorias</td></tr>
                  <tr><td className="p-2"><code>invoice_title</code></td><td className="p-2">string</td><td className="p-2">Título da fatura</td></tr>
                  <tr><td className="p-2"><code>invoice_amount</code></td><td className="p-2">number</td><td className="p-2">Valor da fatura</td></tr>
                  <tr><td className="p-2"><code>invoice_due_date</code></td><td className="p-2">string</td><td className="p-2">Vencimento (YYYY-MM-DD)</td></tr>
                  <tr><td className="p-2"><code>get_balance</code></td><td className="p-2">boolean</td><td className="p-2">Retorna saldo</td></tr>
                  <tr><td className="p-2"><code>get_pending_invoices</code></td><td className="p-2">boolean</td><td className="p-2">Lista faturas pendentes</td></tr>
                  <tr><td className="p-2"><code>get_summary</code></td><td className="p-2">boolean</td><td className="p-2">Resumo do mês</td></tr>
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="example" className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-2">Requisição Completa (tudo opcional)</h4>
              <pre className="text-xs p-4 bg-background rounded overflow-x-auto">
{`curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "session_id": "uuid-da-conversa",
    "message": "Registrando despesa de mercado",
    "transaction_type": "expense",
    "amount": 150.00,
    "description": "Supermercado",
    "date": "2024-12-15",
    "payment_method": "pix",
    "tags": ["alimentação", "essencial"],
    "get_balance": true
  }'`}
              </pre>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-2">Resposta</h4>
              <pre className="text-xs p-4 bg-background rounded overflow-x-auto">
{`{
  "success": true,
  "message": "Despesa de R$ 150.00 adicionada!\\nSaldo: R$ 850.00",
  "session_id": "uuid-da-conversa",
  "results": {
    "transaction": { ... },
    "balance": { "income": 1000, "expenses": 150, "total": 850 }
  }
}`}
              </pre>
            </div>

            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <h4 className="font-semibold text-blue-600 mb-2">Dica: session_id</h4>
              <p className="text-sm text-muted-foreground">
                Use o <code>session_id</code> para separar conversas de diferentes canais ou usuários.
                As mensagens serão salvas associadas a esse ID, permitindo histórico separado para cada conversa.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Chat Logs */}
      <Card className="p-6 bg-card/80 backdrop-blur-sm">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Logs do Chatbot
        </h3>
        <ChatLogs customerProductId={customerProductId} />
      </Card>
    </div>
  );
}

function ChatLogs({ customerProductId }: { customerProductId: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [customerProductId]);

  const fetchLogs = async () => {
    const { data } = await (supabase
      .from('financial_agent_chat_logs' as any)
      .select('*')
      .eq('customer_product_id', customerProductId)
      .order('created_at', { ascending: false })
      .limit(20) as any);

    setLogs(data || []);
    setLoading(false);
  };

  if (loading) {
    return <div className="animate-pulse space-y-2">
      {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted/50 rounded" />)}
    </div>;
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma interação com chatbot ainda
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto">
      {logs.map(log => {
        const isIncoming = log.direction === 'inbound' || log.direction === 'incoming';
        return (
        <div
          key={log.id}
          className={`p-3 rounded-lg ${
            isIncoming 
              ? 'bg-muted/50 ml-0 mr-12' 
              : 'bg-primary/10 ml-12 mr-0'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${isIncoming ? 'text-blue-500' : 'text-emerald-500'}`}>
                {isIncoming ? 'Usuário' : 'Agente'}
              </span>
              {log.session_id && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                  {log.session_id.slice(0, 8)}...
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(log.created_at).toLocaleString('pt-BR')}
            </span>
          </div>
          <p className="text-sm">{log.message}</p>
          {log.action_type && (
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">
              {log.action_type}
            </span>
          )}
        </div>
      )})}
    </div>
  );
}
