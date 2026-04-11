
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Brain, Send, Loader2, Plus, MessageCircle, Clock, User, Sparkles } from "lucide-react";

interface CRMMemoryTabProps {
  customerProductId: string;
}

interface Memory {
  id: string;
  client_name: string;
  client_phone: string | null;
  interaction_date: string;
  summary: string;
  topics: string[];
  sentiment: string;
  raw_message_count: number;
  created_at: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  memoriesUsed?: number;
}

export function CRMMemoryTab({ customerProductId }: CRMMemoryTabProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [querying, setQuerying] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ clientName: "", clientPhone: "", summary: "", sentiment: "neutro" });
  const [adding, setAdding] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMemories();
  }, [customerProductId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const loadMemories = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("crm-memory", {
        body: { action: "list", customerProductId },
      });
      if (error) throw error;
      setMemories(data?.memories || []);
    } catch (err) {
      console.error("Error loading memories:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = async () => {
    if (!question.trim() || querying) return;

    const userMsg: ChatMessage = { role: "user", content: question };
    setChatMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setQuerying(true);

    try {
      const { data, error } = await supabase.functions.invoke("crm-memory", {
        body: { action: "query", customerProductId, question: userMsg.content },
      });
      if (error) throw error;

      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer, memoriesUsed: data.memories_used },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Erro ao consultar memória. Tente novamente." },
      ]);
    } finally {
      setQuerying(false);
    }
  };

  const handleAddMemory = async () => {
    if (!addForm.clientName || !addForm.summary) return;
    setAdding(true);

    try {
      const { error } = await supabase.functions.invoke("crm-memory", {
        body: {
          action: "manual",
          customerProductId,
          clientName: addForm.clientName,
          clientPhone: addForm.clientPhone || null,
          summary: addForm.summary,
          sentiment: addForm.sentiment,
          topics: [],
        },
      });
      if (error) throw error;
      toast.success("Memória registrada!");
      setAddForm({ clientName: "", clientPhone: "", summary: "", sentiment: "neutro" });
      setAddOpen(false);
      loadMemories();
    } catch {
      toast.error("Erro ao salvar memória");
    } finally {
      setAdding(false);
    }
  };

  const sentimentColor = (s: string) => {
    if (s === "positivo") return "bg-green-500/10 text-green-600 border-green-500/20";
    if (s === "negativo") return "bg-red-500/10 text-red-600 border-red-500/20";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      {/* Chat RAG Interface */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Memória Contextual Infinita</CardTitle>
                <CardDescription>Pergunte sobre qualquer cliente — a IA busca todo o histórico</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {memories.length} memórias
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Chat messages */}
          <div className="min-h-[200px] max-h-[400px] overflow-y-auto mb-4 space-y-3 p-3 rounded-lg bg-muted/30 border">
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[180px] text-muted-foreground text-sm gap-2">
                <Brain className="h-8 w-8 opacity-40" />
                <p>Pergunte algo como:</p>
                <p className="italic text-xs">"Qual foi a última vez que o Sr. João veio aqui?"</p>
                <p className="italic text-xs">"O que a Maria reclamou no mês passado?"</p>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background border shadow-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.memoriesUsed !== undefined && msg.memoriesUsed > 0 && (
                    <p className="text-xs mt-1 opacity-60">{msg.memoriesUsed} memórias consultadas</p>
                  )}
                </div>
              </div>
            ))}
            {querying && (
              <div className="flex justify-start">
                <div className="bg-background border rounded-lg px-3 py-2 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleQuery()}
              placeholder="Pergunte sobre um cliente..."
              disabled={querying}
            />
            <Button onClick={handleQuery} disabled={querying || !question.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Memories list + Add button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Memórias Registradas</h3>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" /> Adicionar Memória
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Nova Memória</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Cliente *</Label>
                <Input
                  value={addForm.clientName}
                  onChange={(e) => setAddForm({ ...addForm, clientName: e.target.value })}
                  placeholder="Ex: João Silva"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={addForm.clientPhone}
                  onChange={(e) => setAddForm({ ...addForm, clientPhone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label>Resumo da Interação *</Label>
                <Textarea
                  value={addForm.summary}
                  onChange={(e) => setAddForm({ ...addForm, summary: e.target.value })}
                  placeholder="Descreva o que aconteceu nessa interação..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Sentimento</Label>
                <Select value={addForm.sentiment} onValueChange={(v) => setAddForm({ ...addForm, sentiment: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positivo">😊 Positivo</SelectItem>
                    <SelectItem value="neutro">😐 Neutro</SelectItem>
                    <SelectItem value="negativo">😠 Negativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddMemory} disabled={adding || !addForm.clientName || !addForm.summary}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : memories.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Brain className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Nenhuma memória registrada ainda.</p>
            <p className="text-sm">Adicione manualmente ou conecte o WhatsApp para captura automática.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {memories.map((mem) => (
            <Card key={mem.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm truncate">{mem.client_name}</span>
                      <Badge variant="outline" className={`text-xs shrink-0 ${sentimentColor(mem.sentiment)}`}>
                        {mem.sentiment}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{mem.summary}</p>
                    {mem.topics?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {mem.topics.map((t, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(mem.interaction_date).toLocaleDateString("pt-BR")}
                    </div>
                    {mem.raw_message_count > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageCircle className="h-3 w-3" />
                        {mem.raw_message_count} msgs
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
