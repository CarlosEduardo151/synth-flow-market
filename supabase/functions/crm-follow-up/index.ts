import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { evolutionSendText, type EvolutionCredentials } from "../_shared/zapi.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Resolve the WhatsApp (Evolution) instance to use for a given CRM customer_product_id.
 * Strategy:
 *   1. Active instance directly tied to this customer_product_id
 *   2. Any active instance owned by the same user with a "_CRM" suffix
 *   3. Any active instance owned by the same user (fallback)
 */
async function resolveCrmInstance(
  supabase: any,
  customerProductId: string,
): Promise<EvolutionCredentials | null> {
  // 1. Direct match
  const { data: direct } = await supabase
    .from("evolution_instances")
    .select("instance_name, evolution_url, evolution_apikey")
    .eq("customer_product_id", customerProductId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (direct?.instance_name) {
    return {
      instanceName: direct.instance_name,
      apiUrl: (direct.evolution_url || "").replace(/\/$/, ""),
      apiKey: direct.evolution_apikey || "",
    };
  }

  // Find user_id of this customer_product
  const { data: cp } = await supabase
    .from("customer_products")
    .select("user_id")
    .eq("id", customerProductId)
    .maybeSingle();

  if (!cp?.user_id) return null;

  // 2. _CRM-suffixed instance for this user
  const { data: crmInst } = await supabase
    .from("evolution_instances")
    .select("instance_name, evolution_url, evolution_apikey")
    .eq("user_id", cp.user_id)
    .eq("is_active", true)
    .ilike("instance_name", "%_CRM")
    .limit(1)
    .maybeSingle();

  if (crmInst?.instance_name) {
    return {
      instanceName: crmInst.instance_name,
      apiUrl: (crmInst.evolution_url || "").replace(/\/$/, ""),
      apiKey: crmInst.evolution_apikey || "",
    };
  }

  // 3. Any active instance for this user
  const { data: any } = await supabase
    .from("evolution_instances")
    .select("instance_name, evolution_url, evolution_apikey")
    .eq("user_id", cp.user_id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (any?.instance_name) {
    return {
      instanceName: any.instance_name,
      apiUrl: (any.evolution_url || "").replace(/\/$/, ""),
      apiKey: any.evolution_apikey || "",
    };
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, customerProductId } = await req.json();

    if (!customerProductId) {
      return new Response(JSON.stringify({ error: "customerProductId obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (action === "execute") {
      const { data: rules } = await supabase
        .from("crm_follow_up_rules")
        .select("*")
        .eq("customer_product_id", customerProductId)
        .eq("is_active", true);

      if (!rules || rules.length === 0) {
        return new Response(
          JSON.stringify({ message: "Nenhuma regra ativa encontrada.", executed: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const instance = await resolveCrmInstance(supabase, customerProductId);

      if (!instance) {
        return new Response(
          JSON.stringify({
            error:
              "Nenhuma instância WhatsApp conectada. Conecte o WhatsApp na aba WhatsApp do CRM antes de executar follow-ups.",
            executed: 0,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      console.log(`[crm-follow-up] using instance: ${instance.instanceName}`);

      let executed = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const rule of rules) {
        try {
          let candidates: Array<{ name: string; phone: string; context: string }> = [];

          if (rule.trigger_type === "sem_resposta") {
            const cutoff = new Date(Date.now() - rule.delay_hours * 3600 * 1000).toISOString();
            const { data: logs } = await supabase
              .from("bot_conversation_logs")
              .select("phone, message_text, created_at")
              .eq("customer_product_id", customerProductId)
              .eq("direction", "inbound")
              .lt("created_at", cutoff)
              .order("created_at", { ascending: false })
              .limit(50);

            if (logs) {
              const phones = [...new Set(logs.map((l: any) => l.phone).filter(Boolean))];
              for (const phone of phones) {
                const { data: existing } = await supabase
                  .from("crm_follow_up_logs")
                  .select("id, attempt_number")
                  .eq("customer_product_id", customerProductId)
                  .eq("client_phone", phone)
                  .eq("rule_id", rule.id)
                  .order("created_at", { ascending: false })
                  .limit(1);

                const lastAttempt = existing?.[0]?.attempt_number || 0;
                if (lastAttempt < rule.max_attempts) {
                  const clientLog = logs.find((l: any) => l.phone === phone);
                  candidates.push({
                    name: phone,
                    phone,
                    context: clientLog?.message_text?.substring(0, 100) || "",
                  });
                }
              }
            }
          } else if (rule.trigger_type === "lead_novo") {
            const cutoff = new Date(Date.now() - rule.delay_hours * 3600 * 1000).toISOString();
            const { data: newLeads } = await supabase
              .from("crm_customers")
              .select("id, name, phone")
              .eq("customer_product_id", customerProductId)
              .eq("status", "lead")
              .lt("created_at", cutoff)
              .not("phone", "is", null)
              .limit(20);

            if (newLeads) {
              for (const lead of newLeads) {
                const { data: existing } = await supabase
                  .from("crm_follow_up_logs")
                  .select("id")
                  .eq("customer_product_id", customerProductId)
                  .eq("client_phone", lead.phone)
                  .eq("rule_id", rule.id)
                  .limit(1);

                if (!existing || existing.length === 0) {
                  candidates.push({
                    name: lead.name,
                    phone: lead.phone!,
                    context: "Novo lead no CRM",
                  });
                }
              }
            }
          } else if (rule.trigger_type === "oportunidade_parada") {
            const cutoff = new Date(Date.now() - rule.delay_hours * 3600 * 1000).toISOString();
            const { data: opps } = await supabase
              .from("crm_opportunities")
              .select("id, title, customer_id, updated_at, stage, crm_customers(name, phone)")
              .eq("customer_product_id", customerProductId)
              .lt("updated_at", cutoff)
              .not("stage", "in", "(ganho,perdido)")
              .limit(20);

            if (opps) {
              for (const opp of opps as any[]) {
                const phone = opp.crm_customers?.phone;
                const name = opp.crm_customers?.name;
                if (!phone) continue;

                const { data: existing } = await supabase
                  .from("crm_follow_up_logs")
                  .select("id, attempt_number")
                  .eq("customer_product_id", customerProductId)
                  .eq("opportunity_id", opp.id)
                  .eq("rule_id", rule.id)
                  .order("created_at", { ascending: false })
                  .limit(1);

                const lastAttempt = existing?.[0]?.attempt_number || 0;
                if (lastAttempt < rule.max_attempts) {
                  candidates.push({
                    name: name || phone,
                    phone,
                    context: opp.title,
                  });
                }
              }
            }
          }

          for (const candidate of candidates.slice(0, 10)) {
            const message = rule.message_template
              .replace(/\{\{nome\}\}/g, candidate.name)
              .replace(/\{\{assunto\}\}/g, candidate.context)
              .replace(/\{\{empresa\}\}/g, "")
              .replace(/\{\{dias\}\}/g, String(Math.ceil(rule.delay_hours / 24)));

            let status = "pendente";
            let errorDetail = "";

            try {
              const cleanPhone = candidate.phone.replace(/\D/g, "");
              await evolutionSendText(instance, cleanPhone, message);
              status = "enviado";
              executed++;
            } catch (e: any) {
              status = "falha";
              errorDetail = e?.message || String(e);
              failed++;
              console.error(`[crm-follow-up] send failed to ${candidate.phone}:`, errorDetail);
            }

            const { data: prevLog } = await supabase
              .from("crm_follow_up_logs")
              .select("attempt_number")
              .eq("customer_product_id", customerProductId)
              .eq("client_phone", candidate.phone)
              .eq("rule_id", rule.id)
              .order("created_at", { ascending: false })
              .limit(1);

            await supabase.from("crm_follow_up_logs").insert({
              rule_id: rule.id,
              customer_product_id: customerProductId,
              client_name: candidate.name,
              client_phone: candidate.phone,
              message_sent: errorDetail
                ? `${message}\n\n[ERRO: ${errorDetail.slice(0, 200)}]`
                : message,
              status,
              attempt_number: (prevLog?.[0]?.attempt_number || 0) + 1,
              sent_at: status === "enviado" ? new Date().toISOString() : null,
            });
          }
        } catch (e) {
          console.error(`[crm-follow-up] rule "${rule.name}" error:`, e);
          errors.push(rule.name);
        }
      }

      return new Response(
        JSON.stringify({
          message: `Follow-ups: ${executed} enviado(s), ${failed} falha(s) via ${instance.instanceName}.${
            errors.length ? ` Erros nas regras: ${errors.join(", ")}` : ""
          }`,
          executed,
          failed,
          instance: instance.instanceName,
          errors,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Follow-up error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
