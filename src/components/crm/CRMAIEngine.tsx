import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Cpu, Save, Loader2, Power, PowerOff, Eye, EyeOff } from "lucide-react";

interface CRMAIEngineProps {
  customerProductId: string;
}

const NOVALINK_MODELS = [
  { value: "gpt-oss-120b", label: "Nova Kernel Ultra v1.0", category: "Core Intelligence" },
  { value: "gpt-oss-20b", label: "Nova Kernel Prime v1.2", category: "Core Intelligence" },
  { value: "llama-4-scout", label: "Nova Nexus Flow v4.0", category: "Core Intelligence" },
  { value: "llama-3.3-70b", label: "Nova Neural 70B v3.3", category: "Core Intelligence" },
  { value: "qwen-3-32b", label: "Nova Logic Q v3.0", category: "Core Intelligence" },
  { value: "compound-beta", label: "Nova Compound Beta", category: "Ferramentas (Precisão)" },
  { value: "compound-beta-mini", label: "Nova Compound Mini", category: "Ferramentas (Precisão)" },
];

export function CRMAIEngine({ customerProductId }: CRMAIEngineProps) {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  // Local state
  const [isActive, setIsActive] = useState(true);
  const [model, setModel] = useState("llama-3.3-70b-versatile");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [personality, setPersonality] = useState("");

  useEffect(() => {
    fetchConfig();
  }, [customerProductId]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_control_config")
        .select("*")
        .eq("customer_product_id", customerProductId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setConfig(data);
        setIsActive(data.is_active ?? true);
        setModel(data.model || "llama-3.3-70b-versatile");
        setTemperature(data.temperature ?? 0.7);
        setMaxTokens(data.max_tokens ?? 1024);
        setSystemPrompt(data.system_prompt || "");
        setPersonality(data.personality || "");
      } else {
        // Create default config
        const { data: user } = await supabase.auth.getUser();
        if (!user?.user?.id) return;

        const defaultPrompt = `Você é um assistente de CRM inteligente. Analise dados de clientes, identifique padrões, sugira ações de follow-up e ajude a equipe comercial a vender mais.

Responda sempre em português brasileiro, de forma profissional e direta.`;

        const { data: newConfig, error: insertError } = await supabase
          .from("ai_control_config")
          .insert({
            user_id: user.user.id,
            customer_product_id: customerProductId,
            provider: "novalink",
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 1024,
            system_prompt: defaultPrompt,
            personality: "profissional",
            is_active: true,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setConfig(newConfig);
        setSystemPrompt(defaultPrompt);
        setPersonality("profissional");
      }
    } catch (error) {
      console.error("Error fetching CRM AI config:", error);
      toast.error("Erro ao carregar configuração do Motor IA");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config?.id) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("ai_control_config")
        .update({
          provider: "novalink",
          model,
          temperature,
          max_tokens: maxTokens,
          system_prompt: systemPrompt,
          personality,
          is_active: isActive,
        })
        .eq("id", config.id);

      if (error) throw error;
      toast.success("Motor IA do CRM salvo com sucesso!");
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  };

  const toggleEngine = async () => {
    const next = !isActive;
    setIsActive(next);
    if (config?.id) {
      await supabase
        .from("ai_control_config")
        .update({ is_active: next })
        .eq("id", config.id);
      toast.success(next ? "Motor IA ativado!" : "Motor IA desligado!");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Cpu className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Motor IA do CRM</CardTitle>
                <CardDescription>Motor exclusivo GROQ/NovaLink para análises inteligentes</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-green-500" : ""}>
                {isActive ? "Ativo" : "Desligado"}
              </Badge>
              <Button variant="outline" size="sm" onClick={toggleEngine}>
                {isActive ? <PowerOff className="h-4 w-4 mr-1" /> : <Power className="h-4 w-4 mr-1" />}
                {isActive ? "Desligar" : "Ligar"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Model Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modelo de IA</CardTitle>
          <CardDescription>Selecione o modelo NovaLink para as análises do CRM</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Modelo</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOVALINK_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    <div className="flex items-center gap-2">
                      <span>{m.label}</span>
                      <span className="text-xs text-muted-foreground">({m.category})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Temperatura: {temperature.toFixed(1)}</Label>
              </div>
              <Slider
                value={[temperature]}
                onValueChange={([v]) => setTemperature(v)}
                min={0}
                max={1}
                step={0.1}
              />
              <p className="text-xs text-muted-foreground">Menor = mais preciso, Maior = mais criativo</p>
            </div>

            <div className="space-y-2">
              <Label>Tokens Máximos: {maxTokens}</Label>
              <Slider
                value={[maxTokens]}
                onValueChange={([v]) => setMaxTokens(v)}
                min={256}
                max={4096}
                step={128}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Personalidade</Label>
            <Select value={personality} onValueChange={setPersonality}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profissional">Profissional</SelectItem>
                <SelectItem value="amigavel">Amigável</SelectItem>
                <SelectItem value="tecnico">Técnico</SelectItem>
                <SelectItem value="consultivo">Consultivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Prompt do Sistema</CardTitle>
              <CardDescription>Instruções que definem como o motor IA analisa seus dados</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowPrompt(!showPrompt)}>
              {showPrompt ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showPrompt ? "Ocultar" : "Ver prompt"}
            </Button>
          </div>
        </CardHeader>
        {showPrompt && (
          <CardContent>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={8}
              placeholder="Instruções para o motor IA..."
              className="font-mono text-sm"
            />
          </CardContent>
        )}
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        Salvar Configuração do Motor
      </Button>
    </div>
  );
}
