import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Brain, Send, Loader2, Plus, MessageCircle, Clock, User,
  Sparkles, Search, Activity, Smartphone, RefreshCw, TrendingUp
} from "lucide-react";

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
  const [searchFilter, setSearchFilter] = useState("");
  const [refreshing, setRefreshing] = useState(false);
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

  const handleRefreshFromWhatsApp = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("crm-memory", {
        body: { action: "sync_whatsapp", customerProductId },
      });
      if (error) throw error;
      toast.success(data?.message || "Memórias sincronizadas do WhatsApp!");
      await loadMemories();
    } catch {
      toast.error("Erro ao sincronizar memórias do WhatsApp");
    } finally {
      setRefreshing(false);
    }
  }, [customerProductId]);

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
    } catch {
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

  const sentimentIcon = (s: string) => {
    if (s === "positivo") return "😊";
    if (s === "negativo") return "😠";
    return "😐";
  };

  const filteredMemories = memories.filter((m) => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      m.client_name.toLowerCase().includes(q) ||
      m.summary.toLowerCase().includes(q) ||
      m.topics?.some((t) => t.toLowerCase().includes(q))
    );
  });

  const stats = {
    total: memories.length,
    positive: memories.filter((m) => m.sentiment === "positivo").length,
    negative: memories.filter((m) => m.sentiment === "negativo").length,
    neutral: memories.filter((m) => m.sentiment === "neutro").length,
    totalMessages: memories.reduce((sum, m) => sum + (m.raw_message_count || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Memória IA</h2>
            <p className="text-sm text-muted-foreground">
              Histórico inteligente baseado nas conversas do WhatsApp CRM
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshFromWhatsApp}
            disabled={refreshing}
            className="gap-2"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Sincronizar WhatsApp
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-3.5 w-3.5" />
                Nova Memória
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Memórias</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.positive}</p>
              <p className="text-xs text-muted-foreground">Positivas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Activity className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.negative}</p>
              <p className="text-xs text-muted-foreground">Negativas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <MessageCircle className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totalMessages}</p>
              <p className="text-xs text-muted-foreground">Mensagens</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Two columns */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: Chat RAG */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Consulta Inteligente</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Pergunte sobre qualquer cliente — a IA busca no histórico do WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex-1 min-h-[300px] max-h-[500px] overflow-y-auto mb-3 space-y-2 p-3 rounded-lg bg-muted/30 border">
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs gap-2 py-12">
                    <Brain className="h-10 w-10 opacity-30" />
                    <p className="font-medium text-sm">Pergunte algo como:</p>
                    <p className="italic opacity-70">"Qual foi a última conversa com o João?"</p>
                    <p className="italic opacity-70">"Quais clientes demonstraram interesse?"</p>
                    <p className="italic opacity-70">"O que a Maria reclamou?"</p>
                    <div className="flex items-center gap-1 mt-3 text-[10px] opacity-50">
                      <Smartphone className="h-3 w-3" />
                      Dados baseados na atividade do WhatsApp CRM
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background border shadow-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.memoriesUsed !== undefined && msg.memoriesUsed > 0 && (
                        <p className="text-[10px] mt-1 opacity-60">
                          {msg.memoriesUsed} memória(s) consultada(s)
                        </p>
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

              <div className="flex gap-2">
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleQuery()}
                  placeholder="Pergunte sobre um cliente..."
                  disabled={querying}
                  className="text-sm"
                />
                <Button onClick={handleQuery} disabled={querying || !question.trim()} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Memory List */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Memórias Registradas</CardTitle>
                  <Badge variant="secondary" className="text-xs">{filteredMemories.length}</Badge>
                </div>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, assunto ou tópico..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-9 text-sm h-9"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredMemories.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground px-6">
                  <Brain className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium text-sm">Nenhuma memória encontrada</p>
                  <p className="text-xs mt-1">
                    {memories.length === 0
                      ? "Conecte o WhatsApp e clique em \"Sincronizar WhatsApp\" para capturar memórias automaticamente."
                      : "Nenhum resultado para o filtro atual."
                    }
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="divide-y divide-border/40">
                    {filteredMemories.map((mem) => (
                      <div key={mem.id} className="px-4 py-3 hover:bg-muted/20 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="font-medium text-sm truncate">{mem.client_name}</span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 shrink-0 ${sentimentColor(mem.sentiment)}`}
                              >
                                {sentimentIcon(mem.sentiment)} {mem.sentiment}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 ml-5.5">
                              {mem.summary}
                            </p>
                            {mem.topics?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5 ml-5.5">
                                {mem.topics.map((t, i) => (
                                  <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {t}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(mem.interaction_date).toLocaleDateString("pt-BR")}
                            </div>
                            {mem.raw_message_count > 0 && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <MessageCircle className="h-3 w-3" />
                                {mem.raw_message_count} msgs
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Source info */}
          <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
            <Smartphone className="h-3.5 w-3.5 shrink-0" />
            <span>
              As memórias são geradas automaticamente a partir das conversas capturadas na aba <strong>WhatsApp</strong>.
              Você também pode adicionar memórias manualmente.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
