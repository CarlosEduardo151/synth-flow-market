import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════════
// BASE DE PREÇOS REGIONAIS — BR-010 / IMPERATRIZ-MA
// Valores médios de mercado para peças de veículos pesados e leves
// Fonte: levantamento regional + catálogos públicos (2024/2025)
// ═══════════════════════════════════════════════════════════════════
const PRICE_DATABASE: Record<string, {
  minPrice: number;   // menor preço encontrado no mercado
  avgPrice: number;   // preço médio de mercado
  maxFair: number;    // teto considerado justo (com margem regional)
  category: string;   // categoria para agrupamento
}> = {
  // ── FILTROS ──
  "FLT-OL-001": { minPrice: 25, avgPrice: 45, maxFair: 65, category: "Filtros" },
  "FLT-AR-001": { minPrice: 35, avgPrice: 65, maxFair: 95, category: "Filtros" },
  "FLT-CB-001": { minPrice: 50, avgPrice: 85, maxFair: 125, category: "Filtros" },
  "FLT-SEP-001": { minPrice: 70, avgPrice: 120, maxFair: 175, category: "Filtros" },

  // ── ÓLEOS E FLUIDOS ──
  "OLE-001": { minPrice: 18, avgPrice: 32, maxFair: 48, category: "Óleos" },
  "OLE-002": { minPrice: 28, avgPrice: 48, maxFair: 72, category: "Óleos" },
  "OLE-003": { minPrice: 12, avgPrice: 22, maxFair: 35, category: "Óleos" },

  // ── FREIOS ──
  "PAS-001": { minPrice: 95, avgPrice: 180, maxFair: 270, category: "Freios" },
  "DIS-001": { minPrice: 170, avgPrice: 320, maxFair: 480, category: "Freios" },
  "DIS-002": { minPrice: 150, avgPrice: 290, maxFair: 435, category: "Freios" },
  "LON-001": { minPrice: 130, avgPrice: 250, maxFair: 375, category: "Freios" },
  "TAM-001": { minPrice: 200, avgPrice: 380, maxFair: 570, category: "Freios" },

  // ── SUSPENSÃO ──
  "AMO-001": { minPrice: 240, avgPrice: 450, maxFair: 675, category: "Suspensão" },
  "AMO-002": { minPrice: 200, avgPrice: 380, maxFair: 570, category: "Suspensão" },
  "MOL-001": { minPrice: 500, avgPrice: 950, maxFair: 1425, category: "Suspensão" },
  "PIV-001": { minPrice: 120, avgPrice: 220, maxFair: 330, category: "Suspensão" },
  "TER-001": { minPrice: 95, avgPrice: 180, maxFair: 270, category: "Suspensão" },

  // ── MOTOR — RETÍFICA ──
  "KIT-RET-001": { minPrice: 2500, avgPrice: 4800, maxFair: 6500, category: "Motor" },
  "PIS-001": { minPrice: 950, avgPrice: 1800, maxFair: 2700, category: "Motor" },
  "ANE-001": { minPrice: 340, avgPrice: 650, maxFair: 975, category: "Motor" },
  "BRZ-BIE-001": { minPrice: 200, avgPrice: 380, maxFair: 570, category: "Motor" },
  "BRZ-MAN-001": { minPrice: 220, avgPrice: 420, maxFair: 630, category: "Motor" },
  "VIR-001": { minPrice: 1800, avgPrice: 3500, maxFair: 5000, category: "Motor" },
  "CAB-001": { minPrice: 2200, avgPrice: 4200, maxFair: 5800, category: "Motor" },
  "JNT-CAB-001": { minPrice: 150, avgPrice: 280, maxFair: 420, category: "Motor" },
  "JNT-KIT-001": { minPrice: 450, avgPrice: 850, maxFair: 1275, category: "Motor" },
  "CMD-001": { minPrice: 950, avgPrice: 1800, maxFair: 2700, category: "Motor" },
  "VOL-001": { minPrice: 650, avgPrice: 1200, maxFair: 1800, category: "Motor" },
  "BOM-OLE-001": { minPrice: 280, avgPrice: 520, maxFair: 780, category: "Motor" },
  "COR-001": { minPrice: 200, avgPrice: 380, maxFair: 570, category: "Motor" },

  // ── ARREFECIMENTO ──
  "RAD-001": { minPrice: 470, avgPrice: 890, maxFair: 1335, category: "Arrefecimento" },
  "BOM-001": { minPrice: 150, avgPrice: 280, maxFair: 420, category: "Arrefecimento" },

  // ── INJEÇÃO / TURBO ──
  "BIC-001": { minPrice: 240, avgPrice: 450, maxFair: 675, category: "Injeção" },
  "BOM-COMB-001": { minPrice: 2000, avgPrice: 3800, maxFair: 5200, category: "Injeção" },
  "TUR-001": { minPrice: 1700, avgPrice: 3200, maxFair: 4500, category: "Turbo" },
  "TUR-002": { minPrice: 3000, avgPrice: 5800, maxFair: 7800, category: "Turbo" },

  // ── TRANSMISSÃO ──
  "EMB-KIT": { minPrice: 650, avgPrice: 1200, maxFair: 1800, category: "Transmissão" },
  "EMB-VOL": { minPrice: 1500, avgPrice: 2800, maxFair: 4000, category: "Transmissão" },
  "DIF-001": { minPrice: 1200, avgPrice: 2200, maxFair: 3300, category: "Transmissão" },

  // ── ELÉTRICA ──
  "BAT-001": { minPrice: 360, avgPrice: 680, maxFair: 950, category: "Elétrica" },
  "ALT-001": { minPrice: 350, avgPrice: 650, maxFair: 975, category: "Elétrica" },

  // ── DIREÇÃO / AR ──
  "CXD-001": { minPrice: 950, avgPrice: 1800, maxFair: 2700, category: "Direção" },
  "CMP-001": { minPrice: 750, avgPrice: 1400, maxFair: 2100, category: "Ar-Cond" },

  // ── PNEUS / EXTERIOR ──
  "PNE-001": { minPrice: 950, avgPrice: 1800, maxFair: 2500, category: "Pneus" },
  "ESC-001": { minPrice: 350, avgPrice: 650, maxFair: 975, category: "Escapamento" },
  "PBR-001": { minPrice: 450, avgPrice: 850, maxFair: 1275, category: "Vidros" },
};

// ── Serviços: horas × taxa referência ──
const SERVICE_DATABASE: Record<string, {
  horasRef: number;
  taxaMinima: number;
  taxaMedia: number;
  taxaMaxFair: number;
}> = {
  "MOT-001": { horasRef: 1, taxaMinima: 60, taxaMedia: 100, taxaMaxFair: 150 },
  "MOT-002": { horasRef: 3.5, taxaMinima: 80, taxaMedia: 130, taxaMaxFair: 195 },
  "MOT-003": { horasRef: 40, taxaMinima: 90, taxaMedia: 150, taxaMaxFair: 220 },
  "MOT-004": { horasRef: 2.5, taxaMinima: 70, taxaMedia: 120, taxaMaxFair: 180 },
  "MOT-006": { horasRef: 3, taxaMinima: 70, taxaMedia: 120, taxaMaxFair: 180 },
  "MOT-010": { horasRef: 8, taxaMinima: 80, taxaMedia: 140, taxaMaxFair: 210 },
  "MOT-011": { horasRef: 12, taxaMinima: 95, taxaMedia: 160, taxaMaxFair: 240 },
  "MOT-012": { horasRef: 8, taxaMinima: 90, taxaMedia: 150, taxaMaxFair: 225 },
  "MOT-013": { horasRef: 6, taxaMinima: 90, taxaMedia: 150, taxaMaxFair: 225 },
  "MOT-014": { horasRef: 16, taxaMinima: 90, taxaMedia: 150, taxaMaxFair: 225 },
  "MOT-015": { horasRef: 10, taxaMinima: 85, taxaMedia: 140, taxaMaxFair: 210 },
  "MOT-016": { horasRef: 8, taxaMinima: 85, taxaMedia: 140, taxaMaxFair: 210 },
  "MOT-017": { horasRef: 12, taxaMinima: 90, taxaMedia: 150, taxaMaxFair: 225 },
  "MOT-026": { horasRef: 4, taxaMinima: 70, taxaMedia: 120, taxaMaxFair: 180 },
  "FRE-001": { horasRef: 1.5, taxaMinima: 65, taxaMedia: 110, taxaMaxFair: 165 },
  "FRE-002": { horasRef: 2, taxaMinima: 65, taxaMedia: 110, taxaMaxFair: 165 },
  "FRE-004": { horasRef: 2.5, taxaMinima: 65, taxaMedia: 110, taxaMaxFair: 165 },
  "SUS-001": { horasRef: 2.5, taxaMinima: 65, taxaMedia: 110, taxaMaxFair: 165 },
  "SUS-002": { horasRef: 1, taxaMinima: 50, taxaMedia: 80, taxaMaxFair: 120 },
  "SUS-003": { horasRef: 4, taxaMinima: 70, taxaMedia: 120, taxaMaxFair: 180 },
  "EMB-001": { horasRef: 6, taxaMinima: 85, taxaMedia: 140, taxaMaxFair: 210 },
  "CAM-001": { horasRef: 8, taxaMinima: 90, taxaMedia: 150, taxaMaxFair: 225 },
  "CAM-002": { horasRef: 12, taxaMinima: 85, taxaMedia: 140, taxaMaxFair: 210 },
  "ELE-001": { horasRef: 2, taxaMinima: 60, taxaMedia: 100, taxaMaxFair: 150 },
  "ELE-002": { horasRef: 2, taxaMinima: 65, taxaMedia: 110, taxaMaxFair: 165 },
  "TUR-001S": { horasRef: 5, taxaMinima: 85, taxaMedia: 140, taxaMaxFair: 210 },
  "ARR-001": { horasRef: 3, taxaMinima: 70, taxaMedia: 120, taxaMaxFair: 180 },
  "DIR-001": { horasRef: 4.5, taxaMinima: 80, taxaMedia: 130, taxaMaxFair: 195 },
  "DIF-001S": { horasRef: 8, taxaMinima: 85, taxaMedia: 140, taxaMaxFair: 210 },
  "INJ-003": { horasRef: 2, taxaMinima: 70, taxaMedia: 120, taxaMaxFair: 180 },
};

// ═══════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO REGIONAL — IMPERATRIZ-MA (BR-010)
// ═══════════════════════════════════════════════════════════════════
const REGIONAL = {
  fretePercent: 12,         // frete estimado SP→Imperatriz
  convenienciaPercent: 8,   // margem para pronta-entrega local
  margemAtencao: 30,        // acima de 30% do teto justo → amarelo
  margemSobrepreco: 50,     // acima de 50% do teto justo → vermelho
};

// ═══════════════════════════════════════════════════════════════════
// MOTOR DE SCRAPING — Múltiplas fontes com fallback
// ═══════════════════════════════════════════════════════════════════

interface ScrapeResult {
  found: boolean;
  source: string;
  prices: number[];
  lowestPrice: number;
  medianPrice: number;
  url: string;
}

async function scrapeFromMercadoLivre(searchTerm: string): Promise<ScrapeResult> {
  const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(searchTerm)}&category=MLB1747&sort=price_asc&limit=10`;

  try {
    const resp = await fetch(url, {
      headers: { "Accept": "application/json" },
    });

    if (!resp.ok) {
      console.warn(`[ML-API] HTTP ${resp.status} for "${searchTerm}"`);
      return { found: false, source: "Mercado Livre", prices: [], lowestPrice: 0, medianPrice: 0, url };
    }

    const json = await resp.json();
    const results = json?.results || [];

    if (results.length === 0) {
      console.warn(`[ML-API] No results for "${searchTerm}"`);
      return { found: false, source: "Mercado Livre", prices: [], lowestPrice: 0, medianPrice: 0, url };
    }

    // Extract prices, skip first result (often sponsored)
    const prices: number[] = [];
    for (let i = 0; i < results.length; i++) {
      const item = results[i];
      // Skip items with "promotion" or sponsored tags
      if (item?.tags?.includes?.("deal_of_the_day") || item?.official_store_id) continue;
      const price = item?.price;
      if (typeof price === "number" && price > 5 && price < 100000) {
        prices.push(price);
      }
    }

    if (prices.length === 0) {
      return { found: false, source: "Mercado Livre", prices: [], lowestPrice: 0, medianPrice: 0, url };
    }

    const sorted = [...prices].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const webUrl = `https://lista.mercadolivre.com.br/${encodeURIComponent(searchTerm)}`;

    console.log(`[ML-API] Found ${sorted.length} prices for "${searchTerm}": min=${sorted[0]}, median=${median}`);

    return {
      found: true,
      source: "Mercado Livre",
      prices: sorted.slice(0, 5),
      lowestPrice: sorted[0],
      medianPrice: median,
      url: webUrl,
    };
  } catch (err) {
    console.error(`[ML-API] Error for "${searchTerm}":`, err);
    return { found: false, source: "Mercado Livre", prices: [], lowestPrice: 0, medianPrice: 0, url: "" };
  }
}

// ═══════════════════════════════════════════════════════════════════
// MOTOR DE AUDITORIA — Compara orçamento vs mercado
// ═══════════════════════════════════════════════════════════════════

interface AuditItemInput {
  descricao: string;
  tipo: string;           // "PEÇAS" or "MECÂNICA"
  code: string;           // catalog code
  valorUnitario: number;  // price per unit
  valorTotal: number;     // total price (unit * qty)
  qtd: number;
  horas?: number;
  valorHora?: number;
  refPrice?: number;      // catalog reference price
  refHora?: number;       // catalog reference hourly rate
}

interface AuditItemResult {
  descricao: string;
  code: string;
  category: "peca" | "servico";
  budgetPrice: number;
  budgetTotal: number;
  qtd: number;
  // Reference prices
  dbMinPrice: number;
  dbAvgPrice: number;
  dbMaxFair: number;
  catalogRef: number;
  // Scraped market price
  scrapedPrice: number;
  scrapedSource: string;
  scrapedUrl: string;
  // Final comparison
  marketPrice: number;    // best reference used for comparison
  marketSource: string;   // where the market price came from
  regionalPrice: number;  // market + frete + conveniência
  // Verdict
  status: "justo" | "atencao" | "sobrepreco" | "sem_ref";
  diffPercent: number;
  suggestedPrice: number;
  savings: number;        // potential savings per unit
  // For services
  horas?: number;
  valorHora?: number;
  horasRef?: number;
  taxaRef?: number;
}

function auditPartItem(item: AuditItemInput): AuditItemResult {
  const code = item.code;
  const budgetPrice = item.valorUnitario;

  // 1. Lookup in our price DB
  const dbEntry = PRICE_DATABASE[code];
  const dbMinPrice = dbEntry?.minPrice || 0;
  const dbAvgPrice = dbEntry?.avgPrice || 0;
  const dbMaxFair = dbEntry?.maxFair || 0;
  const catalogRef = item.refPrice || 0;

  // 2. Determine market reference (priority: DB avg > catalog ref > 0)
  let marketPrice = 0;
  let marketSource = "";

  if (dbAvgPrice > 0) {
    marketPrice = dbAvgPrice;
    marketSource = "Base Regional BR-010";
  } else if (catalogRef > 0) {
    marketPrice = catalogRef;
    marketSource = "Catálogo Auditt";
  }

  // 3. Apply regional adjustment
  const regionalPrice = marketPrice > 0
    ? Math.round(marketPrice * (1 + REGIONAL.fretePercent / 100 + REGIONAL.convenienciaPercent / 100) * 100) / 100
    : 0;

  // 4. Classify
  let status: "justo" | "atencao" | "sobrepreco" | "sem_ref" = "sem_ref";
  let diffPercent = 0;
  let suggestedPrice = budgetPrice;
  let savings = 0;

  if (regionalPrice > 0 && budgetPrice > 0) {
    diffPercent = Math.round(((budgetPrice - regionalPrice) / regionalPrice) * 100);

    if (dbMaxFair > 0 && budgetPrice > dbMaxFair) {
      // Above the absolute max fair ceiling
      const overMax = Math.round(((budgetPrice - dbMaxFair) / dbMaxFair) * 100);
      if (overMax > 20) {
        status = "sobrepreco";
        suggestedPrice = regionalPrice;
        savings = budgetPrice - regionalPrice;
      } else {
        status = "atencao";
        suggestedPrice = regionalPrice;
        savings = budgetPrice - regionalPrice;
      }
    } else if (diffPercent > REGIONAL.margemSobrepreco) {
      status = "sobrepreco";
      suggestedPrice = regionalPrice;
      savings = budgetPrice - regionalPrice;
    } else if (diffPercent > REGIONAL.margemAtencao) {
      status = "atencao";
      suggestedPrice = regionalPrice;
      savings = budgetPrice - regionalPrice;
    } else {
      status = "justo";
      savings = 0;
    }
  } else if (budgetPrice <= 0) {
    status = "sem_ref"; // no price entered yet
  }

  return {
    descricao: item.descricao,
    code,
    category: "peca",
    budgetPrice,
    budgetTotal: item.valorTotal,
    qtd: item.qtd,
    dbMinPrice,
    dbAvgPrice,
    dbMaxFair,
    catalogRef,
    scrapedPrice: 0,
    scrapedSource: "",
    scrapedUrl: "",
    marketPrice,
    marketSource,
    regionalPrice,
    status,
    diffPercent,
    suggestedPrice,
    savings: Math.max(0, savings),
  };
}

function auditServiceItem(item: AuditItemInput): AuditItemResult {
  const code = item.code;
  const horas = item.horas || 0;
  const valorHora = item.valorHora || 0;
  const budgetPrice = horas * valorHora;

  const svcEntry = SERVICE_DATABASE[code];
  const horasRef = svcEntry?.horasRef || 0;
  const taxaMedia = svcEntry?.taxaMedia || 0;
  const taxaMaxFair = svcEntry?.taxaMaxFair || 0;
  const taxaRef = item.refHora || 0;

  // Use DB taxa or catalog ref
  let refTaxa = 0;
  let marketSource = "";
  if (taxaMedia > 0) {
    refTaxa = taxaMedia;
    marketSource = "Base Regional BR-010";
  } else if (taxaRef > 0) {
    refTaxa = taxaRef;
    marketSource = "Catálogo Auditt";
  }

  const marketPrice = refTaxa > 0 && horasRef > 0 ? refTaxa * horasRef : refTaxa * horas;
  const regionalPrice = marketPrice; // services don't need freight adjustment

  let status: "justo" | "atencao" | "sobrepreco" | "sem_ref" = "sem_ref";
  let diffPercent = 0;
  let suggestedPrice = budgetPrice;
  let savings = 0;

  if (regionalPrice > 0 && budgetPrice > 0) {
    diffPercent = Math.round(((budgetPrice - regionalPrice) / regionalPrice) * 100);

    // Check hourly rate specifically
    if (taxaMaxFair > 0 && valorHora > taxaMaxFair) {
      const overRate = Math.round(((valorHora - taxaMaxFair) / taxaMaxFair) * 100);
      if (overRate > 20) {
        status = "sobrepreco";
      } else {
        status = "atencao";
      }
      suggestedPrice = refTaxa * horas;
      savings = budgetPrice - suggestedPrice;
    } else if (diffPercent > REGIONAL.margemSobrepreco) {
      status = "sobrepreco";
      suggestedPrice = regionalPrice;
      savings = budgetPrice - regionalPrice;
    } else if (diffPercent > REGIONAL.margemAtencao) {
      status = "atencao";
      suggestedPrice = regionalPrice;
      savings = budgetPrice - regionalPrice;
    } else {
      status = "justo";
    }
  }

  return {
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
    status,
    diffPercent,
    suggestedPrice: Math.max(0, suggestedPrice),
    savings: Math.max(0, savings),
    horas,
    valorHora,
    horasRef,
    taxaRef: refTaxa,
  };
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

    console.log(`[auditt-audit] Starting audit for budget ${budgetId} with ${items.length} items`);

    // 1. Create/update audit record
    const cpId = items[0]?.customer_product_id || "unknown";
    const { data: auditRecord, error: insertErr } = await service
      .from("fleet_budget_audit_results")
      .insert({ budget_id: budgetId, customer_product_id: cpId, status: "processing" })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // 2. Audit each item
    const auditResults: AuditItemResult[] = [];
    let totalOrcamento = 0;
    let totalMercado = 0;
    let economiaPotencial = 0;
    const scrapeCache: Record<string, ScrapeResult> = {};

    for (const item of items as AuditItemInput[]) {
      const isPeca = item.tipo === "PEÇAS" || item.tipo === "peca";
      let result: AuditItemResult;

      if (isPeca) {
        result = auditPartItem(item);

        // 3. Try live scraping to enrich (only for parts without DB entry or to validate)
        const searchTerm = item.descricao.toLowerCase()
          .replace(/[()]/g, "")
          .replace(/\s+/g, " ")
          .trim();

        if (searchTerm.length >= 5 && !scrapeCache[searchTerm]) {
          let vSuffix = "";
          if (vehicleInfo?.marca) vSuffix = ` ${vehicleInfo.marca}`;

          const scraped = await scrapeFromMercadoLivre(searchTerm + vSuffix);
          scrapeCache[searchTerm] = scraped;

          if (scraped.found) {
            result.scrapedPrice = scraped.medianPrice;
            result.scrapedSource = scraped.source;
            result.scrapedUrl = scraped.url;

            // If we got scraped data and it's better (lower) than DB, use it
            if (result.marketPrice <= 0 || (scraped.medianPrice > 0 && scraped.medianPrice < result.marketPrice * 0.8)) {
              result.marketPrice = scraped.medianPrice;
              result.marketSource = `${scraped.source} (ao vivo)`;
              // Recalculate regional
              result.regionalPrice = Math.round(
                scraped.medianPrice * (1 + REGIONAL.fretePercent / 100 + REGIONAL.convenienciaPercent / 100) * 100
              ) / 100;

              // Re-classify
              if (result.budgetPrice > 0 && result.regionalPrice > 0) {
                result.diffPercent = Math.round(((result.budgetPrice - result.regionalPrice) / result.regionalPrice) * 100);
                if (result.diffPercent > REGIONAL.margemSobrepreco) {
                  result.status = "sobrepreco";
                  result.suggestedPrice = result.regionalPrice;
                  result.savings = result.budgetPrice - result.regionalPrice;
                } else if (result.diffPercent > REGIONAL.margemAtencao) {
                  result.status = "atencao";
                  result.suggestedPrice = result.regionalPrice;
                  result.savings = result.budgetPrice - result.regionalPrice;
                } else {
                  result.status = "justo";
                  result.savings = 0;
                }
              }
            }
          }

          // Respectful delay between scrapes
          await new Promise(r => setTimeout(r, 300));
        } else if (scrapeCache[searchTerm]?.found) {
          const cached = scrapeCache[searchTerm];
          result.scrapedPrice = cached.medianPrice;
          result.scrapedSource = cached.source;
          result.scrapedUrl = cached.url;
        }
      } else {
        result = auditServiceItem(item);
      }

      totalOrcamento += result.budgetTotal;
      totalMercado += result.regionalPrice > 0
        ? result.regionalPrice * result.qtd
        : result.budgetTotal;
      economiaPotencial += result.savings * result.qtd;

      auditResults.push(result);

      console.log(
        `[auditt-audit] ${result.code} "${result.descricao.slice(0, 30)}" → ` +
        `budget=${result.budgetPrice} market=${result.marketPrice} regional=${result.regionalPrice} ` +
        `status=${result.status} diff=${result.diffPercent}%`
      );
    }

    // 4. Persist results
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
          sources_used: [...new Set(auditResults.map(r => r.marketSource).filter(Boolean))],
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", (auditRecord as any).id);

    console.log(
      `[auditt-audit] ✅ Done. Orçamento: R$${totalOrcamento.toFixed(2)} | ` +
      `Mercado: R$${totalMercado.toFixed(2)} | Economia: R$${economiaPotencial.toFixed(2)} | ` +
      `🔴${alertCount} 🟡${warningCount}`
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
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[auditt-audit] ERROR:", err);
    return new Response(
      JSON.stringify({ error: err.message || "unknown_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
