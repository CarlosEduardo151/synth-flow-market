import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Bot, Activity, AlertTriangle, HeartCrack } from "lucide-react";

interface Props {
  customerProductId: string;
}

export function CRMAutomationConfig({ customerProductId }: Props) {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({
    health_scan_enabled: true,
    antichurn_auto_send: false,
    winback_auto_send: false,
    winback_min_probability: 60,
  });

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("sa_automation_config")
        .select("*")
        .eq("customer_product_id", customerProductId)
        .maybeSingle();
      if (data) {
        setConfig({
          health_scan_enabled: data.health_scan_enabled,
          antichurn_auto_send: data.antichurn_auto_send,
          winback_auto_send: data.winback_auto_send,
          winback_min_probability: data.winback_min_probability,
        });
      }
      setLoading(false);
    })();
  }, [customerProductId]);

  const save = async (next: typeof config) => {
    setConfig(next);
    const { error } = await (supabase as any)
      .from("sa_automation_config")
      .upsert(
        { customer_product_id: customerProductId, ...next },
        { onConflict: "customer_product_id" },
      );
    if (error) toast.error("Erro ao salvar");
    else toast.success("Configuração atualizada");
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="w-4 h-4" /> Automação Inteligente
        </CardTitle>
        <CardDescription className="text-xs">
          Habilite execução automática dos motores de IA via cron.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between p-3 border rounded-md">
          <div className="flex items-start gap-3">
            <Activity className="w-4 h-4 text-emerald-500 mt-0.5" />
            <div>
              <Label className="text-sm">Health Score recorrente</Label>
              <p className="text-xs text-muted-foreground">
                Recalcula scores a cada 6 horas automaticamente.
              </p>
            </div>
          </div>
          <Switch
            checked={config.health_scan_enabled}
            onCheckedChange={(v) => save({ ...config, health_scan_enabled: v })}
          />
        </div>

        <div className="flex items-center justify-between p-3 border rounded-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />
            <div>
              <Label className="text-sm">Anti-Churn automático</Label>
              <p className="text-xs text-muted-foreground">
                Marca alertas críticos (≥80% risco) como executados a cada 12h.
              </p>
            </div>
          </div>
          <Switch
            checked={config.antichurn_auto_send}
            onCheckedChange={(v) => save({ ...config, antichurn_auto_send: v })}
          />
        </div>

        <div className="p-3 border rounded-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <HeartCrack className="w-4 h-4 text-pink-500 mt-0.5" />
              <div>
                <Label className="text-sm">Win-back automático</Label>
                <p className="text-xs text-muted-foreground">
                  Envia campanhas com probabilidade ≥ {config.winback_min_probability}% a cada 12h.
                </p>
              </div>
            </div>
            <Switch
              checked={config.winback_auto_send}
              onCheckedChange={(v) => save({ ...config, winback_auto_send: v })}
            />
          </div>
          {config.winback_auto_send && (
            <div className="pl-7 space-y-2">
              <Label className="text-xs">Probabilidade mínima ({config.winback_min_probability}%)</Label>
              <Slider
                min={30}
                max={95}
                step={5}
                value={[config.winback_min_probability]}
                onValueChange={([v]) => setConfig((c) => ({ ...c, winback_min_probability: v }))}
                onValueCommit={([v]) => save({ ...config, winback_min_probability: v })}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
