import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Bot,
  Cpu,
  Power,
  PowerOff,
  RefreshCw,
  Shield,
  Zap,
  Settings2,
  User,
  Globe,
  Key,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
} from "lucide-react";

type EngineRow = {
  id: string;
  user_id: string;
  product_slug: string;
  is_active: boolean;
  webhook_token: string | null;
  created_at: string;
  profile_name: string | null;
  profile_email: string | null;
  ai_provider: string | null;
  ai_model: string | null;
  ai_active: boolean;
  system_prompt: string | null;
  temperature: number | null;
  max_tokens: number | null;
  ai_config_id: string | null;
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  google: "Google Gemini",
  starai: "StarAI",
};

const PROVIDER_MODELS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  google: ["models/gemini-2.5-flash", "models/gemini-2.5-pro", "models/gemini-2.0-flash"],
};

export function NovaLinkEnginesList() {
  const [engines, setEngines] = useState<EngineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchEngines = async () => {
    setLoading(true);
    try {
      const { data: products, error } = await supabase
        .from("customer_products")
        .select("id, user_id, product_slug, is_active, webhook_token, created_at")
        .eq("product_slug", "bots-automacao")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user names from admin-list-users edge function
      const userMap: Record<string, { name: string; email: string }> = {};
      try {
        const { data: usersData } = await supabase.functions.invoke("admin-list-users");
        if (usersData?.users) {
          for (const u of usersData.users) {
            userMap[u.id] = {
              name: u.user_metadata?.full_name || u.email || u.id,
              email: u.email || "",
            };
          }
        }
      } catch { /* fallback to profiles */ }

      const rows: EngineRow[] = [];

      for (const cp of products || []) {
        const userInfo = userMap[cp.user_id];
        let profileName = userInfo?.name || null;
        let profileEmail = userInfo?.email || null;

        // Fallback to profiles table
        if (!profileName) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", cp.user_id)
            .maybeSingle();
          profileName = profile?.full_name || null;
          profileEmail = profile?.email || null;
        }

        const { data: aiConfig } = await supabase
          .from("ai_control_config")
          .select("id, provider, model, is_active, system_prompt, temperature, max_tokens")
          .eq("customer_product_id", cp.id)
          .maybeSingle();

        rows.push({
          id: cp.id,
          user_id: cp.user_id,
          product_slug: cp.product_slug,
          is_active: cp.is_active,
          webhook_token: cp.webhook_token,
          created_at: cp.created_at,
          profile_name: profileName,
          profile_email: profileEmail,
          ai_provider: aiConfig?.provider || null,
          ai_model: aiConfig?.model || null,
          ai_active: aiConfig?.is_active ?? false,
          system_prompt: aiConfig?.system_prompt || null,
          temperature: aiConfig?.temperature ?? 0.7,
          max_tokens: aiConfig?.max_tokens ?? 512,
          ai_config_id: aiConfig?.id || null,
        });
      }

      setEngines(rows);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro", description: "Falha ao carregar motores.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEngines(); }, []);

  const toggleProductActive = async (engine: EngineRow) => {
    setSaving(engine.id);
    const { error } = await supabase
      .from("customer_products")
      .update({ is_active: !engine.is_active })
      .eq("id", engine.id);

    if (error) {
      toast({ title: "Erro", description: "Falha ao alterar status.", variant: "destructive" });
    } else {
      setEngines(prev => prev.map(e => e.id === engine.id ? { ...e, is_active: !e.is_active } : e));
      toast({ title: "Sucesso", description: `Motor ${!engine.is_active ? "ativado" : "desativado"}.` });
    }
    setSaving(null);
  };

  const toggleAIActive = async (engine: EngineRow) => {
    if (!engine.ai_config_id) return;
    setSaving(engine.id);
    const { error } = await supabase
      .from("ai_control_config")
      .update({ is_active: !engine.ai_active })
      .eq("id", engine.ai_config_id);

    if (error) {
      toast({ title: "Erro", description: "Falha ao alterar IA.", variant: "destructive" });
    } else {
      setEngines(prev => prev.map(e => e.id === engine.id ? { ...e, ai_active: !e.ai_active } : e));
      toast({ title: "Sucesso", description: `IA ${!engine.ai_active ? "ativada" : "desativada"}.` });
    }
    setSaving(null);
  };

  const updateAIConfig = async (engine: EngineRow, field: string, value: any) => {
    setEngines(prev => prev.map(e => e.id === engine.id ? { ...e, [field]: value } : e));
  };

  const saveAIConfig = async (engine: EngineRow) => {
    if (!engine.ai_config_id) {
      // Create config
      setSaving(engine.id);
      const { error } = await supabase.from("ai_control_config").insert({
        customer_product_id: engine.id,
        user_id: engine.user_id,
        provider: engine.ai_provider || "google",
        model: engine.ai_model || "models/gemini-2.5-flash",
        system_prompt: engine.system_prompt || "",
        temperature: engine.temperature ?? 0.7,
        max_tokens: engine.max_tokens ?? 512,
        is_active: true,
      });
      if (error) {
        toast({ title: "Erro", description: "Falha ao criar config IA.", variant: "destructive" });
      } else {
        toast({ title: "Sucesso", description: "Configuração de IA criada." });
        await fetchEngines();
      }
      setSaving(null);
      return;
    }

    setSaving(engine.id);
    const { error } = await supabase
      .from("ai_control_config")
      .update({
        provider: engine.ai_provider || "google",
        model: engine.ai_model || "models/gemini-2.5-flash",
        system_prompt: engine.system_prompt || "",
        temperature: engine.temperature ?? 0.7,
        max_tokens: engine.max_tokens ?? 512,
      })
      .eq("id", engine.ai_config_id);

    if (error) {
      toast({ title: "Erro", description: "Falha ao salvar config.", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Configuração salva." });
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{engines.length}</p>
              <p className="text-xs text-muted-foreground">Motores Totais</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{engines.filter(e => e.is_active).length}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{engines.filter(e => !e.is_active).length}</p>
              <p className="text-xs text-muted-foreground">Inativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Cpu className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{engines.filter(e => e.ai_active).length}</p>
              <p className="text-xs text-muted-foreground">IA Ativa</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Instâncias de Motores</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie cada motor individualmente — ative, desative e configure a IA de cada cliente.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchEngines} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {engines.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bot className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p>Nenhum motor provisionado ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {engines.map((engine) => {
            const isExpanded = expandedId === engine.id;
            return (
              <Card key={engine.id} className="overflow-hidden">
                {/* Collapsed header row */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : engine.id)}
                >
                  {/* Status indicator */}
                  <div className={`h-3 w-3 rounded-full shrink-0 ${engine.is_active ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]" : "bg-red-500"}`} />

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">
                        {engine.profile_name || engine.profile_email || engine.user_id.slice(0, 8)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">{engine.id.slice(0, 12)}…</p>
                  </div>

                  {/* Badges */}
                  <div className="hidden md:flex items-center gap-2">
                    <Badge variant={engine.is_active ? "default" : "secondary"} className="text-xs">
                      {engine.is_active ? <Power className="h-3 w-3 mr-1" /> : <PowerOff className="h-3 w-3 mr-1" />}
                      {engine.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    {engine.ai_provider && (
                      <Badge variant="outline" className="text-xs">
                        <Cpu className="h-3 w-3 mr-1" />
                        {PROVIDER_LABELS[engine.ai_provider] || engine.ai_provider}
                      </Badge>
                    )}
                    {engine.ai_active && (
                      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                        <Activity className="h-3 w-3 mr-1" />
                        IA On
                      </Badge>
                    )}
                  </div>

                  {/* Expand toggle */}
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border-t bg-muted/10 p-5 space-y-6">
                    {/* Row 1: Toggles */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Power className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium text-sm">Motor Principal</p>
                            <p className="text-xs text-muted-foreground">Ativa/desativa todo o motor deste cliente</p>
                          </div>
                        </div>
                        <Switch
                          checked={engine.is_active}
                          onCheckedChange={() => toggleProductActive(engine)}
                          disabled={saving === engine.id}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Zap className="h-5 w-5 text-amber-500" />
                          <div>
                            <p className="font-medium text-sm">Motor IA</p>
                            <p className="text-xs text-muted-foreground">Ativa/desativa processamento de IA</p>
                          </div>
                        </div>
                        <Switch
                          checked={engine.ai_active}
                          onCheckedChange={() => toggleAIActive(engine)}
                          disabled={saving === engine.id || !engine.ai_config_id}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Row 2: AI Config */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Settings2 className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-medium text-sm">Configuração de IA</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Provedor</Label>
                          <Select
                            value={engine.ai_provider || "google"}
                            onValueChange={(v) => updateAIConfig(engine, "ai_provider", v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="google">Google Gemini</SelectItem>
                              <SelectItem value="openai">OpenAI</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Modelo</Label>
                          <Select
                            value={engine.ai_model || ""}
                            onValueChange={(v) => updateAIConfig(engine, "ai_model", v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {(PROVIDER_MODELS[engine.ai_provider || "google"] || []).map((m) => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs">Temperatura</Label>
                            <Input
                              type="number"
                              step={0.1}
                              min={0}
                              max={2}
                              value={engine.temperature ?? 0.7}
                              onChange={(e) => updateAIConfig(engine, "temperature", parseFloat(e.target.value))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Max Tokens</Label>
                            <Input
                              type="number"
                              step={64}
                              min={64}
                              max={8192}
                              value={engine.max_tokens ?? 512}
                              onChange={(e) => updateAIConfig(engine, "max_tokens", parseInt(e.target.value))}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <Label className="text-xs">System Prompt</Label>
                        <Textarea
                          rows={4}
                          value={engine.system_prompt || ""}
                          onChange={(e) => updateAIConfig(engine, "system_prompt", e.target.value)}
                          placeholder="Instrução de sistema para o agente IA..."
                          className="font-mono text-xs"
                        />
                      </div>

                      <div className="flex justify-end mt-4">
                        <Button
                          size="sm"
                          onClick={() => saveAIConfig(engine)}
                          disabled={saving === engine.id}
                        >
                          {saving === engine.id ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Salvar Configuração
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    {/* Row 3: Meta */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Criado em: {new Date(engine.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Key className="h-3.5 w-3.5" />
                        <span>Webhook: {engine.webhook_token ? "Configurado ✓" : "Não configurado"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5" />
                        <span>ID: {engine.id}</span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
