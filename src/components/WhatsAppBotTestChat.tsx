import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Trash2 } from "lucide-react";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? String(Date.now());
}

export function WhatsAppBotTestChat(props: { customerProductId: string; businessName?: string }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const title = useMemo(() => props.businessName ? `Chat de teste — ${props.businessName}` : "Chat de teste", [props.businessName]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = { id: newId(), role: "user", content: trimmed, createdAt: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setText("");
    setSending(true);

    try {
      const { data, error } = await (supabase as any).functions.invoke("whatsapp-internal-chat", {
        body: { customer_product_id: props.customerProductId, message: trimmed },
      });
      if (error) throw error;

      const replyText = String(data?.reply ?? "").trim() || "Ok!";
      const botMsg: ChatMessage = { id: newId(), role: "assistant", content: replyText, createdAt: Date.now() };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e: any) {
      toast({
        title: "Erro ao testar o bot",
        description: e?.message || "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>{title}</CardTitle>
        <Button
          type="button"
          variant="outline"
          onClick={() => setMessages([])}
          disabled={messages.length === 0 || sending}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Limpar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-[420px] rounded-lg border bg-background">
          <div className="p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Envie uma mensagem para simular a conversa e ver como o motor interno responde.
              </div>
            ) : null}

            {messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl px-4 py-2 bg-primary text-primary-foreground"
                      : "max-w-[85%] rounded-2xl px-4 py-2 bg-muted text-foreground"
                  }
                >
                  <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Digite uma mensagem para testar..."
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            disabled={sending}
          />
          <Button type="button" onClick={send} disabled={sending || !text.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
