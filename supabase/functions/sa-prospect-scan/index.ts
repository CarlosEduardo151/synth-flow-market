import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { processText, type ResolvedProvider } from "../_shared/ai-providers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Resolves provider + apiKey + model from the customer's "Motor IA" (ai_control_config).
// Falls back to Groq (NovaLink default) if nothing configured.
async function resolveEngine(supabase: any, customerProductId: string) {
  const { data: cfg } = await supabase
    .from("ai_control_config")
    .select("provider, model, temperature, max_tokens")
    .eq("customer_product_id", customerProductId)
    .eq("is_active", true)
    .maybeSingle();

  const rawProvider = (cfg?.provider || "lovable").toLowerCase();
  let provider: ResolvedProvider = "groq";
  let apiKey = "";
  let model = cfg?.model || "";

  if (rawProvider === "openai") {
    provider = "openai";
    apiKey = Deno.env.get("OPENAI_API_KEY") || "";
    if (!model) model = "gpt-4o-mini";
  } else if (rawProvider === "gemini" || rawProvider === "google") {
    provider = "google";
    apiKey = Deno.env.get("GEMINI_API_KEY") || "";
    if (!model) model = "gemini-2.5-flash";
  } else {
    // "lovable" / "novalink" / default → Groq
    provider = "groq";
    apiKey = Deno.env.get("GROQ_API_KEY") || "";
    if (!model || model.startsWith("nova-") || model.startsWith("gemini") || model.startsWith("gpt")) {
      model = "llama-3.3-70b-versatile";
    }
  }

  if (!apiKey) {
    throw new Error(`Motor de IA "${rawProvider}" sem chave configurada. Verifique em Canais → Motor IA.`);
  }

  return {
    provider,
    apiKey,
    model,
    temperature: cfg?.temperature ?? 0.3,
    maxTokens: cfg?.max_tokens ?? 2048,
  };
}

const FEEDS: Record<string, { name: string; url: string; category: string }[]> = {
  news_br: [
    { name: "G1 Economia", url: "https://g1.globo.com/rss/g1/economia/", category: "news_br" },
    { name: "Valor Empresas", url: "https://valor.globo.com/rss/empresas/", category: "news_br" },
    { name: "InfoMoney Mercados", url: "https://www.infomoney.com.br/feed/", category: "news_br" },
    { name: "Exame Negócios", url: "https://exame.com/feed/", category: "news_br" },
    { name: "Startups", url: "https://startups.com.br/feed/", category: "news_br" },
  ],
  tech_intl: [
    { name: "TechCrunch", url: "https://techcrunch.com/feed/", category: "tech_intl" },
    { name: "Crunchbase News", url: "https://news.crunchbase.com/feed/", category: "tech_intl" },
    { name: "VentureBeat", url: "https://venturebeat.com/feed/", category: "tech_intl" },
  ],
  reviews: [
    // Reclame Aqui não tem RSS aberto; usamos Trustpilot reviews recentes em PT.
    { name: "Trustpilot Reviews PT", url: "https://api.allorigins.win/raw?url=https%3A%2F%2Fwww.trustpilot.com%2Fcategories%2Fbusiness_services%2Frss", category: "reviews" },
  ],
};

interface RawItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  category: string;
}

function parseRSS(xml: string, source: string, category: string): RawItem[] {
  const items: RawItem[] = [];
  const itemRegex = /<item[\s\S]*?<\/item>/gi;
  const matches = xml.match(itemRegex) || [];
  for (const block of matches) {
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
      if (!m) return "";
      return m[1].replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").replace(/<[^>]+>/g, "").trim();
    };
    const title = get("title");
    const link = get("link");
    const description = get("description").slice(0, 500);
    const pubDate = get("pubDate");
    if (title && link) items.push({ title, link, description, pubDate, source, category });
  }
  return items;
}

async function fetchFeed(url: string, source: string, category: string): Promise<RawItem[]> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ProspectScan/1.0)" },
    });
    clearTimeout(t);
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRSS(xml, source, category).slice(0, 12);
  } catch {
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  let scanId: string | null = null;
  try {
    const { customer_product_id, sources, max_results = 15 } = await req.json();
    if (!customer_product_id) {
      return new Response(JSON.stringify({ ok: false, error: true, code: "missing_cpid", message: "customer_product_id é obrigatório" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Carrega ICP
    const { data: cfg } = await supabase
      .from("sa_config")
      .select("icp_description")
      .eq("customer_product_id", customer_product_id)
      .maybeSingle();
    const icp = (cfg?.icp_description || "").trim();
    if (!icp) {
      return new Response(JSON.stringify({
        ok: false, error: true, code: "missing_icp",
        message: "Configure e SALVE primeiro o perfil do cliente ideal (ICP) no card '🎯 Definição do Cliente Ideal' acima.",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const requestedCategories: string[] = sources?.length ? sources : ["news_br", "tech_intl", "reviews"];
    const feedList = requestedCategories.flatMap((c) => FEEDS[c] || []);
    if (feedList.length < 5) {
      // garante mínimo de 5 fontes — completa com news_br
      for (const f of FEEDS.news_br) {
        if (!feedList.find((x) => x.url === f.url)) feedList.push(f);
        if (feedList.length >= 5) break;
      }
    }

    // Cria registro de scan
    const { data: scanRow } = await supabase
      .from("sa_prospect_scans")
      .insert({
        customer_product_id,
        status: "running",
        sources_used: feedList.map((f) => f.name),
        icp_snapshot: icp,
      })
      .select("id")
      .single();
    scanId = scanRow?.id || null;

    // Busca paralela
    const allItems = (await Promise.all(feedList.map((f) => fetchFeed(f.url, f.name, f.category)))).flat();

    // Dedup por título
    const seen = new Set<string>();
    const items = allItems.filter((i) => {
      const k = i.title.toLowerCase().slice(0, 80);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 60);

    if (items.length === 0) {
      await supabase.from("sa_prospect_scans").update({
        status: "done", total_fetched: 0, total_scored: 0, total_hot: 0, finished_at: new Date().toISOString(),
      }).eq("id", scanId!);
      return new Response(JSON.stringify({ ok: true, total: 0, hot: 0, prospects: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pontuação via Groq em batch
    const sys = `Você é um analista B2B sênior de prospecção focado em SMB e mid-market.
Receberá: 1) ICP do usuário  2) Lista de notícias/sinais.

Para cada item, identifique a empresa/pessoa mencionada e pontue 0-100 a aderência ao ICP.

🎯 FILTRO CRÍTICO DE PORTE (regra obrigatória):
- O cliente vende produtos/serviços simples e de baixo/médio ticket (chatbots, CRMs leves, automações).
- PRIORIZE PEQUENO e MÉDIO porte: startups early-stage (seed/Série A/B), PMEs, MEIs, agências, franquias regionais, lojas, prestadores, clínicas, escritórios, e-commerces independentes, indústrias locais, SaaS emergentes.
- PENALIZE PESADO (score máx 30) gigantes/enterprise: receita >R$500M/ano, listadas em bolsa, multinacionais (Google, Itaú, Vale, Ambev, Magalu, Americanas, Petrobras, etc), unicórnios consolidados, big techs, bancos top-10, conglomerados. Eles NÃO compram produtos simples.
- Se o sinal for sobre uma empresa grande mas cita um parceiro/fornecedor pequeno, foque no pequeno.
- Empresas regionais/locais com porte desconhecido → trate como médio (elegíveis).

Score >=75 = lead quente (porte adequado + alinhamento ao ICP).

Responda APENAS JSON: {"prospects":[{"index":N,"company":"","sector":"","company_size":"micro|pequena|media|grande","relevance_score":N,"reason":"","suggested_action":"","event_type":"news|funding|hiring|expansion|job_change"}]}
Inclua APENAS itens com score >=40. Máximo ${max_results} prospects, ordenados por score desc.`;

    const usr = `ICP DO CLIENTE:\n${icp}\n\nSINAIS COLETADOS (${items.length}):\n${
      items.map((it, i) => `[${i}] (${it.source}) ${it.title}${it.description ? " — " + it.description.slice(0, 200) : ""}`).join("\n")
    }`;

    // Resolve customer's configured AI engine (same as "Canais → Motor IA")
    const engine = await resolveEngine(supabase, customer_product_id);
    console.log(`[sa-prospect-scan] engine: provider=${engine.provider} model=${engine.model}`);

    let content = "{}";
    try {
      const aiResult = await processText(
        engine.provider,
        {
          apiKey: engine.apiKey,
          model: engine.model,
          systemPrompt: sys,
          temperature: engine.temperature,
          maxTokens: engine.maxTokens,
        },
        usr,
      );
      content = aiResult.text || "{}";
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (msg.includes("429")) throw new Error("Limite de requisições do motor de IA atingido. Tente em alguns minutos.");
      if (msg.includes("401") || msg.includes("403")) throw new Error("Chave do motor de IA inválida. Verifique em Canais → Motor IA.");
      throw new Error(`Motor de IA falhou: ${msg.slice(0, 200)}`);
    }

    // Strip code fences if present
    const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) content = fenceMatch[1];
    let parsed: any = {};
    try { parsed = JSON.parse(content.trim()); } catch { parsed = { prospects: [] }; }

    const ranked: any[] = (parsed.prospects || []).slice(0, max_results);
    const enriched = ranked.map((p) => {
      const it = items[p.index] || {};
      return {
        company: p.company || "Empresa não identificada",
        sector: p.sector || null,
        relevance_score: Math.min(100, Math.max(0, Number(p.relevance_score) || 0)),
        reason: p.reason || "",
        suggested_action: p.suggested_action || "",
        event_type: p.event_type || "news",
        source_title: it.title,
        source_url: it.link,
        source_name: it.source,
      };
    });

    const hot = enriched.filter((e) => e.relevance_score >= 75);

    // Cria trigger events para os quentes
    if (hot.length > 0) {
      const rows = hot.map((h) => ({
        customer_product_id,
        event_type: h.event_type,
        title: `${h.company}: ${h.source_title}`.slice(0, 200),
        description: h.reason,
        source: h.source_name,
        source_url: h.source_url,
        relevance_score: h.relevance_score,
        status: "new",
        metadata: { suggested_action: h.suggested_action, sector: h.sector, scan_id: scanId, auto_scan: true },
      }));
      await supabase.from("sa_trigger_events").insert(rows);
    }

    await supabase.from("sa_prospect_scans").update({
      status: "done",
      total_fetched: items.length,
      total_scored: enriched.length,
      total_hot: hot.length,
      results: enriched,
      finished_at: new Date().toISOString(),
    }).eq("id", scanId!);

    return new Response(JSON.stringify({
      ok: true, scan_id: scanId, total_fetched: items.length, total_scored: enriched.length, total_hot: hot.length, prospects: enriched,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[sa-prospect-scan] erro:", e);
    if (scanId) {
      await supabase.from("sa_prospect_scans").update({
        status: "error", error_message: e.message, finished_at: new Date().toISOString(),
      }).eq("id", scanId);
    }
    return new Response(JSON.stringify({ ok: false, error: true, message: e.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
