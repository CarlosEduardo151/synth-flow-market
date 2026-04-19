import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { campaignId, action, scheduledFor } = await req.json();
    if (!campaignId || !action) {
      return new Response(JSON.stringify({ error: "campaignId e action obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (action === "send") {
      const { data: c } = await supabase.from("sa_winback_campaigns").select("*").eq("id", campaignId).maybeSingle();
      if (!c) throw new Error("Campanha não encontrada");

      // TODO: integrar com WhatsApp StarAI / email — por enquanto registra envio
      await supabase.from("sa_winback_campaigns").update({
        status: "sent", sent_at: new Date().toISOString(),
      }).eq("id", campaignId);

      return new Response(JSON.stringify({ ok: true, status: "sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "schedule") {
      await supabase.from("sa_winback_campaigns").update({
        status: "scheduled", scheduled_for: scheduledFor || new Date(Date.now() + 86400000).toISOString(),
      }).eq("id", campaignId);
      return new Response(JSON.stringify({ ok: true, status: "scheduled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "regenerate") {
      const groqKey = Deno.env.get("GROQ_API_KEY");
      if (!groqKey) throw new Error("GROQ_API_KEY ausente");
      const { data: c } = await supabase.from("sa_winback_campaigns").select("*").eq("id", campaignId).maybeSingle();
      if (!c) throw new Error("Campanha não encontrada");

      const sys = `Você é especialista em copywriting de win-back. Gere UMA NOVA variação de mensagem usando um gatilho DIFERENTE do atual ("${c.trigger_type}"). Máx 350 chars, português, profissional, sem desespero. Responda JSON: {"trigger_type":"...","suggested_message":"...","success_probability":0-100}`;
      const user = `Lead: ${c.lead_name} (${c.company || "—"}). Perdido há ${c.days_since_lost} dias. Motivo: ${c.lost_reason || "não informado"}. Valor: R$ ${c.monthly_value || 0}.`;

      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: sys }, { role: "user", content: user }],
          temperature: 0.95, max_tokens: 400, response_format: { type: "json_object" },
        }),
      });
      const j = await r.json();
      const parsed = JSON.parse(j.choices?.[0]?.message?.content || "{}");

      await supabase.from("sa_winback_campaigns").update({
        trigger_type: parsed.trigger_type || c.trigger_type,
        suggested_message: String(parsed.suggested_message || c.suggested_message).slice(0, 500),
        success_probability: Math.max(0, Math.min(100, Math.round(Number(parsed.success_probability) || c.success_probability || 30))),
      }).eq("id", campaignId);

      return new Response(JSON.stringify({ ok: true, ...parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "mark_recovered") {
      await supabase.from("sa_winback_campaigns").update({
        status: "recovered", recovered: true, recovered_at: new Date().toISOString(),
      }).eq("id", campaignId);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "dismiss") {
      await supabase.from("sa_winback_campaigns").update({ status: "dismissed" }).eq("id", campaignId);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "ação inválida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sa-winback-action error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
