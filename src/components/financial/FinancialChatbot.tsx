import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Sparkles, 
  Trash2,
  Image as ImageIcon,
  Check,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  attachments?: { type: 'image'; mime: string; data: string; name?: string }[] | null;
}

interface FinancialChatbotProps {
  customerProductId: string;
}

type ActionRequest = {
  id: string;
  action_type: string;
  payload: any;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
  created_at: string;
  error?: string | null;
};

export function FinancialChatbot({ customerProductId }: FinancialChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingActions, setPendingActions] = useState<ActionRequest[]>([]);
  const [selectedImage, setSelectedImage] = useState<{ mime: string; data: string; name?: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    void fetchHistory();
    void fetchPendingActions();
  }, [customerProductId]);

  const canClear = messages.length > 0;

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messages]);

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('financial_agent_chat_messages' as any)
      .select('id, role, content, attachments, created_at')
      .eq('customer_product_id', customerProductId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Error loading chat history:', error);
      return;
    }
    setMessages((data || []) as any);
  };

  const fetchPendingActions = async () => {
    const { data, error } = await supabase
      .from('financial_agent_action_requests' as any)
      .select('*')
      .eq('customer_product_id', customerProductId)
      .in('status', ['pending', 'approved', 'executed', 'failed', 'rejected'])
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) {
      console.error('Error loading actions:', error);
      return;
    }
    setPendingActions((data || []) as any);
  };

  const clearChat = () => {
    // We keep the DB history by default (auditable). If you want hard delete later, we can add an admin-only feature.
    toast({
      title: 'Histórico',
      description: 'Para auditoria, o histórico fica salvo. Você pode iniciar uma nova conversa enviando uma nova mensagem.',
    });
  };

  const onPickImage = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Arquivo inválido', description: 'Envie uma imagem.', variant: 'destructive' });
      return;
    }
    const maxBytes = 4 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast({ title: 'Imagem muito grande', description: 'Limite: 4MB', variant: 'destructive' });
      return;
    }

    const base64 = await fileToBase64(file);
    setSelectedImage({ mime: file.type, data: base64, name: file.name });
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message to UI immediately
    const tempUserMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
      attachments: selectedImage ? [{ type: 'image', mime: selectedImage.mime, data: selectedImage.data, name: selectedImage.name }] : null,
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setSelectedImage(null);

    try {
      const attachments = tempUserMsg.attachments || undefined;
      const { data, error } = await supabase.functions.invoke('financial-agent-chat', {
        body: {
          customerProductId,
          message: userMessage,
          attachments,
        },
      });

      if (error) {
        throw error;
      }

      const assistantMessage = (data as any)?.reply || 'Ok.';

      // Adicionar resposta do assistente
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantMessage,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMsg]);

      await fetchPendingActions();

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro",
        description: "Não foi possível conectar ao agente. Tente novamente.",
        variant: "destructive"
      });
      
      // Adicionar mensagem de erro
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Desculpe, houve um erro ao processar sua mensagem. Por favor, tente novamente.',
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const decideAction = async (actionRequestId: string, decision: 'approved' | 'rejected') => {
    try {
      const { data, error } = await supabase.functions.invoke('financial-agent-actions', {
        body: { actionRequestId, decision },
      });
      if (error) throw error;
      toast({ title: decision === 'approved' ? 'Aprovado' : 'Rejeitado' });
      await fetchPendingActions();
      // Refresh history to include system message
      await fetchHistory();
      return data;
    } catch (e) {
      console.error('decideAction error:', e);
      toast({ title: 'Erro', description: 'Falha ao processar aprovação.', variant: 'destructive' });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[600px] rounded-xl border border-border/50 overflow-hidden bg-card/80 backdrop-blur-sm">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Agente Financeiro</h3>
            <p className="text-xs text-muted-foreground">Sempre disponível</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={clearChat}
          className="h-8 w-8"
          title="Limpar conversa"
          disabled={!canClear}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Pending approvals */}
      {pendingActions.some((a) => a.status === 'pending') && (
        <div className="p-3 border-b border-border/50 bg-muted/20">
          <div className="text-xs text-muted-foreground mb-2">Ações pendentes de aprovação</div>
          <div className="space-y-2">
            {pendingActions
              .filter((a) => a.status === 'pending')
              .slice(0, 2)
              .map((a) => (
                <Card key={a.id} className="p-3 bg-card/60">
                  <div className="text-sm font-medium">{a.action_type}</div>
                  <div className="text-xs text-muted-foreground mt-1 break-words">
                    {JSON.stringify(a.payload)}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => decideAction(a.id, 'approved')} className="flex items-center gap-2">
                      <Check className="h-4 w-4" /> Aprovar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => decideAction(a.id, 'rejected')} className="flex items-center gap-2">
                      <X className="h-4 w-4" /> Rejeitar
                    </Button>
                  </div>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <div className="p-4 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-600/20 mb-4">
                <Sparkles className="h-12 w-12 text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Olá! Sou seu Agente Financeiro</h3>
              <p className="text-muted-foreground max-w-md mb-4">
                Posso ajudar com análises financeiras, registrar transações, 
                criar relatórios e muito mais.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  "Qual meu saldo atual?",
                  "Registrar uma despesa",
                  "Mostrar faturas pendentes"
                ].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    onClick={() => setInput(suggestion)}
                    className="text-xs"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            sortedMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {(message.role === 'assistant' || message.role === 'system') && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2",
                    message.role === 'user'
                      ? "bg-primary text-primary-foreground"
                      : message.role === 'system'
                        ? "bg-muted/60 border border-border/50"
                        : "bg-muted"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {Array.isArray(message.attachments) && message.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.attachments.map((att, idx) => (
                        <img
                          key={idx}
                          src={`data:${att.mime};base64,${att.data}`}
                          alt={att.name ? `Imagem: ${att.name}` : 'Imagem enviada'}
                          loading="lazy"
                          className="max-h-56 rounded-lg border border-border/50"
                        />
                      ))}
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-muted rounded-2xl px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border/50">
        {selectedImage && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/40 px-3 py-2">
            <div className="text-xs text-muted-foreground truncate">
              Imagem anexada: <span className="text-foreground">{selectedImage.name || selectedImage.mime}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedImage(null)}>
              Remover
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <label className="inline-flex">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPickImage(e.target.files?.[0] || null)}
              disabled={isLoading}
            />
            <Button type="button" variant="outline" size="icon" disabled={isLoading} title="Anexar imagem">
              <ImageIcon className="h-4 w-4" />
            </Button>
          </label>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Digite sua mensagem..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={sendMessage} 
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

