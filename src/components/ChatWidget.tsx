import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Mic, Paperclip, X, Loader2, Bot, MinusIcon, ImageIcon, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Attachment {
  type: "image" | "document" | "audio";
  mime: string;
  data: string;
  name?: string;
  preview?: string; // data URL for image previews
}

interface Message {
  type: "user" | "system";
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
}

const NOVALINK_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/novalink-chat`;

export function ChatWidget() {
  const { user, session } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      type: "system",
      content: "Olá! 👋 Sou a **NovaLink IA**. Posso entender texto, imagens, documentos e áudios. Como posso te ajudar?",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages]);

  // Build history from messages for context
  const buildHistory = useCallback(() => {
    return messages
      .filter((m) => m.content)
      .slice(-20)
      .map((m) => ({
        role: m.type === "user" ? "user" as const : "assistant" as const,
        content: m.content,
      }));
  }, [messages]);

  // ── Stream chat from edge function ─────────────────────────
  const streamChat = async (userText: string, attachments: Attachment[]) => {
    const token = session?.access_token;
    if (!token) {
      toast({ title: "Sessão expirada", description: "Faça login novamente.", variant: "destructive" });
      return;
    }

    setIsStreaming(true);

    const apiAttachments = attachments.map((a) => ({
      type: a.type,
      mime: a.mime,
      data: a.data,
      name: a.name,
    }));

    try {
      const resp = await fetch(NOVALINK_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userText,
          attachments: apiAttachments.length ? apiAttachments : undefined,
          history: buildHistory(),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || `Erro ${resp.status}`);
      }

      if (!resp.body) throw new Error("Sem corpo de resposta");

      // Stream SSE
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantSoFar = "";

      const upsertAssistant = (text: string) => {
        assistantSoFar = text;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.type === "system" && last.content === assistantSoFar) return prev;
          if (last?.type === "system" && prev.length > 1 && prev[prev.length - 2]?.type === "user") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
            );
          }
          return [...prev, { type: "system", content: assistantSoFar, timestamp: new Date() }];
        });
      };

      // Create initial empty assistant message
      setMessages((prev) => [...prev, { type: "system", content: "", timestamp: new Date() }]);

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              upsertAssistant(assistantSoFar);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Final flush
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              upsertAssistant(assistantSoFar);
            }
          } catch { /* ignore */ }
        }
      }

      if (!assistantSoFar) {
        upsertAssistant("Desculpe, não consegui gerar uma resposta. Tente novamente.");
      }
    } catch (e) {
      console.error("NovaLink chat error:", e);
      setMessages((prev) => [
        ...prev.filter((m) => m.content !== ""),
        {
          type: "system",
          content: `⚠️ ${e instanceof Error ? e.message : "Erro ao consultar a IA. Tente novamente."}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  // ── Send message ────────────────────────────────────────────
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && pendingAttachments.length === 0) || isStreaming) return;

    const userText = inputText.trim();
    const atts = [...pendingAttachments];

    setMessages((prev) => [
      ...prev,
      { type: "user", content: userText || (atts.length ? "📎 Anexo enviado" : ""), timestamp: new Date(), attachments: atts },
    ]);
    setInputText("");
    setPendingAttachments([]);

    await streamChat(userText, atts);
  };

  // ── File upload ─────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: Attachment[] = [];

    for (const file of Array.from(files)) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Strip data URI prefix to get pure base64
          const base64Part = result.includes(",") ? result.split(",")[1] : result;
          resolve(base64Part);
        };
        reader.readAsDataURL(file);
      });

      const preview = file.type.startsWith("image/")
        ? await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          })
        : undefined;

      let type: Attachment["type"] = "document";
      if (file.type.startsWith("image/")) type = "image";
      else if (file.type.startsWith("audio/")) type = "audio";

      newAttachments.push({
        type,
        mime: file.type,
        data: base64,
        name: file.name,
        preview,
      });
    }

    setPendingAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (idx: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Audio recording ─────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64Part = result.includes(",") ? result.split(",")[1] : result;
          setPendingAttachments((prev) => [
            ...prev,
            { type: "audio", mime: "audio/webm", data: base64Part, name: "gravação.webm" },
          ]);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast({ title: "Erro no microfone", description: "Não foi possível acessar o microfone.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setUnreadCount(0);
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button onClick={handleOpen} className="fixed bottom-6 right-6 z-50 group" aria-label="Abrir chat">
          <div className="relative h-14 w-14 rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <Bot className="h-6 w-6 text-primary-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-in zoom-in">
                {unreadCount}
              </span>
            )}
          </div>
          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping pointer-events-none" />
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-6 right-6 w-[400px] bg-background rounded-2xl shadow-2xl shadow-black/20 flex flex-col z-50 overflow-hidden border border-border transition-all duration-300",
            isMinimized ? "h-[60px]" : "h-[600px]"
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
                  {isStreaming ? "Digitando..." : "Online"}
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
                    <div className="flex flex-col gap-0.5 max-w-[80%]">
                      {/* Attachment previews for user messages */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-1">
                          {msg.attachments.map((att, ai) => (
                            <div key={ai} className="rounded-lg overflow-hidden border border-border">
                              {att.type === "image" && att.preview ? (
                                <img src={att.preview} alt={att.name} className="h-16 w-16 object-cover" />
                              ) : (
                                <div className="h-10 px-2 flex items-center gap-1.5 bg-muted text-xs text-muted-foreground">
                                  {att.type === "audio" ? <Mic className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                                  <span className="truncate max-w-[80px]">{att.name || att.type}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                          msg.type === "user"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-card border border-border rounded-bl-sm shadow-sm"
                        )}
                      >
                        {msg.type === "system" ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        )}
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

                {isStreaming && messages[messages.length - 1]?.content === "" && (
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

              {/* Pending attachments bar */}
              {pendingAttachments.length > 0 && (
                <div className="px-3 py-2 border-t border-border bg-muted/50 flex flex-wrap gap-2">
                  {pendingAttachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2 py-1 text-xs"
                    >
                      {att.type === "image" ? (
                        att.preview ? (
                          <img src={att.preview} alt="" className="h-6 w-6 rounded object-cover" />
                        ) : (
                          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        )
                      ) : att.type === "audio" ? (
                        <Mic className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="truncate max-w-[80px] text-muted-foreground">{att.name || att.type}</span>
                      <button onClick={() => removeAttachment(idx)} className="text-muted-foreground hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input area */}
              <div className="border-t border-border bg-background p-3">
                <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                  <div className="flex-1 relative">
                    <input
                      placeholder="Escreva sua mensagem..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      className="w-full h-10 rounded-xl pr-20 pl-3 text-sm border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      disabled={isStreaming}
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex gap-0.5">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,audio/*"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isStreaming}
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isStreaming}
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
                    disabled={(!inputText.trim() && pendingAttachments.length === 0) || isStreaming}
                    className="h-10 w-10 rounded-xl shrink-0"
                  >
                    {isStreaming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
                <p className="text-[10px] text-center text-muted-foreground mt-2">
                  Powered by <span className="font-medium">NovaLink IA</span> ✨
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
