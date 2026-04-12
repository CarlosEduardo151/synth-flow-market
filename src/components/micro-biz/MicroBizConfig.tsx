import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Brain, Settings, Fuel, Send, Bot, Zap,
  ShieldCheck, Smile, Swords, Wrench, MessageCircle
} from "lucide-react";

interface Props {
  customerProductId: string;
}

const PERSONALITIES = [
  { value: "vendas", label: "Agressivo de Vendas", icon: Swords, desc: "Foco em conversão e urgência" },
  { value: "tecnico", label: "Técnico / Mecânico", icon: Wrench, desc: "Explicações detalhadas e precisas" },
  { value: "amigavel", label: "Amigável / Social", icon: Smile, desc: "Conversa leve e empática" },
];

const TOKEN_BUDGET = 40_000_000;

export function MicroBizConfig({ customerProductId }: Props) {
  const queryClient = useQueryClient();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: config, isLoading } = useQuery({
    queryKey: ["micro-biz-ai-config", customerProductId],
    queryFn: async () => {
      const { data } = await supabase
        .from("micro_biz_ai_config" as any)
        .select("*")
        .eq("customer_product_id", customerProductId)
        .maybeSingle();
      return data as any;
    },
    enabled: !!customerProductId,
  });

  // Token usage query
  const { data: usage } = useQuery({
    queryKey: ["micro-biz-token-usage", customerProductId],
    queryFn: async () => {
      const { data } = await supabase
        .from("bot_usage_metrics" as any)
        .select("tokens_total")
        .eq("customer_product_id", customerProductId);
      const total = (data || []).reduce((acc: number, r: any) => acc + (r.tokens_total || 0), 0);
      return total;
    },
    enabled: !!customerProductId,
  });

  const [form, setForm] = useState<any>(null);
  const loaded = form || config || {};
  const update = (key: string, value: any) => setForm({ ...loaded, [key]: value });

  // Playground chat
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const saveConfig = useMutation({
    mutationFn: async () => {
      const payload = { ...loaded, customer_product_id: customerProductId };
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      if (config?.id) {
        await supabase.from("micro_biz_ai_config" as any).update(payload).eq("id", config.id);
      } else {
        await supabase.from("micro_biz_ai_config" as any).insert(payload);
      }
    },
    onSuccess: () => {
      toast.success("Configuração salva!");
      queryClient.invalidateQueries({ queryKey: ["micro-biz-ai-config"] });
    },
    onError: (e) => toast.error("Erro: " + (e as Error).message),
  });

  const sendTestMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("micro-biz-crm-extract", {
        body: {
          customer_product_id: customerProductId,
          message: userMsg,
          test_mode: true,
        },
      });
      const reply = data?.ai_response || data?.reply || "Sem resposta da IA.";
      setChatMessages((prev) => [...prev, { role: "assistant", content: typeof reply === "string" ? reply : JSON.stringify(reply) }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Erro ao processar. Verifique a configuração." }]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  if (isLoading) return <div className="text-center p-8 text-muted-foreground">Carregando...</div>;

  const tokensUsed = usage || 0;
  const tokenPct = Math.min((tokensUsed / TOKEN_BUDGET) * 100, 100);
  const tokensRemaining = Math.max(TOKEN_BUDGET - tokensUsed, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Config + Personality */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personality Selector */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4" /> Personalidade da IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PERSONALITIES.map((p) => {
                  const active = loaded.personality === p.value;
                  return (
                    <button
                      key={p.value}
                      onClick={() => update("personality", p.value)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        active
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "border-muted hover:border-primary/40"
                      }`}
                    >
                      <p.icon className={`h-6 w-6 mb-2 ${active ? "text-primary" : "text-muted-foreground"}`} />
                      <p className="font-medium text-sm">{p.label}</p>
                      <p className="text-[11px] text-muted-foreground">{p.desc}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Engine Config */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4" /> Motor de IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Negócio</Label>
                  <Input value={loaded.business_name || ""} onChange={(e) => update("business_name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Negócio</Label>
                  <Select value={loaded.business_type || ""} onValueChange={(v) => update("business_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {["oficina", "mercado", "loja_roupas", "restaurante", "salao_beleza", "prestador_servico", "outro"].map((t) => (
                        <SelectItem key={t} value={t}>{t.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Modelo de Chat (CRM)</Label>
                  <Select value={loaded.chat_model || "llama-3.3-70b-versatile"} onValueChange={(v) => update("chat_model", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="llama-3.3-70b-versatile">Nova Neural 70B v3.3</SelectItem>
                      <SelectItem value="llama-4-scout">Nova Nexus Flow v4.0</SelectItem>
                      <SelectItem value="qwen-3-32b">Nova Logic Q v3.0</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Modelo de Vision</Label>
                  <Select value={loaded.vision_model || "llama-4-scout"} onValueChange={(v) => update("vision_model", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="llama-4-scout">Nova Vision Optic v4.0</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Prompt do Sistema</Label>
                <Textarea rows={3} value={loaded.system_prompt || ""} onChange={(e) => update("system_prompt", e.target.value)} placeholder="Instrução principal da IA..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Temperatura ({loaded.temperature || 0.7})</Label>
                  <Input type="range" min="0" max="1" step="0.1" value={loaded.temperature || 0.7} onChange={(e) => update("temperature", parseFloat(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Max Tokens</Label>
                  <Input type="number" value={loaded.max_tokens || 1024} onChange={(e) => update("max_tokens", parseInt(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Orçamento Padrão (centavos)</Label>
                  <Input type="number" value={loaded.default_budget_cents || 1000} onChange={(e) => update("default_budget_cents", parseInt(e.target.value))} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={loaded.auto_publish_ads || false} onCheckedChange={(v) => update("auto_publish_ads", v)} />
                <Label>Publicar anúncios automaticamente</Label>
              </div>

              <Button onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending}>
                {saveConfig.isPending ? "Salvando..." : "Salvar Configuração"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Wallet + Playground */}
        <div className="space-y-6">
          {/* Wallet */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Fuel className="h-4 w-4 text-yellow-400" /> Combustível de IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center">
                <p className="text-3xl font-bold tabular-nums">
                  {(tokensRemaining / 1_000_000).toFixed(1)}M
                </p>
                <p className="text-xs text-muted-foreground">tokens restantes de 40M</p>
              </div>
              <Progress value={tokenPct} className="h-2" />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Usado: {(tokensUsed / 1_000_000).toFixed(2)}M</span>
                <span>{tokenPct.toFixed(1)}%</span>
              </div>
              {tokenPct > 80 && (
                <Badge variant="destructive" className="w-full justify-center text-xs">
                  ⚠️ Saldo baixo — considere upgrade
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Prompt Playground */}
          <Card className="flex flex-col" style={{ minHeight: 350 }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-4 w-4" /> Playground
              </CardTitle>
              <CardDescription className="text-[11px]">Teste como a IA responde antes de colocar no ar.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto space-y-2 mb-3 max-h-64 min-h-[120px] pr-1" style={{ scrollbarWidth: "thin" }}>
                {chatMessages.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center mt-8">Envie uma mensagem de teste...</p>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground animate-pulse">
                      Pensando...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Simule uma mensagem..."
                  className="text-xs"
                  onKeyDown={(e) => e.key === "Enter" && sendTestMessage()}
                />
                <Button size="icon" className="shrink-0 h-9 w-9" onClick={sendTestMessage} disabled={chatLoading}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
