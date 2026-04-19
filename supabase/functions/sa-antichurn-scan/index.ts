import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightRequest, corsResponse } from "../_shared/cors.ts";
import { checkSaRateLimit, rateLimitResponse, SA_RATE_LIMITS } from "../_shared/sa-rate-limit.ts";

// ============= Heurísticas locais (rápidas, sem IA) =============

const CHURN_KEYWORDS = [
  "cancelar", "cancela", "cancelamento", "encerrar", "desistir", "desisti",
  "caro", "caríssimo", "preço alto", "muito caro", "sem dinheiro",
  "não funciona", "nao funciona", "não está funcionando", "quebrado", "bug",
  "reclamação", "reclamacao", "reclamar", "insatisfeito", "decepcionado",
  "concorrente", "outra empresa", "mudei", "trocando", "trocar",
  "péssimo", "pessimo", "horrível", "horrivel", "ruim", "lixo",
  "esperando", "demora", "lento", "atraso", "ainda não", "ainda nao",
  "ajuda", "socorro", "urgente", "problema",
];

const EMOTIONAL_MARKERS: Record<string, RegExp[]> = {
  Frustração: [/frustr/i, /irritad/i, /chateado/i, /raiva/i, /absurdo/i, /\!{2,}/],
  Urgência: [/urgent/i, /agora/i, /imediat/i, /rápido|rapido/i, /hoje\b/i],
  Indiferença: [/tanto faz/i, /qualquer/i, /\.{3,}/, /\bok\b/i, /\bbeleza\b/i],
  Satisfação: [/obrigad/i, /excelente/i, /ótim|otim/i, /perfeito/i, /amei/i, /gostei/i],
  Confusão: [/não entendi|nao entendi/i, /como assim/i, /\?{2,}/, /confus/i],
};

function localSentimentScore(text: string): number {
  const t = text.toLowerCase();
  let score = 0;
  const positive = ["obrigado", "obrigada", "ótimo", "otimo", "excelente", "perfeito", "gostei", "amei", "top", "show", "maravilh"];
  const negative = ["ruim", "péssimo", "pessimo", "horrível", "horrivel", "lixo", "decepcion", "frustr", "raiva", "absurdo", "cancelar", "caro"];
  for (const p of positive) if (t.includes(p)) score += 0.3;
  for (const n of negative) if (t.includes(n)) score -= 0.4;
  return Math.max(-1, Math.min(1, score));
}

function detectKeywords(text: string): string[] {
  const t = text.toLowerCase();
  const found = new Set<string>();
  for (const k of CHURN_KEYWORDS) if (t.includes(k)) found.add(k);
  return [...found];
}

function detectEmotionalMarkers(text: string): string[] {
  const found = new Set<string>();
  for (const [marker, patterns] of Object.entries(EMOTIONAL_MARKERS)) {
    if (patterns.some((p) => p.test(text))) found.add(marker);
  }
  return [...found];
}

function calcEngagementDrop(messages: { created_at: string }[]): number {
  if (messages.length < 4) return 0;
  const sorted = [...messages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const now = Date.now();
  const last7 = sorted.filter((m) => now - new Date(m.created_at).getTime() <= 7 * 86400000).length;
  const prev7 = sorted.filter((m) => {
    const age = now - new Date(m.created_at).getTime();
    return age > 7 * 86400000 && age <= 14 * 86400000;
  }).length;
  if (prev7 === 0) return 0;
  const drop = Math.round(((prev7 - last7) / prev7) * 100);
  return Math.max(0, Math.min(100, drop));
}

function calcHealthScore(input: {
  daysSince: number | null;
  sentimentScore: number;
  keywordCount: number;
  silentNegative: boolean;
  engagementDropPct: number;
  emotionalMarkers: string[];
  lostCount: number;
  status: string | null;
  interactionsCount: number;
}): number {
  let score = 100;
  // Tempo sem contato
  if (input.daysSince != null) {
    if (input.daysSince > 60) score -= 30;
    else if (input.daysSince > 30) score -= 20;
    else if (input.daysSince > 14) score -= 10;
  }
  // Sentimento (-1..+1) → -25..+15
  score += input.sentimentScore >= 0 ? input.sentimentScore * 15 : input.sentimentScore * 25;
  // Keywords
  score -= Math.min(25, input.keywordCount * 8);
  // Silêncio negativo
  if (input.silentNegative) score -= 15;
  // Queda de engajamento
  if (input.engagementDropPct >= 50) score -= 15;
  else if (input.engagementDropPct >= 30) score -= 10;
  // Marcadores fortes
  if (input.emotionalMarkers.includes("Frustração")) score -= 10;
  if (input.emotionalMarkers.includes("Confusão")) score -= 5;
  if (input.emotionalMarkers.includes("Satisfação")) score += 5;
  // Status
  if (input.status === "churned" || input.status === "inactive") score -= 20;
  // Histórico
  score -= Math.min(10, input.lostCount * 5);
  if (input.interactionsCount === 0) score -= 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function sentimentLabel(score: number): string {
  if (score >= 0.5) return "Promotor";
  if (score >= 0.15) return "Satisfeito";
  if (score >= -0.15) return "Neutro";
  if (score >= -0.5) return "Detrator";
  return "Detrator Crítico";
}

// ============= IA: gera resumo executivo + ação =============

const SYSTEM_PROMPT = `Você é analista de Customer Success. Para cada cliente, gere um resumo executivo CURTO (1-2 frases) e uma ação concreta de retenção.

Responda APENAS JSON válido:
{
  "insights": [
    {
      "customer_id": "uuid",
      "executive_summary": "Cliente X teve queda de 30% no engajamento e tom de frustração nas últimas 3 mensagens.",
      "suggested_action": "Ligar oferecendo desconto de 15% e suporte prioritário",
      "monthly_value_estimate": 0
    }
  ]
}

Seja direto, factual, em português. Use os dados quantitativos fornecidos.`;

async function callAI(systemPrompt: string, userPrompt: string) {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) throw new Error("GROQ_API_KEY não configurada");
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    console.error("Groq error:", resp.status, txt);
    if (resp.status === 429) throw new Error("Limite Groq atingido. Aguarde alguns minutos.");
    throw new Error("Erro ao chamar IA Groq");
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content as string;
}

function extractJson(content: string): any {
  const m = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/```\n?([\s\S]*?)\n?```/);
  return JSON.parse((m ? m[1] : content).trim());
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
  const origin = req.headers.get("Origin");

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return corsResponse({ error: "Unauthorized" }, 401, origin);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userRes } = await supabase.auth.getUser(token);
    const user = userRes?.user;
    if (!user) return corsResponse({ error: "Unauthorized" }, 401, origin);

    const { customerProductId } = await req.json();
    if (!customerProductId) return corsResponse({ error: "customerProductId obrigatório" }, 400, origin);

    const auth = req.headers.get("Authorization") || "";
    const isService = auth.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "__none__");
    if (!isService) {
      const rl = await checkSaRateLimit(`antichurn:${customerProductId}`, {
        endpoint: "sa-antichurn-scan",
        ...SA_RATE_LIMITS.ANTICHURN_SCAN,
      });
      if (rl.limited) return rateLimitResponse(rl.retryAfterSeconds || 60, origin);
    }

    const { data: cp } = await supabase
      .from("customer_products")
      .select("id,user_id")
      .eq("id", customerProductId)
      .maybeSingle();
    if (!cp || cp.user_id !== user.id) {
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) return corsResponse({ error: "Forbidden" }, 403, origin);
    }

    // Carrega clientes
    const { data: customers } = await supabase
      .from("crm_customers")
      .select("id,name,email,phone,company,status,notes,last_contact_date,created_at")
      .eq("customer_product_id", customerProductId)
      .order("last_contact_date", { ascending: true, nullsFirst: true })
      .limit(100);

    if (!customers || customers.length === 0) {
      return corsResponse({ ok: true, scanned: 0, alerts_created: 0, message: "Sem clientes no CRM" }, 200, origin);
    }

    const customerIds = customers.map((c: any) => c.id);
    const phones = customers.map((c: any) => c.phone).filter(Boolean);

    // Carrega oportunidades, interações e logs de WhatsApp
    const [{ data: opps }, { data: interactions }, { data: waLogs }] = await Promise.all([
      supabase
        .from("crm_opportunities")
        .select("id,customer_id,stage,value,updated_at,lost_reason")
        .in("customer_id", customerIds),
      supabase
        .from("crm_interactions")
        .select("customer_id,type,description,subject,created_at")
        .in("customer_id", customerIds)
        .order("created_at", { ascending: false })
        .limit(1000),
      phones.length > 0
        ? supabase
            .from("bot_conversation_logs")
            .select("phone,direction,message_text,created_at")
            .eq("customer_product_id", customerProductId)
            .in("phone", phones)
            .order("created_at", { ascending: false })
            .limit(1500)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const oppsByCustomer = new Map<string, any[]>();
    (opps || []).forEach((o: any) => {
      const arr = oppsByCustomer.get(o.customer_id) || [];
      arr.push(o);
      oppsByCustomer.set(o.customer_id, arr);
    });

    const interByCustomer = new Map<string, any[]>();
    (interactions || []).forEach((i: any) => {
      const arr = interByCustomer.get(i.customer_id) || [];
      arr.push(i);
      interByCustomer.set(i.customer_id, arr);
    });

    const waByPhone = new Map<string, any[]>();
    (waLogs || []).forEach((l: any) => {
      if (!l.phone) return;
      const arr = waByPhone.get(l.phone) || [];
      arr.push(l);
      waByPhone.set(l.phone, arr);
    });

    // ========== Análise local (sem IA) por cliente ==========
    const analyzed = customers.map((c: any) => {
      const cOpps = oppsByCustomer.get(c.id) || [];
      const cInter = interByCustomer.get(c.id) || [];
      const cWA = c.phone ? (waByPhone.get(c.phone) || []) : [];

      // Junta todas mensagens (interações + whatsapp inbound)
      const allMessages = [
        ...cInter.map((i: any) => ({ text: `${i.subject || ""} ${i.description || ""}`.trim(), created_at: i.created_at, direction: "in" })),
        ...cWA.filter((l: any) => l.direction === "in").map((l: any) => ({ text: l.message_text || "", created_at: l.created_at, direction: "in" })),
      ].filter((m) => m.text);

      const lastContact = c.last_contact_date
        || allMessages[0]?.created_at
        || c.created_at;
      const daysSince = lastContact
        ? Math.floor((Date.now() - new Date(lastContact).getTime()) / 86400000)
        : null;

      // Concatena últimas 10 mensagens para análise
      const recentText = allMessages.slice(0, 10).map((m) => m.text).join(" \n ");
      const sentimentScore = recentText ? localSentimentScore(recentText) : 0;
      const keywords = detectKeywords(recentText);
      const markers = detectEmotionalMarkers(recentText);
      const engagementDropPct = calcEngagementDrop(allMessages);

      // Silêncio negativo: tinha 3+ mensagens nos últimos 30d e parou há 7+ dias
      const last30 = allMessages.filter((m) => Date.now() - new Date(m.created_at).getTime() <= 30 * 86400000);
      const silentNegative = last30.length >= 3 && (daysSince || 0) >= 7;

      const wonValue = cOpps.filter((o: any) => o.stage === "ganho" || o.stage === "won").reduce((s: number, o: any) => s + Number(o.value || 0), 0);
      const lostCount = cOpps.filter((o: any) => o.stage === "perdido" || o.stage === "lost").length;

      const healthScore = calcHealthScore({
        daysSince,
        sentimentScore,
        keywordCount: keywords.length,
        silentNegative,
        engagementDropPct,
        emotionalMarkers: markers,
        lostCount,
        status: c.status,
        interactionsCount: cInter.length + cWA.length,
      });

      const churnProbability = Math.max(0, Math.min(100, 100 - healthScore));
      const riskLevel = churnProbability >= 80 ? "critical" : churnProbability >= 60 ? "high" : churnProbability >= 40 ? "medium" : "low";

      const signals: string[] = [];
      if (daysSince != null && daysSince >= 30) signals.push(`${daysSince} dias sem contato`);
      if (silentNegative) signals.push("Silêncio negativo (parou de interagir abruptamente)");
      if (engagementDropPct >= 30) signals.push(`Queda de ${engagementDropPct}% no engajamento`);
      if (keywords.length > 0) signals.push(`Palavras de risco: ${keywords.slice(0, 3).join(", ")}`);
      if (markers.includes("Frustração")) signals.push("Tom de frustração detectado");
      if (markers.includes("Confusão")) signals.push("Sinais de confusão na comunicação");
      if (lostCount > 0) signals.push(`${lostCount} oportunidade(s) perdida(s)`);
      if (c.status === "churned" || c.status === "inactive") signals.push(`Status atual: ${c.status}`);

      return {
        id: c.id,
        name: c.name,
        company: c.company,
        phone: c.phone,
        status: c.status,
        days_since_contact: daysSince,
        messages_analyzed: allMessages.length,
        sentiment_score: Number(sentimentScore.toFixed(2)),
        sentiment_label: sentimentLabel(sentimentScore),
        emotional_markers: markers,
        churn_keywords: keywords,
        engagement_drop_pct: engagementDropPct,
        silent_negative: silentNegative,
        health_score: healthScore,
        churn_probability: churnProbability,
        risk_level: riskLevel,
        signals,
        won_value_brl: wonValue,
        lost_count: lostCount,
      };
    });

    // Considera em risco quem tem health < 70 OU sinais relevantes
    const atRisk = analyzed.filter((a) =>
      a.health_score < 70 ||
      a.signals.length >= 2 ||
      a.silent_negative ||
      a.churn_keywords.length > 0
    );

    // ========== IA enriquece com resumo executivo + ação ==========
    let aiInsights: any[] = [];
    if (atRisk.length > 0) {
      try {
        const aiInput = atRisk.slice(0, 30).map((a) => ({
          customer_id: a.id,
          name: a.name,
          company: a.company,
          health_score: a.health_score,
          sentiment: a.sentiment_label,
          days_since_contact: a.days_since_contact,
          engagement_drop_pct: a.engagement_drop_pct,
          silent_negative: a.silent_negative,
          churn_keywords: a.churn_keywords,
          emotional_markers: a.emotional_markers,
          messages_analyzed: a.messages_analyzed,
          won_value_brl: a.won_value_brl,
          signals: a.signals,
        }));
        const userPrompt = `Para cada cliente abaixo gere um resumo executivo (1-2 frases) e uma ação concreta de retenção.\n${JSON.stringify(aiInput, null, 2)}`;
        const content = await callAI(SYSTEM_PROMPT, userPrompt);
        const parsed = extractJson(content);
        aiInsights = parsed?.insights || [];
      } catch (e) {
        console.error("AI enrichment failed (continuing without):", e);
      }
    }

    const insightsMap = new Map<string, any>();
    for (const i of aiInsights) insightsMap.set(i.customer_id, i);

    // ========== Persiste alertas ==========
    let created = 0;
    let updated = 0;

    for (const a of atRisk) {
      const ai = insightsMap.get(a.id) || {};

      const fallbackSummary = `${a.name || "Cliente"} apresenta health score ${a.health_score}/100. ${a.signals.slice(0, 2).join(". ") || "Sinais de risco detectados"}.`;
      const fallbackAction = a.silent_negative
        ? "Reativar contato imediato via WhatsApp com mensagem personalizada"
        : a.churn_keywords.length > 0
        ? "Ligar para entender objeções e oferecer condição especial"
        : "Agendar check-in proativo para reforçar valor entregue";

      const payload = {
        customer_product_id: customerProductId,
        crm_customer_id: a.id,
        customer_name: a.name,
        company: a.company,
        churn_probability: a.churn_probability,
        risk_level: a.risk_level,
        days_since_contact: a.days_since_contact,
        signals: a.signals,
        suggested_action: ai.suggested_action || fallbackAction,
        monthly_value: Number(ai.monthly_value_estimate) || 0,
        status: "active",
        recommended_actions: [ai.suggested_action || fallbackAction],
        detected_at: new Date().toISOString(),
        // Novos campos avançados
        health_score: a.health_score,
        sentiment_score: a.sentiment_score,
        sentiment_label: a.sentiment_label,
        emotional_markers: a.emotional_markers,
        churn_keywords: a.churn_keywords,
        engagement_drop_pct: a.engagement_drop_pct,
        silent_negative: a.silent_negative,
        executive_summary: ai.executive_summary || fallbackSummary,
        messages_analyzed: a.messages_analyzed,
      };

      const { data: existing } = await supabase
        .from("sa_antichurn_alerts")
        .select("id")
        .eq("customer_product_id", customerProductId)
        .eq("crm_customer_id", a.id)
        .in("status", ["open", "active"])
        .maybeSingle();

      if (existing) {
        await supabase.from("sa_antichurn_alerts").update(payload).eq("id", existing.id);
        updated++;
      } else {
        await supabase.from("sa_antichurn_alerts").insert(payload);
        created++;
      }
    }

    return corsResponse(
      {
        ok: true,
        scanned: customers.length,
        analyzed: analyzed.length,
        at_risk: atRisk.length,
        alerts_created: created,
        alerts_updated: updated,
        ai_enriched: aiInsights.length,
        clients: analyzed.map((a) => ({
          id: a.id,
          name: a.name,
          company: a.company,
          health_score: a.health_score,
          churn_probability: a.churn_probability,
          risk_level: a.risk_level,
          sentiment_label: a.sentiment_label,
          days_since_contact: a.days_since_contact,
          messages_analyzed: a.messages_analyzed,
          signals: a.signals,
        })),
      },
      200,
      origin,
    );
  } catch (err) {
    console.error("sa-antichurn-scan error:", err);
    return corsResponse(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      500,
      origin,
    );
  }
});
