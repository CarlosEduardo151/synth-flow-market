import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Settings, Save, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface AIConfig {
  id: string;
  user_id: string;
  provider: string | null;
  model: string | null;
  temperature: number | null;
  max_tokens: number | null;
  created_at: string | null;
  updated_at: string | null;
}

const MODELS = [
  { value: "gpt-4o", label: "GPT-4o (Mais capaz)" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini (Rápido)" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
];

export function CRMAIConfig() {
  const { user } = useAuth();
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchConfig();
    }
  }, [user?.id]);

  const fetchConfig = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("crm_ai_config")
        .select("*")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data) {
        setConfig(data);
      } else {
        // Create default config
        const { data: newConfig, error: insertError } = await supabase
          .from("crm_ai_config")
          .insert({
            user_id: user.id,
            provider: "openai",
            model: "gpt-4o-mini",
            temperature: 0.7,
            max_tokens: 2000,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setConfig(newConfig);
      }
    } catch (error) {
      console.error("Error fetching AI config:", error);
      toast.error("Erro ao carregar configuração da IA");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("crm_ai_config")
        .update({
          provider: config.provider,
          model: config.model,
          temperature: config.temperature,
          max_tokens: config.max_tokens,
        })
        .eq("id", config.id);

      if (error) throw error;
      toast.success("Configuração salva com sucesso!");
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setSaving(false);
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

  if (!config) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuração da IA do CRM
        </CardTitle>
        <CardDescription>
          Configure o modelo de IA para análises do CRM
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Provedor</Label>
            <Select
              value={config.provider || "openai"}
              onValueChange={(value) => setConfig({ ...config, provider: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="gemini">Google Gemini</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Modelo</Label>
            <Select
              value={config.model || "gpt-4o-mini"}
              onValueChange={(value) => setConfig({ ...config, model: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Temperatura: {(config.temperature || 0.7).toFixed(1)}</Label>
            </div>
            <Slider
              value={[config.temperature || 0.7]}
              onValueChange={([value]) => setConfig({ ...config, temperature: value })}
              min={0}
              max={1}
              step={0.1}
            />
          </div>

          <div className="space-y-2">
            <Label>Tokens Máximos: {config.max_tokens || 2000}</Label>
            <Slider
              value={[config.max_tokens || 2000]}
              onValueChange={([value]) => setConfig({ ...config, max_tokens: value })}
              min={500}
              max={4000}
              step={100}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Configuração
        </Button>
      </CardContent>
    </Card>
  );
}
