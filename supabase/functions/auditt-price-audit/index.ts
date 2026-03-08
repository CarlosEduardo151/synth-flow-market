import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO REGIONAL — IMPERATRIZ-MA (BR-010)
// ═══════════════════════════════════════════════════════════════════
const REGIONAL = {
  fretePercent: 12,
  convenienciaPercent: 8,
  margemAtencao: 30,
  margemSobrepreco: 50,
  cacheTTLHours: 168, // 7 dias — após isso re-scrape
  region: "BR-010",
};

// ═══════════════════════════════════════════════════════════════════
// SEED DATABASE — Preços conhecidos iniciais (hardcoded bootstrap)
// Após primeira execução, tudo vive no fleet_price_cache
// ═══════════════════════════════════════════════════════════════════
const SEED_PRICES: Record<string, { min: number; avg: number; max: number; cat: string }> = {
  "FLT-OL-001": { min: 25, avg: 45, max: 65, cat: "Filtros" },
  "FLT-AR-001": { min: 35, avg: 65, max: 95, cat: "Filtros" },
  "FLT-CB-001": { min: 50, avg: 85, max: 125, cat: "Filtros" },
  "FLT-SEP-001": { min: 70, avg: 120, max: 175, cat: "Filtros" },
  "OLE-001": { min: 18, avg: 32, max: 48, cat: "Óleos" },
  "OLE-002": { min: 28, avg: 48, max: 72, cat: "Óleos" },
  "OLE-003": { min: 12, avg: 22, max: 35, cat: "Óleos" },
  "PAS-001": { min: 95, avg: 180, max: 270, cat: "Freios" },
  "DIS-001": { min: 170, avg: 320, max: 480, cat: "Freios" },
  "DIS-002": { min: 150, avg: 290, max: 435, cat: "Freios" },
  "LON-001": { min: 130, avg: 250, max: 375, cat: "Freios" },
  "TAM-001": { min: 200, avg: 380, max: 570, cat: "Freios" },
  "AMO-001": { min: 240, avg: 450, max: 675, cat: "Suspensão" },
  "AMO-002": { min: 200, avg: 380, max: 570, cat: "Suspensão" },
  "MOL-001": { min: 500, avg: 950, max: 1425, cat: "Suspensão" },
  "PIV-001": { min: 120, avg: 220, max: 330, cat: "Suspensão" },
  "TER-001": { min: 95, avg: 180, max: 270, cat: "Suspensão" },
  "KIT-RET-001": { min: 2500, avg: 4800, max: 6500, cat: "Motor" },
  "PIS-001": { min: 950, avg: 1800, max: 2700, cat: "Motor" },
  "ANE-001": { min: 340, avg: 650, max: 975, cat: "Motor" },
  "BRZ-BIE-001": { min: 200, avg: 380, max: 570, cat: "Motor" },
  "BRZ-MAN-001": { min: 220, avg: 420, max: 630, cat: "Motor" },
  "VIR-001": { min: 1800, avg: 3500, max: 5000, cat: "Motor" },
  "CAB-001": { min: 2200, avg: 4200, max: 5800, cat: "Motor" },
  "JNT-CAB-001": { min: 150, avg: 280, max: 420, cat: "Motor" },
  "JNT-KIT-001": { min: 450, avg: 850, max: 1275, cat: "Motor" },
  "CMD-001": { min: 950, avg: 1800, max: 2700, cat: "Motor" },
  "VOL-001": { min: 650, avg: 1200, max: 1800, cat: "Motor" },
  "BOM-OLE-001": { min: 280, avg: 520, max: 780, cat: "Motor" },
  "COR-001": { min: 200, avg: 380, max: 570, cat: "Motor" },
  "RAD-001": { min: 470, avg: 890, max: 1335, cat: "Arrefecimento" },
  "BOM-001": { min: 150, avg: 280, max: 420, cat: "Arrefecimento" },
  "BIC-001": { min: 240, avg: 450, max: 675, cat: "Injeção" },
  "BOM-COMB-001": { min: 2000, avg: 3800, max: 5200, cat: "Injeção" },
  "TUR-001": { min: 1700, avg: 3200, max: 4500, cat: "Turbo" },
  "TUR-002": { min: 3000, avg: 5800, max: 7800, cat: "Turbo" },
  "EMB-KIT": { min: 650, avg: 1200, max: 1800, cat: "Transmissão" },
  "EMB-VOL": { min: 1500, avg: 2800, max: 4000, cat: "Transmissão" },
  "DIF-001": { min: 1200, avg: 2200, max: 3300, cat: "Transmissão" },
  "BAT-001": { min: 360, avg: 680, max: 950, cat: "Elétrica" },
  "ALT-001": { min: 350, avg: 650, max: 975, cat: "Elétrica" },
  "CXD-001": { min: 950, avg: 1800, max: 2700, cat: "Direção" },
  "CMP-001": { min: 750, avg: 1400, max: 2100, cat: "Ar-Cond" },
  "PNE-001": { min: 950, avg: 1800, max: 2500, cat: "Pneus" },
  "ESC-001": { min: 350, avg: 650, max: 975, cat: "Escapamento" },
  "PBR-001": { min: 450, avg: 850, max: 1275, cat: "Vidros" },
};

const SEED_SERVICES: Record<string, { hRef: number; tMin: number; tAvg: number; tMax: number }> = {
  "MOT-001": { hRef: 1, tMin: 60, tAvg: 100, tMax: 150 },
  "MOT-002": { hRef: 3.5, tMin: 80, tAvg: 130, tMax: 195 },
  "MOT-003": { hRef: 40, tMin: 90, tAvg: 150, tMax: 220 },
  "MOT-004": { hRef: 2.5, tMin: 70, tAvg: 120, tMax: 180 },
  "MOT-006": { hRef: 3, tMin: 70, tAvg: 120, tMax: 180 },
  "MOT-010": { hRef: 8, tMin: 80, tAvg: 140, tMax: 210 },
  "MOT-011": { hRef: 12, tMin: 95, tAvg: 160, tMax: 240 },
  "MOT-012": { hRef: 8, tMin: 90, tAvg: 150, tMax: 225 },
  "MOT-013": { hRef: 6, tMin: 90, tAvg: 150, tMax: 225 },
  "MOT-014": { hRef: 16, tMin: 90, tAvg: 150, tMax: 225 },
  "MOT-015": { hRef: 10, tMin: 85, tAvg: 140, tMax: 210 },
  "MOT-016": { hRef: 8, tMin: 85, tAvg: 140, tMax: 210 },
  "MOT-017": { hRef: 12, tMin: 90, tAvg: 150, tMax: 225 },
  "MOT-026": { hRef: 4, tMin: 70, tAvg: 120, tMax: 180 },
  "FRE-001": { hRef: 1.5, tMin: 65, tAvg: 110, tMax: 165 },
  "FRE-002": { hRef: 2, tMin: 65, tAvg: 110, tMax: 165 },
  "FRE-004": { hRef: 2.5, tMin: 65, tAvg: 110, tMax: 165 },
  "SUS-001": { hRef: 2.5, tMin: 65, tAvg: 110, tMax: 165 },
  "SUS-002": { hRef: 1, tMin: 50, tAvg: 80, tMax: 120 },
  "SUS-003": { hRef: 4, tMin: 70, tAvg: 120, tMax: 180 },
  "EMB-001": { hRef: 6, tMin: 85, tAvg: 140, tMax: 210 },
  "CAM-001": { hRef: 8, tMin: 90, tAvg: 150, tMax: 225 },
  "CAM-002": { hRef: 12, tMin: 85, tAvg: 140, tMax: 210 },
  "ELE-001": { hRef: 2, tMin: 60, tAvg: 100, tMax: 150 },
  "ELE-002": { hRef: 2, tMin: 65, tAvg: 110, tMax: 165 },
  "TUR-001S": { hRef: 5, tMin: 85, tAvg: 140, tMax: 210 },
  "ARR-001": { hRef: 3, tMin: 70, tAvg: 120, tMax: 180 },
  "DIR-001": { hRef: 4.5, tMin: 80, tAvg: 130, tMax: 195 },
  "DIF-001S": { hRef: 8, tMin: 85, tAvg: 140, tMax: 210 },
  "INJ-003": { hRef: 2, tMin: 70, tAvg: 120, tMax: 180 },
};

// ═══════════════════════════════════════════════════════════════════
// NORMALIZE — converte gírias de mecânico em termos de busca
// ═══════════════════════════════════════════════════════════════════
function normalizeSearchTerm(desc: string): string {
  return desc
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[()[\]{}"']/g, "")
    .replace(/\b(pç|pc|peca|peça)\b/gi, "")
    .replace(/\b(unid|un|und)\b/gi, "")
    .replace(/\b(orig|original|genuino|genuína)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ═══════════════════════════════════════════════════════════════════
// CACHE LAYER — Consulta cache DB, retorna hit ou null
// ═══════════════════════════════════════════════════════════════════
interface CacheHit {
  min_price: number;
  avg_price: number;
  max_fair: number;
  median_price: number;
  source: string;
  source_url: string;
  hit_count: number;
  is_fresh: boolean;
}

async function lookupCache(
  service: any,
  searchKey: string,
): Promise<CacheHit | null> {
  const { data, error } = await service
    .from("fleet_price_cache")
    .select("*")
    .eq("search_key", searchKey)
    .eq("region", REGIONAL.region)
    .maybeSingle();

  if (error || !data) return null;

  // Check freshness
  const scrapedAt = new Date(data.scraped_at).getTime();
  const now = Date.now();
  const ageHours = (now - scrapedAt) / (1000 * 60 * 60);
  const isFresh = ageHours < REGIONAL.cacheTTLHours;

  // Increment hit count
  await service
    .from("fleet_price_cache")
    .update({ hit_count: (data.hit_count || 0) + 1, last_hit_at: new Date().toISOString() })
    .eq("id", data.id);

  console.log(`[CACHE] ${isFresh ? "✅ HIT" : "⏰ STALE"} "${searchKey}" (${data.hit_count + 1} hits, age=${Math.round(ageHours)}h)`);

  return {
    min_price: data.min_price,
    avg_price: data.avg_price,
    max_fair: data.max_fair,
    median_price: data.median_price,
    source: data.source,
    source_url: data.source_url || "",
    hit_count: data.hit_count + 1,
    is_fresh: isFresh,
  };
}

async function persistToCache(
  service: any,
  searchKey: string,
  descricao: string,
  category: string,
  prices: { min: number; avg: number; max: number; median: number },
  source: string,
  sourceUrl: string,
  rawPrices: number[],
): Promise<void> {
  const record = {
    search_key: searchKey,
    descricao_original: descricao.substring(0, 200),
    category,
    min_price: prices.min,
    avg_price: prices.avg,
    max_fair: prices.max,
    median_price: prices.median,
    source,
    source_url: sourceUrl,
    raw_prices: rawPrices,
    region: REGIONAL.region,
    scraped_at: new Date().toISOString(),
    last_hit_at: new Date().toISOString(),
    hit_count: 1,
  };

  const { error } = await service
    .from("fleet_price_cache")
    .upsert(record, { onConflict: "search_key,region" });

  if (error) {
    console.error(`[CACHE] Failed to persist "${searchKey}":`, error.message);
  } else {
    console.log(`[CACHE] 💾 STORED "${searchKey}" → avg=${prices.avg} max=${prices.max}`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// SCRAPING ENGINE — Mercado Livre API
// ═══════════════════════════════════════════════════════════════════
interface ScrapeResult {
  found: boolean;
  source: string;
  prices: number[];
  lowestPrice: number;
  medianPrice: number;
  avgPrice: number;
  url: string;
}

async function scrapeFromMercadoLivre(searchTerm: string): Promise<ScrapeResult> {
  const empty: ScrapeResult = { found: false, source: "Mercado Livre", prices: [], lowestPrice: 0, medianPrice: 0, avgPrice: 0, url: "" };
  const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(searchTerm)}&category=MLB1747&sort=price_asc&limit=15`;

  try {
    const resp = await fetch(url, { headers: { Accept: "application/json" } });
    if (!resp.ok) return empty;

    const json = await resp.json();
    const results = json?.results || [];
    if (results.length === 0) return empty;

    const prices: number[] = [];
    for (const item of results) {
      if (item?.tags?.includes?.("deal_of_the_day") || item?.official_store_id) continue;
      const price = item?.price;
      if (typeof price === "number" && price > 5 && price < 100000) {
        prices.push(price);
      }
    }
    if (prices.length === 0) return empty;

    const sorted = [...prices].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const avg = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length);
    const webUrl = `https://lista.mercadolivre.com.br/${encodeURIComponent(searchTerm)}`;

    console.log(`[SCRAPE] ML found ${sorted.length} prices for "${searchTerm}": min=${sorted[0]} med=${median} avg=${avg}`);

    return { found: true, source: "Mercado Livre", prices: sorted.slice(0, 8), lowestPrice: sorted[0], medianPrice: median, avgPrice: avg, url: webUrl };
  } catch (err) {
    console.error(`[SCRAPE] ML error for "${searchTerm}":`, err);
    return empty;
  }
}

// ═══════════════════════════════════════════════════════════════════
// PRICE RESOLUTION — Cache-first, scrape-on-miss, auto-persist
// ═══════════════════════════════════════════════════════════════════
interface ResolvedPrice {
  minPrice: number;
  avgPrice: number;
  maxFair: number;
  medianPrice: number;
  source: string;
  sourceUrl: string;
  hitCount: number;
  wasScraped: boolean;
}

async function resolvePrice(
  service: any,
  code: string,
  descricao: string,
  vehicleSuffix: string,
): Promise<ResolvedPrice> {
  const noRef: ResolvedPrice = { minPrice: 0, avgPrice: 0, maxFair: 0, medianPrice: 0, source: "", sourceUrl: "", hitCount: 0, wasScraped: false };

  // ── STEP 1: Check hardcoded seed (bootstrap) ──
  const seed = SEED_PRICES[code];

  // ── STEP 2: Check DB cache by code ──
  let cached = await lookupCache(service, code);

  // ── STEP 3: If code not in cache, try normalized description ──
  const searchKey = normalizeSearchTerm(descricao);
  if (!cached && searchKey.length >= 4) {
    cached = await lookupCache(service, searchKey);
  }

  // ── STEP 4: Cache HIT and FRESH → return immediately ──
  if (cached && cached.is_fresh) {
    return {
      minPrice: cached.min_price,
      avgPrice: cached.avg_price,
      maxFair: cached.max_fair,
      medianPrice: cached.median_price,
      source: `Cache (${cached.source})`,
      sourceUrl: cached.source_url,
      hitCount: cached.hit_count,
      wasScraped: false,
    };
  }

  // ── STEP 5: Seed exists but no cache → persist seed to cache ──
  if (seed && !cached) {
    await persistToCache(service, code, descricao, seed.cat, {
      min: seed.min, avg: seed.avg, max: seed.max, median: seed.avg,
    }, "Base Regional BR-010 (seed)", "", []);

    // Don't return yet — also try scraping to get live data
  }

  // ── STEP 6: SCRAPE — peça nunca vista OU cache expirado ──
  if (searchKey.length >= 4) {
    const fullSearch = vehicleSuffix ? `${searchKey} ${vehicleSuffix}` : searchKey;
    const scraped = await scrapeFromMercadoLivre(fullSearch);

    if (scraped.found && scraped.medianPrice > 0) {
      // Calculate max_fair = median + 50% (generous ceiling)
      const maxFair = Math.round(scraped.medianPrice * 1.5);
      const minP = scraped.lowestPrice;

      // Merge with seed if available for better accuracy
      const finalAvg = seed ? Math.round((seed.avg + scraped.avgPrice) / 2) : scraped.avgPrice;
      const finalMax = seed ? Math.max(seed.max, maxFair) : maxFair;
      const finalMin = seed ? Math.min(seed.min, minP) : minP;

      // Persist to cache (auto-index!)
      await persistToCache(service, searchKey, descricao, seed?.cat || "auto", {
        min: finalMin, avg: finalAvg, max: finalMax, median: scraped.medianPrice,
      }, "Mercado Livre (ao vivo)", scraped.url, scraped.prices);

      // Also persist by code for future direct lookups
      if (code && code !== searchKey) {
        await persistToCache(service, code, descricao, seed?.cat || "auto", {
          min: finalMin, avg: finalAvg, max: finalMax, median: scraped.medianPrice,
        }, "Mercado Livre (ao vivo)", scraped.url, scraped.prices);
      }

      return {
        minPrice: finalMin,
        avgPrice: finalAvg,
        maxFair: finalMax,
        medianPrice: scraped.medianPrice,
        source: "Mercado Livre (ao vivo)",
        sourceUrl: scraped.url,
        hitCount: 1,
        wasScraped: true,
      };
    }

    // Scrape failed but stale cache exists → use stale
    if (cached) {
      console.log(`[RESOLVE] Using stale cache for "${code}" (scrape failed)`);
      return {
        minPrice: cached.min_price,
        avgPrice: cached.avg_price,
        maxFair: cached.max_fair,
        medianPrice: cached.median_price,
        source: `Cache expirado (${cached.source})`,
        sourceUrl: cached.source_url,
        hitCount: cached.hit_count,
        wasScraped: false,
      };
    }

    await new Promise(r => setTimeout(r, 250)); // rate limit
  }

  // ── STEP 7: Fallback to seed if nothing else worked ──
  if (seed) {
    return {
      minPrice: seed.min,
      avgPrice: seed.avg,
      maxFair: seed.max,
      medianPrice: seed.avg,
      source: "Base Regional BR-010",
      sourceUrl: "",
      hitCount: 0,
      wasScraped: false,
    };
  }

  return noRef;
}

// ═══════════════════════════════════════════════════════════════════
// AUDIT ITEM TYPES
// ═══════════════════════════════════════════════════════════════════
interface AuditItemInput {
  descricao: string;
  tipo: string;
  code: string;
  valorUnitario: number;
  valorTotal: number;
  qtd: number;
  horas?: number;
  valorHora?: number;
  refPrice?: number;
  refHora?: number;
  customer_product_id?: string;
}

interface AuditItemResult {
  descricao: string;
  code: string;
  category: "peca" | "servico";
  budgetPrice: number;
  budgetTotal: number;
  qtd: number;
  dbMinPrice: number;
  dbAvgPrice: number;
  dbMaxFair: number;
  catalogRef: number;
  scrapedPrice: number;
  scrapedSource: string;
  scrapedUrl: string;
  marketPrice: number;
  marketSource: string;
  regionalPrice: number;
  status: "justo" | "atencao" | "sobrepreco" | "sem_ref";
  diffPercent: number;
  suggestedPrice: number;
  savings: number;
  horas?: number;
  valorHora?: number;
  horasRef?: number;
  taxaRef?: number;
  cacheHits?: number;
}

// ═══════════════════════════════════════════════════════════════════
// CLASSIFY — aplica lógica de veredito
// ═══════════════════════════════════════════════════════════════════
function classify(budgetPrice: number, regionalPrice: number, maxFair: number): {
  status: "justo" | "atencao" | "sobrepreco" | "sem_ref";
  diffPercent: number;
  suggestedPrice: number;
  savings: number;
} {
  if (regionalPrice <= 0 || budgetPrice <= 0) {
    return { status: "sem_ref", diffPercent: 0, suggestedPrice: budgetPrice, savings: 0 };
  }

  const diffPercent = Math.round(((budgetPrice - regionalPrice) / regionalPrice) * 100);

  // Check against absolute ceiling first
  if (maxFair > 0 && budgetPrice > maxFair) {
    const overMax = Math.round(((budgetPrice - maxFair) / maxFair) * 100);
    return {
      status: overMax > 20 ? "sobrepreco" : "atencao",
      diffPercent,
      suggestedPrice: regionalPrice,
      savings: budgetPrice - regionalPrice,
    };
  }

  // Then check % margins
  if (diffPercent > REGIONAL.margemSobrepreco) {
    return { status: "sobrepreco", diffPercent, suggestedPrice: regionalPrice, savings: budgetPrice - regionalPrice };
  }
  if (diffPercent > REGIONAL.margemAtencao) {
    return { status: "atencao", diffPercent, suggestedPrice: regionalPrice, savings: budgetPrice - regionalPrice };
  }

  return { status: "justo", diffPercent, suggestedPrice: budgetPrice, savings: 0 };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { budgetId, items, vehicleInfo } = await req.json();

    if (!budgetId || !items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "budgetId and items[] required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(supabaseUrl, serviceKey);

    console.log(`[VERO] 🔍 Starting audit for budget ${budgetId} — ${items.length} items`);

    // Create audit record
    const cpId = items[0]?.customer_product_id || "unknown";
    const { data: auditRecord, error: insertErr } = await service
      .from("fleet_budget_audit_results")
      .insert({ budget_id: budgetId, customer_product_id: cpId, status: "processing" })
      .select()
      .single();

    if (insertErr) throw insertErr;

    const vehicleSuffix = vehicleInfo?.marca ? vehicleInfo.marca.toLowerCase() : "";
    const auditResults: AuditItemResult[] = [];
    let totalOrcamento = 0;
    let totalMercado = 0;
    let economiaPotencial = 0;
    let cacheHits = 0;
    let scrapeCount = 0;

    for (const item of items as AuditItemInput[]) {
      const isPeca = item.tipo === "PEÇAS" || item.tipo === "peca";

      if (isPeca) {
        // ── PEÇA: Resolve price via cache-first architecture ──
        const resolved = await resolvePrice(service, item.code, item.descricao, vehicleSuffix);

        if (resolved.wasScraped) scrapeCount++;
        if (resolved.hitCount > 1) cacheHits++;

        const budgetPrice = item.valorUnitario;
        const marketPrice = resolved.avgPrice;
        const regionalPrice = marketPrice > 0
          ? Math.round(marketPrice * (1 + REGIONAL.fretePercent / 100 + REGIONAL.convenienciaPercent / 100) * 100) / 100
          : 0;

        const verdict = classify(budgetPrice, regionalPrice, resolved.maxFair);

        const result: AuditItemResult = {
          descricao: item.descricao,
          code: item.code,
          category: "peca",
          budgetPrice,
          budgetTotal: item.valorTotal,
          qtd: item.qtd,
          dbMinPrice: resolved.minPrice,
          dbAvgPrice: resolved.avgPrice,
          dbMaxFair: resolved.maxFair,
          catalogRef: item.refPrice || 0,
          scrapedPrice: resolved.wasScraped ? resolved.medianPrice : 0,
          scrapedSource: resolved.wasScraped ? resolved.source : "",
          scrapedUrl: resolved.sourceUrl,
          marketPrice,
          marketSource: resolved.source || "Sem referência",
          regionalPrice,
          ...verdict,
          savings: Math.max(0, verdict.savings),
          cacheHits: resolved.hitCount,
        };

        totalOrcamento += result.budgetTotal;
        totalMercado += regionalPrice > 0 ? regionalPrice * result.qtd : result.budgetTotal;
        economiaPotencial += Math.max(0, result.savings) * result.qtd;
        auditResults.push(result);

      } else {
        // ── SERVIÇO: Seed-based + cache ──
        const horas = item.horas || 0;
        const valorHora = item.valorHora || 0;
        const budgetPrice = horas * valorHora;
        const code = item.code;

        const svc = SEED_SERVICES[code];
        const horasRef = svc?.hRef || 0;
        const taxaMedia = svc?.tAvg || 0;
        const taxaMaxFair = svc?.tMax || 0;
        const taxaRef = item.refHora || 0;

        let refTaxa = taxaMedia > 0 ? taxaMedia : (taxaRef > 0 ? taxaRef : 0);
        let marketSource = taxaMedia > 0 ? "Base Regional BR-010" : (taxaRef > 0 ? "Catálogo Auditt" : "");

        const marketPrice = refTaxa > 0 && horasRef > 0 ? refTaxa * horasRef : refTaxa * horas;
        const regionalPrice = marketPrice;

        let verdict = classify(budgetPrice, regionalPrice, 0);

        // Special check: hourly rate specifically
        if (taxaMaxFair > 0 && valorHora > taxaMaxFair) {
          const overRate = Math.round(((valorHora - taxaMaxFair) / taxaMaxFair) * 100);
          verdict.status = overRate > 20 ? "sobrepreco" : "atencao";
          verdict.suggestedPrice = refTaxa * horas;
          verdict.savings = budgetPrice - verdict.suggestedPrice;
        }

        const result: AuditItemResult = {
          descricao: item.descricao,
          code,
          category: "servico",
          budgetPrice,
          budgetTotal: item.valorTotal,
          qtd: item.qtd,
          dbMinPrice: 0,
          dbAvgPrice: taxaMedia * (horasRef || horas),
          dbMaxFair: taxaMaxFair * (horasRef || horas),
          catalogRef: taxaRef * horas,
          scrapedPrice: 0,
          scrapedSource: "",
          scrapedUrl: "",
          marketPrice,
          marketSource,
          regionalPrice,
          ...verdict,
          savings: Math.max(0, verdict.savings),
          horas,
          valorHora,
          horasRef,
          taxaRef: refTaxa,
        };

        totalOrcamento += result.budgetTotal;
        totalMercado += regionalPrice > 0 ? regionalPrice * result.qtd : result.budgetTotal;
        economiaPotencial += Math.max(0, result.savings) * result.qtd;
        auditResults.push(result);
      }

      // Log each item
      const r = auditResults[auditResults.length - 1];
      console.log(
        `[VERO] ${r.code} "${r.descricao.slice(0, 25)}" → ` +
        `orç=${r.budgetPrice} mkt=${r.marketPrice} reg=${r.regionalPrice} ` +
        `→ ${r.status} (${r.diffPercent}%)`
      );
    }

    // Persist final results
    const alertCount = auditResults.filter(r => r.status === "sobrepreco").length;
    const warningCount = auditResults.filter(r => r.status === "atencao").length;

    await service
      .from("fleet_budget_audit_results")
      .update({
        status: "completed",
        total_orcamento: totalOrcamento,
        total_mercado: totalMercado,
        economia_potencial: economiaPotencial,
        items: auditResults,
        metadata: {
          vehicle: vehicleInfo || null,
          regional_config: REGIONAL,
          scraped_at: new Date().toISOString(),
          items_count: auditResults.length,
          alerts: alertCount,
          warnings: warningCount,
          cache_hits: cacheHits,
          scrape_count: scrapeCount,
          sources_used: [...new Set(auditResults.map(r => r.marketSource).filter(Boolean))],
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", (auditRecord as any).id);

    console.log(
      `[VERO] ✅ Done! Orç: R$${totalOrcamento.toFixed(2)} | Mkt: R$${totalMercado.toFixed(2)} | ` +
      `Economia: R$${economiaPotencial.toFixed(2)} | 🔴${alertCount} 🟡${warningCount} | ` +
      `Cache: ${cacheHits} hits, ${scrapeCount} scrapes`
    );

    return new Response(
      JSON.stringify({
        ok: true,
        auditId: (auditRecord as any).id,
        totalOrcamento,
        totalMercado,
        economiaPotencial,
        items: auditResults,
        config: REGIONAL,
        alerts: alertCount,
        warnings: warningCount,
        stats: { cacheHits, scrapeCount, totalItems: items.length },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[VERO] ERROR:", err);
    return new Response(
      JSON.stringify({ error: err.message || "unknown_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
