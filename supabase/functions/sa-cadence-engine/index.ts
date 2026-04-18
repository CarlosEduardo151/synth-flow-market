import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

interface CadenceStep {
  day: number;
  channel: "email" | "whatsapp" | "call" | "linkedin";
  subject?: string;
  prompt: string; // instruction for the AI
  desc?: string;
}

async function generateAIMessage(opts: {
  step: CadenceStep;
  leadName: string;
  leadCompany?: string;
  context?: string;
  tone: string;
  cadenceGoal: string;
}) {
  const sys = `Você é um SDR sênior. Gere UMA mensagem (sem prefácios, sem marcadores) para um lead, no tom "${opts.tone}", canal "${opts.step.channel}". Objetivo da cadência: ${opts.cadenceGoal}. Regras: máx 600 caracteres, português BR, personalizada, com 1 CTA claro. Não use placeholders. Não inclua assinatura.`;
  const user = `Lead: ${opts.leadName}${opts.leadCompany ? " (" + opts.leadCompany + ")" : ""}\nContexto: ${opts.context || "primeiro contato"}\nInstrução do passo: ${opts.step.prompt}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}`);
  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, customerProductId } = body;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ============ CREATE cadence (AI-generated steps) ============
    if (action === "create") {
      const { name, goal, audience, channel, tone, days } = body;
      const sys = `Você é um especialista em cadências de outbound. Gere uma sequência JSON de ${days || 7} passos para cadência "${name}". Objetivo: ${goal}. Público: ${audience}. Canal principal: ${channel}. Tom: ${tone}. Retorne SOMENTE JSON no formato: {"steps":[{"day":0,"channel":"whatsapp|email|call|linkedin","subject":"...(só email)","prompt":"instrução do que falar nesse passo","desc":"label curto 3-4 palavras"}]}`;
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: sys }, { role: "user", content: "Gere a cadência agora." }],
          response_format: { type: "json_object" },
        }),
      });
      if (!aiRes.ok) throw new Error(`AI ${aiRes.status}`);
      const aiData = await aiRes.json();
      const parsed = JSON.parse(aiData.choices[0].message.content);
      const steps: CadenceStep[] = parsed.steps || [];

      const { data: cad, error } = await supabase
        .from("sa_cadences")
        .insert({
          customer_product_id: customerProductId,
          name,
          goal,
          target_audience: audience,
          primary_channel: channel,
          tone,
          steps,
          total_steps: steps.length,
          is_active: true,
          ai_personalization: true,
        })
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, cadence: cad }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============ ENROLL leads ============
    if (action === "enroll") {
      const { cadenceId, prospectIds } = body;
      const rows = (prospectIds as string[]).map((pid) => ({
        customer_product_id: customerProductId,
        cadence_id: cadenceId,
        prospect_id: pid,
        current_step: 0,
        status: "active",
        next_action_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from("sa_cadence_enrollments").insert(rows);
      if (error) throw error;
      await supabase.rpc("sa_recompute_cadence_metrics" as any, { p_cadence_id: cadenceId }).catch(() => {});
      return new Response(JSON.stringify({ ok: true, enrolled: rows.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============ EXECUTE due actions ============
    if (action === "execute") {
      const { data: due } = await supabase
        .from("sa_cadence_enrollments")
        .select("id, cadence_id, prospect_id, current_step, lead_name, lead_phone, lead_email")
        .eq("customer_product_id", customerProductId)
        .eq("status", "active")
        .lte("next_action_at", new Date().toISOString())
        .limit(25);

      let sent = 0;
      const errs: string[] = [];
      for (const e of due || []) {
        try {
          const { data: cad } = await supabase
            .from("sa_cadences")
            .select("steps, tone, goal, name, total_steps")
            .eq("id", e.cadence_id)
            .single();
          if (!cad) continue;
          const steps: CadenceStep[] = Array.isArray(cad.steps) ? (cad.steps as any) : [];
          const step = steps[e.current_step];
          if (!step) {
            await supabase.from("sa_cadence_enrollments").update({ status: "completed" }).eq("id", e.id);
            continue;
          }
          // Get prospect
          const { data: prospect } = await supabase
            .from("sa_prospects")
            .select("name, company, ai_summary")
            .eq("id", e.prospect_id)
            .maybeSingle();

          const message = await generateAIMessage({
            step,
            leadName: prospect?.name || e.lead_name || "Cliente",
            leadCompany: prospect?.company,
            context: prospect?.ai_summary,
            tone: cad.tone || "consultivo",
            cadenceGoal: cad.goal || "qualificar",
          });

          const nextStep = e.current_step + 1;
          const nextStepDef = steps[nextStep];
          const nextAt = nextStepDef
            ? new Date(Date.now() + (nextStepDef.day - step.day) * 86400000).toISOString()
            : null;

          const newHistoryEntry = {
            step: e.current_step,
            channel: step.channel,
            sent_at: new Date().toISOString(),
            message,
          };

          await supabase
            .from("sa_cadence_enrollments")
            .update({
              current_step: nextStep,
              last_action_at: new Date().toISOString(),
              next_action_at: nextAt,
              status: nextStepDef ? "active" : "completed",
              history: (await supabase
                .from("sa_cadence_enrollments")
                .select("history")
                .eq("id", e.id)
                .single()
              ).data?.history
                ? [...((await supabase.from("sa_cadence_enrollments").select("history").eq("id", e.id).single()).data!.history as any[]), newHistoryEntry]
                : [newHistoryEntry],
            })
            .eq("id", e.id);

          await supabase.from("sa_cadences").update({
            messages_sent: ((await supabase.from("sa_cadences").select("messages_sent").eq("id", e.cadence_id).single()).data?.messages_sent || 0) + 1,
          }).eq("id", e.cadence_id);

          sent++;
        } catch (err: any) {
          errs.push(err.message);
        }
      }

      return new Response(JSON.stringify({ ok: true, sent, errors: errs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============ TOGGLE / DELETE ============
    if (action === "toggle") {
      await supabase.from("sa_cadences").update({ is_active: body.value }).eq("id", body.cadenceId);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (action === "delete") {
      await supabase.from("sa_cadence_enrollments").delete().eq("cadence_id", body.cadenceId);
      await supabase.from("sa_cadences").delete().eq("id", body.cadenceId);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("sa-cadence-engine error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
