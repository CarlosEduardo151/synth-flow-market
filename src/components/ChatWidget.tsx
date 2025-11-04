import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Mic, Paperclip, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  type: "user" | "system";
  content: string;
  timestamp: Date;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [hasEmail, setHasEmail] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
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

  // Escutar mensagens do bot em tempo real
  useEffect(() => {
    if (!email) return;

    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `gmail=eq.${email}`,
        },
        (payload) => {
          const newMessage = payload.new as any;
          if (newMessage.direction === 'bot_to_user') {
            setIsTyping(false);
            setMessages((prev) => [
              ...prev,
              {
                type: 'system',
                content: newMessage.content,
                timestamp: new Date(newMessage.created_at),
              },
            ]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [email]);

  // Nova estrutura não usa sessões separadas

  const saveMessageToSupabase = async (
    messageType: "texto" | "audio" | "arquivo",
    content: string
  ) => {
    if (!email) return null;

    try {
      const { data: messageData, error } = await supabase
        .from("chat_messages")
        .insert({
          gmail: email,
          type: messageType,
          content: content,
          direction: "user_to_bot",
        })
        .select()
        .single();

      if (error) throw error;
      return messageData.id;
    } catch (error) {
      console.error("Erro ao salvar mensagem:", error);
      return null;
    }
  };

  const sendToWebhook = async (
    data: {
      gmail: string;
      type: string;
      content: string;
    }
  ) => {
    try {
      setIsSending(true);
      const response = await fetch("https://n8n.starai.com.br/webhook-test/chatbot-starai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Erro ao enviar mensagem");
      }

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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes("@")) {
      setHasEmail(true);
      setMessages([
        {
          type: "system",
          content: "Olá! Como posso ajudar você hoje?",
          timestamp: new Date(),
        },
      ]);
    } else {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um email válido.",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const userMessage = inputText.trim();
    setMessages((prev) => [
      ...prev,
      { type: "user", content: userMessage, timestamp: new Date() },
    ]);
    setInputText("");

    // Salvar no Supabase primeiro
    await saveMessageToSupabase("texto", userMessage);

    // Enviar para webhook
    setIsTyping(true);
    await sendToWebhook({
      gmail: email,
      type: "texto",
      content: userMessage,
    });
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
            { type: "user", content: "🎤 Áudio gravado", timestamp: new Date() },
          ]);

          // Salvar no Supabase
          await saveMessageToSupabase("audio", base64Audio);

          // Enviar para webhook
          await sendToWebhook({
            gmail: email,
            type: "audio",
            content: base64Audio,
          });
        };
        
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Erro ao acessar microfone:", error);
      toast({
        title: "Erro no microfone",
        description: "Não foi possível acessar o microfone. Verifique as permissões.",
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

    const filePromises = Array.from(files).map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    const filesData = await Promise.all(filePromises);
    const filesContent = JSON.stringify(filesData);

    setMessages((prev) => [
      ...prev,
      {
        type: "user",
        content: `📎 ${filesData.length} arquivo(s) anexado(s)`,
        timestamp: new Date(),
      },
    ]);

    // Salvar no Supabase
    await saveMessageToSupabase("arquivo", filesContent);

    // Enviar para webhook
    await sendToWebhook({
      gmail: email,
      type: "arquivo",
      content: filesContent,
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      {/* Botão flutuante estilo Crisp */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 z-50 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          size="icon"
        >
          <MessageCircle className="h-7 w-7 text-white" />
        </Button>
      )}

      {/* Janela do chat estilo Crisp */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[400px] h-[650px] bg-background rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden border border-border/50">
          {/* Header com gradiente */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h3 className="font-semibold text-base">StarAI</h3>
                <p className="text-xs text-white/90 flex items-center gap-1">
                  <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></span>
                  Online agora
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 hover:bg-white/10 text-white rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-hidden flex flex-col bg-gradient-to-b from-background to-muted/20">
            {!hasEmail ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <form onSubmit={handleEmailSubmit} className="w-full space-y-5">
                  <div className="text-center space-y-3">
                    <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
                      <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <h4 className="font-bold text-xl">Olá! 👋</h4>
                    <p className="text-sm text-muted-foreground">
                      Digite seu email para começarmos a conversa
                    </p>
                  </div>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-12 rounded-xl border-2 focus:border-blue-500 transition-colors"
                  />
                  <Button 
                    type="submit" 
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 font-semibold"
                  >
                    Iniciar conversa
                  </Button>
                </form>
              </div>
            ) : (
              <>
                {/* Mensagens */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex gap-2 items-end animate-in fade-in slide-in-from-bottom-2 duration-300",
                        msg.type === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {msg.type === "system" && (
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                          msg.type === "user"
                            ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-br-md"
                            : "bg-card border border-border rounded-bl-md"
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>
                      {msg.type === "user" && (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold">Você</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex gap-2 items-end animate-in fade-in slide-in-from-bottom-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div className="bg-card border border-border rounded-2xl rounded-bl-md px-5 py-3 shadow-sm">
                        <div className="flex gap-1">
                          <div className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce"></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input de mensagem */}
                <div className="border-t bg-background p-4 space-y-3">
                  <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Digite sua mensagem..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                          }
                        }}
                        className="h-12 rounded-xl border-2 focus:border-blue-500 transition-colors pr-24"
                        disabled={isSending}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
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
                          className="h-8 w-8 rounded-lg hover:bg-muted"
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={isRecording ? stopRecording : startRecording}
                          disabled={isSending}
                          className={cn(
                            "h-8 w-8 rounded-lg hover:bg-muted",
                            isRecording && "text-red-500 animate-pulse"
                          )}
                        >
                          <Mic className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!inputText.trim() || isSending}
                      className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 flex-shrink-0"
                    >
                      {isSending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  </form>
                  <p className="text-xs text-center text-muted-foreground">
                    Desenvolvido por StarAI
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
