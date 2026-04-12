import { useState } from "react";
import SystemSidebarLayout from "@/components/layout/SystemSidebarLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Camera, Users, Megaphone, Settings, TrendingUp, Brain,
  Upload, Sparkles, Target, BarChart3, MessageSquare, Eye
} from "lucide-react";

// ============ Dashboard Tab ============
function DashboardTab({ customerProductId }: { customerProductId: string }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["micro-biz-stats", customerProductId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("micro-biz-campaign", {
        body: { action: "stats", customer_product_id: customerProductId },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!customerProductId,
  });

  if (isLoading) return <div className="text-center p-8 text-muted-foreground">Carregando...</div>;

  const s = stats?.stats || { totalLeads: 0, hotLeads: 0, converted: 0 };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Leads Capturados", value: s.totalLeads, icon: Users, color: "text-blue-400" },
          { label: "Leads Quentes (7+)", value: s.hotLeads, icon: TrendingUp, color: "text-orange-400" },
          { label: "Convertidos", value: s.converted, icon: Target, color: "text-green-400" },
          { label: "Campanhas", value: stats?.campaigns?.length || 0, icon: Megaphone, color: "text-purple-400" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <item.icon className={`h-8 w-8 ${item.color}`} />
              <div>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Megaphone className="h-5 w-5" /> Campanhas Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!stats?.campaigns?.length ? (
            <p className="text-muted-foreground text-sm">Nenhuma campanha criada ainda.</p>
          ) : (
            <div className="space-y-2">
              {stats.campaigns.slice(0, 5).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{c.platform}</p>
                    <p className="text-xs text-muted-foreground">R$ {((c.budget_cents || 0) / 100).toFixed(2)} · {c.duration_days} dias</p>
                  </div>
                  <Badge variant={c.status === "draft" ? "secondary" : c.status === "active" ? "default" : "outline"}>
                    {c.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============ Vision/Products Tab ============
function VisionTab({ customerProductId }: { customerProductId: string }) {
  const [imageUrl, setImageUrl] = useState("");
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["micro-biz-products", customerProductId],
    queryFn: async () => {
      const { data } = await supabase
        .from("micro_biz_products" as any)
        .select("*")
        .eq("customer_product_id", customerProductId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!customerProductId,
  });

  const analyzeImage = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("micro-biz-vision", {
        body: { customer_product_id: customerProductId, image_url: imageUrl },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Produto analisado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["micro-biz-products"] });
      setImageUrl("");
    },
    onError: (e) => toast.error("Erro: " + (e as Error).message),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" /> Analisar Produto (Vision IA)
          </CardTitle>
          <CardDescription>
            Cole a URL de uma foto do produto para análise automática + geração de criativo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://exemplo.com/foto-produto.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <Button
              onClick={() => analyzeImage.mutate()}
              disabled={!imageUrl || analyzeImage.isPending}
            >
              {analyzeImage.isPending ? "Analisando..." : "Analisar"}
              <Sparkles className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {analyzeImage.data && (
            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-3">
                <h4 className="font-semibold flex items-center gap-2"><Eye className="h-4 w-4" /> Resultado da Análise</h4>
                <pre className="text-xs overflow-auto max-h-60 bg-background p-3 rounded">
                  {JSON.stringify(analyzeImage.data.vision_analysis, null, 2)}
                </pre>
                <h4 className="font-semibold">Copy Options:</h4>
                <div className="grid gap-2">
                  {(analyzeImage.data.creative?.copies || []).map((copy: any, i: number) => (
                    <div key={i} className="p-3 rounded bg-background border">
                      <p className="font-medium text-sm">{copy.headline}</p>
                      <p className="text-xs text-muted-foreground">{copy.body}</p>
                      <Badge className="mt-1" variant="outline">{copy.cta}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Produtos Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : !(products as any[])?.length ? (
            <p className="text-muted-foreground text-sm">Nenhum produto ainda. Analise uma foto acima para começar.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(products as any[]).map((p: any) => (
                <div key={p.id} className="p-3 rounded-lg border flex gap-3">
                  {p.photo_url && <img src={p.photo_url} alt={p.name} className="w-16 h-16 rounded object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{p.category || "Sem categoria"}</Badge>
                      {p.price && <span className="text-xs font-medium">R$ {Number(p.price).toFixed(2)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============ CRM Tab ============
function CRMTab({ customerProductId }: { customerProductId: string }) {
  const { data: leads, isLoading } = useQuery({
    queryKey: ["micro-biz-leads", customerProductId],
    queryFn: async () => {
      const { data } = await supabase
        .from("micro_biz_leads" as any)
        .select("*")
        .eq("customer_product_id", customerProductId)
        .order("last_contact_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!customerProductId,
  });

  const getIntentColor = (score: number) => {
    if (score >= 8) return "text-green-400";
    if (score >= 5) return "text-yellow-400";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> CRM Invisível — Leads Automáticos
          </CardTitle>
          <CardDescription>Leads extraídos automaticamente de conversas WhatsApp via IA.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : !leads?.length ? (
            <p className="text-muted-foreground text-sm">Nenhum lead capturado ainda. Conecte seu WhatsApp para começar.</p>
          ) : (
            <div className="space-y-2">
              {leads.map((lead: any) => (
                <div key={lead.id} className="p-4 rounded-lg border flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{lead.name || "Sem nome"}</p>
                      <Badge variant="outline" className="text-xs">{lead.source}</Badge>
                      {lead.sentiment && (
                        <Badge variant={lead.sentiment === "positivo" ? "default" : "secondary"} className="text-xs">
                          {lead.sentiment}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{lead.phone}</p>
                    {lead.interest && <p className="text-xs mt-1">📌 {lead.interest}</p>}
                    {lead.next_step && <p className="text-xs text-muted-foreground">→ {lead.next_step}</p>}
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {(lead.tags || []).map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-2xl font-bold ${getIntentColor(lead.purchase_intent_score || 0)}`}>
                      {lead.purchase_intent_score || 0}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Intenção</p>
                    <p className="text-xs text-muted-foreground mt-1">{lead.total_interactions || 1}x</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============ AI Config Tab ============
function AIConfigTab({ customerProductId }: { customerProductId: string }) {
  const queryClient = useQueryClient();

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

  const [form, setForm] = useState<any>(null);

  const loaded = form || config || {};

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

  const update = (key: string, value: any) => setForm({ ...loaded, [key]: value });

  if (isLoading) return <div className="text-center p-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5" /> Motor de IA</CardTitle>
          <CardDescription>Configure os modelos e comportamento da IA para seu negócio.</CardDescription>
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
            <Textarea
              rows={4}
              value={loaded.system_prompt || ""}
              onChange={(e) => update("system_prompt", e.target.value)}
              placeholder="Instrução principal da IA..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Temperatura ({loaded.temperature || 0.7})</Label>
              <Input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={loaded.temperature || 0.7}
                onChange={(e) => update("temperature", parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Tokens</Label>
              <Input
                type="number"
                value={loaded.max_tokens || 1024}
                onChange={(e) => update("max_tokens", parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Orçamento Padrão (centavos)</Label>
              <Input
                type="number"
                value={loaded.default_budget_cents || 1000}
                onChange={(e) => update("default_budget_cents", parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={loaded.auto_publish_ads || false}
              onCheckedChange={(v) => update("auto_publish_ads", v)}
            />
            <Label>Publicar anúncios automaticamente (sem aprovação manual)</Label>
          </div>

          <Button onClick={() => saveConfig.mutate()} disabled={saveConfig.isPending}>
            {saveConfig.isPending ? "Salvando..." : "Salvar Configuração"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ Main Page ============
export default function MicroBusinessSystem() {
  const { user } = useAuth();

  const { data: customerProduct } = useQuery({
    queryKey: ["micro-biz-cp", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("customer_products")
        .select("id")
        .eq("user_id", user!.id)
        .eq("product_slug", "micro-business-suite")
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const cpId = customerProduct?.id || "";

  return (
    <SystemSidebarLayout
      productSlug="micro-business-suite"
      pageTitle="Micro-Business Suite"
    >
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            NovaLink Micro-Business Suite
          </h1>
          <p className="text-muted-foreground text-sm">
            Automação de vendas, CRM invisível e marketing "One-Click" para micro-empresas.
          </p>
        </div>

        {!cpId ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Você precisa ter o produto ativo para acessar este sistema.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="dashboard" className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full max-w-lg">
              <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-1" /> Painel</TabsTrigger>
              <TabsTrigger value="vision"><Camera className="h-4 w-4 mr-1" /> Vision</TabsTrigger>
              <TabsTrigger value="crm"><Users className="h-4 w-4 mr-1" /> CRM</TabsTrigger>
              <TabsTrigger value="config"><Settings className="h-4 w-4 mr-1" /> Config</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard"><DashboardTab customerProductId={cpId} /></TabsContent>
            <TabsContent value="vision"><VisionTab customerProductId={cpId} /></TabsContent>
            <TabsContent value="crm"><CRMTab customerProductId={cpId} /></TabsContent>
            <TabsContent value="config"><AIConfigTab customerProductId={cpId} /></TabsContent>
          </Tabs>
        )}
      </div>
    </SystemSidebarLayout>
  );
}
