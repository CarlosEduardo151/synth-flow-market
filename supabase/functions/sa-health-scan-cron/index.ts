// Cron runner: dispara sa-health-scan para todos os customer_products ativos do CRM
// que tenham automation habilitada (default: true).
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
      .select("customer_product_id,health_scan_enabled")
      .in("customer_product_id", ids);

    const disabled = new Set(
      (configs || [])
        .filter((c: any) => c.health_scan_enabled === false)
        .map((c: any) => c.customer_product_id),
    );

    const targets = ids.filter((id) => !disabled.has(id));
    let success = 0;
    let failed = 0;

    for (const id of targets) {
      try {
        const r = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/sa-health-scan`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ customerProductId: id }),
          },
        );
        await r.text();
        if (r.ok) success++;
        else failed++;
      } catch (e) {
        console.error("health-scan failed", id, e);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, scanned: targets.length, success, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("sa-health-scan-cron error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
