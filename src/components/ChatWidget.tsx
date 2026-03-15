import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Mic, Paperclip, X, Loader2, Sparkles, Bot, MinusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  type: "user" | "system";
  content: string;
  timestamp: Date;
}

export function ChatWidget() {
  const { user } = useAuth();
  const email = user?.email ?? "";

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      type: "system",
      content: "Olá! 👋 Como posso ajudar você hoje?",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time listener
  useEffect(() => {
    if (!email) return;

    const channel = supabase
      .channel("chat_messages" as any)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `gmail=eq.${email}`,
        },
        (payload) => {
          const newMessage = payload.new as any;
          if (newMessage.direction === "bot_to_user") {
            setIsTyping(false);
            const msg: Message = {
              type: "system",
              content: newMessage.content,
              timestamp: new Date(newMessage.created_at),
            };
            setMessages((prev) => [...prev, msg]);
            if (!isOpen || isMinimized) {
              setUnreadCount((c) => c + 1);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [email, isOpen, isMinimized]);

  const saveMessageToSupabase = async (
    messageType: "texto" | "audio" | "arquivo",
    content: string
  ) => {
    if (!email) return null;
    try {
      const { data, error } = await (supabase
        .from("chat_messages" as any)
        .insert({ gmail: email, message: content, is_from_user: true } as any)
        .select()
        .single() as any);
      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error("Erro ao salvar mensagem:", error);
      return null;
    }
  };

  const sendToWebhook = async (data: { gmail: string; type: string; content: string }) => {
    try {
      setIsSending(true);
      const response = await fetch(
        "https://n8n.starai.com.br/webhook-test/chatbot-starai",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) throw new Error("Erro ao enviar mensagem");
      return true;
    } catch (error) {
      console.error("Erro ao enviar para webhook:", error);
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending || !email) return;

    const userMessage = inputText.trim();
    setMessages((prev) => [...prev, { type: "user", content: userMessage, timestamp: new Date() }]);
    setInputText("");

    await saveMessageToSupabase("texto", userMessage);
    setIsTyping(true);
    await sendToWebhook({ gmail: email, type: "texto", content: userMessage });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          setMessages((prev) => [
            ...prev,
            { type: "user", content: "🎤 Áudio enviado", timestamp: new Date() },
          ]);
          await saveMessageToSupabase("audio", base64Audio);
          await sendToWebhook({ gmail: email, type: "audio", content: base64Audio });
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast({
        title: "Erro no microfone",
        description: "Não foi possível acessar o microfone.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filePromises = Array.from(files).map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        })
    );

    const filesData = await Promise.all(filePromises);
    const filesContent = JSON.stringify(filesData);

    setMessages((prev) => [
      ...prev,
      { type: "user", content: `📎 ${filesData.length} arquivo(s) anexado(s)`, timestamp: new Date() },
    ]);

    await saveMessageToSupabase("arquivo", filesContent);
    await sendToWebhook({ gmail: email, type: "arquivo", content: filesContent });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setUnreadCount(0);
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  // Don't show widget if user is not logged in
  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-50 group"
          aria-label="Abrir chat"
        >
          <div className="relative h-14 w-14 rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <Bot className="h-6 w-6 text-primary-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-in zoom-in">
                {unreadCount}
              </span>
            )}
          </div>
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping pointer-events-none" />
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-6 right-6 w-[380px] bg-background rounded-2xl shadow-2xl shadow-black/20 flex flex-col z-50 overflow-hidden border border-border transition-all duration-300",
            isMinimized ? "h-[60px]" : "h-[580px]"
          )}
        >
          {/* Header */}
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-9 w-9 rounded-full bg-primary-foreground/15 backdrop-blur-sm flex items-center justify-center">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-400 rounded-full border-2 border-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">NovaLink IA</h3>
                <p className="text-[11px] text-primary-foreground/80 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-green-400 rounded-full" />
                  Online
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-7 w-7 hover:bg-primary-foreground/10 text-primary-foreground rounded-full"
              >
                <MinusIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 hover:bg-primary-foreground/10 text-primary-foreground rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-muted/30">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex gap-2 items-end animate-in fade-in slide-in-from-bottom-1 duration-200",
                      msg.type === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.type === "system" && (
                      <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Bot className="h-3.5 w-3.5 text-primary-foreground" />
                      </div>
                    )}
                    <div className="flex flex-col gap-0.5 max-w-[75%]">
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                          msg.type === "user"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-card border border-border rounded-bl-sm shadow-sm"
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>
                      <span
                        className={cn(
                          "text-[10px] text-muted-foreground px-1",
                          msg.type === "user" ? "text-right" : "text-left"
                        )}
                      >
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex gap-2 items-end animate-in fade-in slide-in-from-bottom-1">
                    <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Bot className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                    <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                      <div className="flex gap-1">
                        <div className="h-1.5 w-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="h-1.5 w-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="h-1.5 w-1.5 bg-muted-foreground/50 rounded-full animate-bounce" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="border-t border-border bg-background p-3">
                <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Escreva sua mensagem..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      className="h-10 rounded-xl pr-20 text-sm border-border focus-visible:ring-primary"
                      disabled={isSending}
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex gap-0.5">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSending}
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isSending}
                        className={cn(
                          "h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground",
                          isRecording && "text-destructive animate-pulse"
                        )}
                      >
                        <Mic className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!inputText.trim() || isSending}
                    className="h-10 w-10 rounded-xl shrink-0"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
                <p className="text-[10px] text-center text-muted-foreground mt-2">
                  Powered by <span className="font-medium">NovaLink</span>
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
