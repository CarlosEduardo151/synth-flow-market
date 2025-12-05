import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Send, Bot, User, RefreshCw, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Message {
  id: string;
  agent_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: any;
  created_at: string;
}

type AgentEstado = 'ativado' | 'desativado' | 'reiniciando' | 'desconhecido';

const N8nAgentChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [agentEstado, setAgentEstado] = useState<AgentEstado>('desconhecido');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const webhookUrl = 'https://agndhravgmcwpdjkozka.supabase.co/functions/v1/n8n-chat';

  // Load agent state from localStorage
  useEffect(() => {
    const savedEstado = localStorage.getItem('agentEstado') as AgentEstado;
    if (savedEstado) {
      setAgentEstado(savedEstado);
    }
    
    // Listen for estado changes from N8nAgentControl
    const handleEstadoChange = (event: CustomEvent<{ estado: AgentEstado }>) => {
      setAgentEstado(event.detail.estado);
      localStorage.setItem('agentEstado', event.detail.estado);
    };
    
    window.addEventListener('agentEstadoChanged', handleEstadoChange as EventListener);
    return () => {
      window.removeEventListener('agentEstadoChanged', handleEstadoChange as EventListener);
    };
  }, []);

  // Load messages
  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('n8n_agent_messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar mensagens',
        variant: 'destructive'
      });
      return;
    }

    setMessages((data as Message[]) || []);
  };

  // Send message from admin (user role)
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setLoading(true);
    
    // Insert directly to database as user message
    const { error } = await supabase
      .from('n8n_agent_messages')
      .insert({
        agent_id: 'default',
        role: 'user',
        content: newMessage,
        metadata: { source: 'admin_panel', estado: agentEstado }
      });

    if (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar mensagem',
        variant: 'destructive'
      });
    } else {
      setNewMessage('');
      // Also send to n8n webhook so the AI agent can respond
      try {
        await fetch('https://n8n.starai.com.br/webhook-test/control-agente', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'chat_message',
            message: newMessage,
            estado: agentEstado, // Estado atual do agente: ativado, desativado, reiniciando, desconhecido
            source: 'admin_panel',
            timestamp: new Date().toISOString(),
            webhookUrl
          })
        });
      } catch (e) {
        console.log('n8n webhook call failed (may be expected):', e);
      }
    }

    setLoading(false);
  };

  // Copy webhook URL
  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast({
      title: 'Copiado!',
      description: 'URL do webhook copiada'
    });
    setTimeout(() => setCopied(false), 2000);
  };

  // Subscribe to realtime updates
  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel('n8n-agent-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'n8n_agent_messages'
        },
        (payload) => {
          console.log('New message received:', payload);
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Chat com AI Agent (n8n)
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadMessages}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Webhook URL display */}
        <div className="mt-2 p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">URL para n8n enviar mensagens:</p>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-background p-2 rounded flex-1 overflow-x-auto">
              {webhookUrl}
            </code>
            <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Payload: <code>{`{ "message": "texto", "agentId": "default", "role": "assistant" }`}</code>
          </p>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma mensagem ainda.</p>
                <p className="text-xs">Configure o n8n para enviar mensagens para a URL acima.</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role !== 'user' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={msg.role === 'user' ? 'secondary' : 'outline'} className="text-xs">
                        {msg.role === 'user' ? 'Você' : msg.role === 'assistant' ? 'AI Agent' : 'Sistema'}
                      </Badge>
                      <span className="text-xs opacity-70">
                        {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="p-4 border-t">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex gap-2"
          >
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite uma mensagem..."
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};

export default N8nAgentChat;
