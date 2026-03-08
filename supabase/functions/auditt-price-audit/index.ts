import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── AI prompt to normalize part names for search ──
const NORMALIZE_PROMPT = `Você é um especialista em autopeças brasileiras. Sua tarefa é transformar nomes técnicos ou gírias de mecânico em termos de busca universais para lojas online de autopeças.

Para cada item recebido, retorne um JSON array com objetos contendo:
- "original": o nome original
- "searchTerm": o termo de busca otimizado (português, genérico, sem marca específica)
- "category": "peca" ou "servico"

Regras:
- Remova códigos internos, siglas proprietárias
- Use nomes comerciais comuns (ex: "FLT-OL-001 Filtro de óleo motor" → "filtro oleo motor")
- Para serviços (mão de obra), retorne category "servico" - estes NÃO serão buscados
- Mantenha simples: 2-4 palavras por termo

Responda APENAS com o JSON array, sem markdown.`;

// ── Scraping configuration ──
const SEARCH_SOURCES = [
  {
    name: "Mercado Livre",
    urlTemplate: (term: string) =>
      `https://lista.mercadolivre.com.br/${encodeURIComponent(term)}_OrderId_PRICE_NoIndex_True`,
    priceRegex: /class="andes-money-amount__fraction"[^>]*>([0-9.]+)<\/span>/g,
    centRegex: /class="andes-money-amount__cents[^"]*"[^>]*>(\d{2})<\/span>/g,
  },
];

// ── Regional adjustments for Imperatriz-MA ──
const REGIONAL_CONFIG = {
  fretePercent: 12,        // 12% estimated freight to Imperatriz
  convenienciaPercent: 8,  // 8% convenience margin for local availability
  margemSeguranca: 30,     // 30% = yellow alert
  margemCritica: 50,       // 50% = red alert
};

async function getAIKey(service: any): Promise<{ apiKey: string; provider: "openai" | "google" }> {
  const { data: adminRole } = await service
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  if (!adminRole?.user_id) throw new Error("no_admin_found");

  for (const [key, prov] of [["openai_api_key", "openai"], ["google_api_key", "google"]] as const) {
    const { data: cred } = await service
      .from("product_credentials")
      .select("credential_value")
      .eq("user_id", adminRole.user_id)
      .eq("product_slug", "ai")
      .eq("credential_key", key)
      .maybeSingle();

    if (cred?.credential_value?.trim()) {
      return { apiKey: cred.credential_value.trim(), provider: prov };
    }
  }
  throw new Error("no_ai_key");
}

async function normalizeItemsWithAI(
  items: Array<{ descricao: string; tipo: string }>,
  apiKey: string,
  provider: "openai" | "google"
): Promise<Array<{ original: string; searchTerm: string; category: string }>> {
  const itemList = items.map(i => `- ${i.descricao} (${i.tipo})`).join("\n");
  const userMsg = `Normalize estes itens de orçamento mecânico:\n${itemList}`;

  let resultText = "";

  if (provider === "google") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
        systemInstruction: { parts: [{ text: NORMALIZE_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userMsg }] }],
      }),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(`gemini_error:${resp.status}`);
    resultText = json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("") || "";
  } else {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        max_tokens: 2048,
        messages: [
          { role: "system", content: NORMALIZE_PROMPT },
          { role: "user", content: userMsg },
        ],
      }),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(`openai_error:${resp.status}`);
    resultText = json?.choices?.[0]?.message?.content?.trim() || "";
  }

  const jsonMatch = resultText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("ai_parse_error");
  return JSON.parse(jsonMatch[0]);
}

async function scrapePrice(searchTerm: string): Promise<{
  source: string;
  prices: number[];
  medianPrice: number;
  lowestPrice: number;
  url: string;
}> {
  const source = SEARCH_SOURCES[0];
  const url = source.urlTemplate(searchTerm);

  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!resp.ok) {
      console.warn(`Scrape failed for "${searchTerm}": HTTP ${resp.status}`);
      return { source: source.name, prices: [], medianPrice: 0, lowestPrice: 0, url };
    }

    const html = await resp.text();

    // Extract prices - look for fraction values
    const fractionMatches = [...html.matchAll(source.priceRegex)];
    const prices: number[] = [];

    for (const match of fractionMatches) {
      const priceStr = match[1].replace(/\./g, "");
      const price = parseFloat(priceStr);
      if (price > 5 && price < 50000) { // sanity bounds
        prices.push(price);
      }
    }

    // Remove duplicates and sponsored (first 2 results often are ads)
    const uniquePrices = [...new Set(prices)];
    const filteredPrices = uniquePrices.length > 4
      ? uniquePrices.slice(2) // skip first 2 (likely sponsored)
      : uniquePrices;

    if (filteredPrices.length === 0) {
      return { source: source.name, prices: [], medianPrice: 0, lowestPrice: 0, url };
    }

    const sorted = [...filteredPrices].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const lowest = sorted[0];

    return {
      source: source.name,
      prices: sorted.slice(0, 5), // top 5 lowest
      medianPrice: median,
      lowestPrice: lowest,
      url,
    };
  } catch (err) {
    console.error(`Scrape error for "${searchTerm}":`, err);
    return { source: source.name, prices: [], medianPrice: 0, lowestPrice: 0, url };
  }
}

function applyRegionalAdjustment(basePrice: number): number {
  const frete = basePrice * (REGIONAL_CONFIG.fretePercent / 100);
  const conveniencia = basePrice * (REGIONAL_CONFIG.convenienciaPercent / 100);
  return Math.round((basePrice + frete + conveniencia) * 100) / 100;
}

function classifyDifference(budgetPrice: number, marketPrice: number): {
  status: "justo" | "atencao" | "sobrepreco";
  diffPercent: number;
  suggestedPrice: number;
} {
  if (marketPrice <= 0 || budgetPrice <= 0) {
    return { status: "justo", diffPercent: 0, suggestedPrice: budgetPrice };
  }

  const diffPercent = ((budgetPrice - marketPrice) / marketPrice) * 100;

  if (diffPercent > REGIONAL_CONFIG.margemCritica) {
    return { status: "sobrepreco", diffPercent: Math.round(diffPercent), suggestedPrice: marketPrice };
  }
  if (diffPercent > REGIONAL_CONFIG.margemSeguranca) {
    return { status: "atencao", diffPercent: Math.round(diffPercent), suggestedPrice: marketPrice };
  }
  return { status: "justo", diffPercent: Math.round(diffPercent), suggestedPrice: budgetPrice };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { budgetId, items, vehicleInfo } = await req.json();

    if (!budgetId || !items || !Array.isArray(items)) {
      return new Response(JSON.stringify({ error: "budgetId and items[] required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(supabaseUrl, serviceKey);

    // 1. Get AI key
    const { apiKey, provider } = await getAIKey(service);
    console.log(`[auditt-price-audit] Using ${provider} for normalization`);

    // 2. Create audit record as "processing"
    const cpId = items[0]?.customer_product_id || "unknown";
    const { data: auditRecord, error: insertErr } = await service
      .from("fleet_budget_audit_results")
      .insert({
        budget_id: budgetId,
        customer_product_id: cpId,
        status: "processing",
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Insert audit record error:", insertErr);
      throw insertErr;
    }

    // 3. Normalize item names with AI
    const budgetItems = items.map((i: any) => ({
      descricao: i.descricao,
      tipo: i.tipo,
      valorUnitario: i.valorUnitario || 0,
      valorTotal: i.valorTotal || 0,
      qtd: i.qtd || 1,
      code: i.code || "",
    }));

    let normalizedItems: Array<{ original: string; searchTerm: string; category: string }>;
    try {
      normalizedItems = await normalizeItemsWithAI(
        budgetItems.map(i => ({ descricao: i.descricao, tipo: i.tipo })),
        apiKey,
        provider
      );
    } catch (aiErr) {
      console.error("AI normalization failed:", aiErr);
      // Fallback: use descriptions as-is
      normalizedItems = budgetItems.map(i => ({
        original: i.descricao,
        searchTerm: i.descricao.toLowerCase().replace(/[^a-záàâãéèêíóôõúüç\s]/gi, "").trim(),
        category: i.tipo === "mao_de_obra" || i.tipo === "MECÂNICA" ? "servico" : "peca",
      }));
    }

    console.log(`[auditt-price-audit] Normalized ${normalizedItems.length} items`);

    // 4. Scrape prices for parts only (not services)
    const auditItems: any[] = [];
    let totalOrcamento = 0;
    let totalMercado = 0;
    let economiaPotencial = 0;

    for (let i = 0; i < normalizedItems.length; i++) {
      const normalized = normalizedItems[i];
      const budgetItem = budgetItems[i] || {};
      const budgetPrice = budgetItem.valorUnitario || 0;
      const budgetTotal = budgetItem.valorTotal || budgetPrice * (budgetItem.qtd || 1);

      totalOrcamento += budgetTotal;

      if (normalized.category === "servico") {
        auditItems.push({
          descricao: normalized.original,
          searchTerm: normalized.searchTerm,
          category: "servico",
          budgetPrice,
          budgetTotal,
          qtd: budgetItem.qtd || 1,
          code: budgetItem.code,
          marketPrice: null,
          regionalPrice: null,
          status: "servico",
          diffPercent: 0,
          suggestedPrice: budgetPrice,
          scrapeData: null,
        });
        totalMercado += budgetTotal;
        continue;
      }

      // Scrape price for this part
      let vehicleSuffix = "";
      if (vehicleInfo?.marca && vehicleInfo?.modelo) {
        vehicleSuffix = ` ${vehicleInfo.marca} ${vehicleInfo.modelo}`;
      }

      const scrapeResult = await scrapePrice(normalized.searchTerm + vehicleSuffix);
      const marketBasePrice = scrapeResult.medianPrice || scrapeResult.lowestPrice;
      const regionalPrice = marketBasePrice > 0 ? applyRegionalAdjustment(marketBasePrice) : 0;

      const classification = classifyDifference(budgetPrice, regionalPrice);
      const marketTotal = regionalPrice * (budgetItem.qtd || 1);

      totalMercado += marketTotal > 0 ? marketTotal : budgetTotal;

      if (classification.status !== "justo" && budgetPrice > regionalPrice && regionalPrice > 0) {
        economiaPotencial += (budgetPrice - regionalPrice) * (budgetItem.qtd || 1);
      }

      auditItems.push({
        descricao: normalized.original,
        searchTerm: normalized.searchTerm,
        category: "peca",
        budgetPrice,
        budgetTotal,
        qtd: budgetItem.qtd || 1,
        code: budgetItem.code,
        marketPrice: marketBasePrice,
        regionalPrice,
        status: classification.status,
        diffPercent: classification.diffPercent,
        suggestedPrice: classification.suggestedPrice,
        scrapeData: {
          source: scrapeResult.source,
          lowestPrice: scrapeResult.lowestPrice,
          prices: scrapeResult.prices,
          url: scrapeResult.url,
        },
      });

      // Small delay between scrapes to be respectful
      if (i < normalizedItems.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // 5. Update audit record with results
    await service
      .from("fleet_budget_audit_results")
      .update({
        status: "completed",
        total_orcamento: totalOrcamento,
        total_mercado: totalMercado,
        economia_potencial: economiaPotencial,
        items: auditItems,
        metadata: {
          provider,
          vehicle: vehicleInfo || null,
          regional_config: REGIONAL_CONFIG,
          scraped_at: new Date().toISOString(),
          items_count: auditItems.length,
          alerts: auditItems.filter((i: any) => i.status === "sobrepreco").length,
          warnings: auditItems.filter((i: any) => i.status === "atencao").length,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", (auditRecord as any).id);

    console.log(
      `[auditt-price-audit] Completed. Budget: R$${totalOrcamento.toFixed(2)}, ` +
      `Market: R$${totalMercado.toFixed(2)}, Savings: R$${economiaPotencial.toFixed(2)}`
    );

    return new Response(
      JSON.stringify({
        ok: true,
        auditId: (auditRecord as any).id,
        totalOrcamento,
        totalMercado,
        economiaPotencial,
        items: auditItems,
        config: REGIONAL_CONFIG,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("auditt-price-audit error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "unknown_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
