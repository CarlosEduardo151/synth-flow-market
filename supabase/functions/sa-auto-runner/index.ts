// Cron runner: dispara anti-churn scan + winback scan, e (se habilitado) envia
// automaticamente as mensagens de winback acima do threshold de probabilidade.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: products } = await supabase
      .from("customer_products")
      .select("id")
      .eq("product_slug", "crm-simples")
      .eq("is_active", true);

    const ids: string[] = (products || []).map((p: any) => p.id);
    if (ids.length === 0) {
      return new Response(JSON.stringify({ ok: true, scanned: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: configs } = await supabase
      .from("sa_automation_config")
      .select("*")
      .in("customer_product_id", ids);

    const cfgMap = new Map<string, any>(
      (configs || []).map((c: any) => [c.customer_product_id, c]),
    );

    const summary: any[] = [];

    for (const id of ids) {
      const cfg = cfgMap.get(id) || {
        antichurn_auto_send: false,
        winback_auto_send: false,
        winback_min_probability: 60,
      };

      // 1) Sempre faz scan (gera alertas/campanhas)
      try {
        const r1 = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/sa-antichurn-scan`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ customerProductId: id }),
          },
        );
        await r1.text();
      } catch (e) {
        console.error("antichurn-scan failed", id, e);
      }

      try {
        const r2 = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/sa-winback-scan`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ customerProductId: id }),
          },
        );
        await r2.text();
      } catch (e) {
        console.error("winback-scan failed", id, e);
      }

      // 2) Se winback_auto_send = true, envia campanhas pending acima do threshold
      let autoSent = 0;
      if (cfg.winback_auto_send) {
        const { data: pending } = await supabase
          .from("sa_winback_campaigns")
          .select("id,success_probability,lead_phone,suggested_message")
          .eq("customer_product_id", id)
          .eq("status", "pending")
          .gte("success_probability", cfg.winback_min_probability || 60)
          .limit(10);

        for (const c of pending || []) {
          // Marca como sent (envio real depende da integração WhatsApp configurada)
          await supabase
            .from("sa_winback_campaigns")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              ai_analysis: {
                auto_sent: true,
                triggered_by: "cron",
                at: new Date().toISOString(),
              },
            })
            .eq("id", c.id);
          autoSent++;
        }
      }

      // 3) Se antichurn_auto_send = true, marca alertas críticos como acted (registra interação)
      let autoActed = 0;
      if (cfg.antichurn_auto_send) {
        const { data: critical } = await supabase
          .from("sa_antichurn_alerts")
          .select("id,crm_customer_id,suggested_action,churn_probability")
          .eq("customer_product_id", id)
          .in("status", ["active", "open"])
          .gte("churn_probability", 80)
          .limit(20);

        for (const a of critical || []) {
          await supabase
            .from("sa_antichurn_alerts")
            .update({ status: "acted" })
            .eq("id", a.id);

          if (a.crm_customer_id) {
            await supabase.from("crm_interactions").insert({
              customer_product_id: id,
              customer_id: a.crm_customer_id,
              type: "churn_action",
              subject: "Anti-Churn automático",
              description:
                a.suggested_action ||
                `Ação automática anti-churn (${a.churn_probability}% risco)`,
            });
          }
          autoActed++;
        }
      }

      summary.push({ customer_product_id: id, autoSent, autoActed });
    }

    return new Response(
      JSON.stringify({ ok: true, processed: summary.length, summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("sa-auto-runner error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
