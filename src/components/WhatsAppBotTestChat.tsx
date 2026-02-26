import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Trash2, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

export function WhatsAppBotTestChat(props: { customerProductId: string; businessName?: string; motorActive?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showMotorOffDialog, setShowMotorOffDialog] = useState(false);

  const title = useMemo(() => props.businessName ? `Chat de teste — ${props.businessName}` : "Chat de teste", [props.businessName]);
  const motorOff = props.motorActive === false;

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

      if (error || data?.error) {
        setShowMotorOffDialog(true);
        return;
      }

      const replyText = String(data?.reply ?? "").trim() || "Ok!";
      const botMsg: ChatMessage = { id: newId(), role: "assistant", content: replyText, createdAt: Date.now() };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setShowMotorOffDialog(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
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
            {motorOff && (
              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive">
                🔴 O motor está desligado. Ligue-o na aba <strong>Status</strong> para testar o chat.
              </div>
            )}
            {messages.length === 0 && !motorOff ? (
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
          <Button type="button" onClick={send} disabled={sending || !text.trim() || motorOff}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>

      <AlertDialog open={showMotorOffDialog} onOpenChange={setShowMotorOffDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <AlertDialogTitle>Motor Desativado</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm leading-relaxed">
              O motor do seu bot está desativado no momento. Para que ele possa processar e responder mensagens, é necessário ativá-lo na aba <strong className="text-foreground">Status</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
