import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "execute") {
      // Get active rules for this product
      const { data: rules } = await supabase
        .from("crm_follow_up_rules")
        .select("*")
        .eq("customer_product_id", customerProductId)
        .eq("is_active", true);

      if (!rules || rules.length === 0) {
        return new Response(JSON.stringify({ message: "Nenhuma regra ativa encontrada.", executed: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get the WhatsApp instance for this product
      const { data: instance } = await supabase
        .from("evolution_instances")
        .select("instance_name, evolution_url, evolution_apikey")
        .eq("customer_product_id", customerProductId)
        .eq("is_active", true)
        .limit(1)
        .single();

      let executed = 0;
      const errors: string[] = [];

      for (const rule of rules) {
        try {
          // Find candidates based on trigger type
          let candidates: Array<{ name: string; phone: string; context: string }> = [];

          if (rule.trigger_type === "sem_resposta") {
            // Find clients who sent a message but didn't get a reply within delay_hours
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
              // Check which ones already had follow-ups recently
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
                    phone: phone,
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
          }

          // Send follow-ups
          for (const candidate of candidates.slice(0, 10)) {
            const message = rule.message_template
              .replace(/\{\{nome\}\}/g, candidate.name)
              .replace(/\{\{assunto\}\}/g, candidate.context)
              .replace(/\{\{empresa\}\}/g, "")
              .replace(/\{\{dias\}\}/g, String(Math.ceil(rule.delay_hours / 24)));

            let status = "pendente";

            // Try to send via WhatsApp if instance is connected
            if (instance) {
              try {
                const cleanPhone = candidate.phone.replace(/\D/g, "");
                const sendRes = await fetch(
                  `${instance.evolution_url}/message/sendText/${instance.instance_name}`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      apikey: instance.evolution_apikey,
                    },
                    body: JSON.stringify({
                      number: cleanPhone,
                      text: message,
                    }),
                  }
                );

                status = sendRes.ok ? "enviado" : "falha";
              } catch {
                status = "falha";
              }
            }

            // Log the follow-up
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
              message_sent: message,
              status,
              attempt_number: (prevLog?.[0]?.attempt_number || 0) + 1,
              sent_at: status === "enviado" ? new Date().toISOString() : null,
            });

            if (status === "enviado") executed++;
          }
        } catch (e) {
          console.error(`Error processing rule ${rule.name}:`, e);
          errors.push(rule.name);
        }
      }

      return new Response(
        JSON.stringify({
          message: `Follow-ups executados: ${executed} mensagem(s) enviada(s).${errors.length > 0 ? ` Erros em: ${errors.join(", ")}` : ""}`,
          executed,
          errors,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
