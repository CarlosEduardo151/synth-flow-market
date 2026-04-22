// Etapa 2 - Agregador diário de KPIs financeiros
// Calcula: receita MTD, despesa MTD, margem líquida, burn rate, runway, ticket médio, saldo
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ReqBody {
  customer_product_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const body = (await req.json().catch(() => ({}))) as ReqBody;

    let targets: { id: string }[] = [];
    if (body.customer_product_id) {
      targets = [{ id: body.customer_product_id }];
    } else {
      const { data } = await sb
        .from("customer_products")
        .select("id")
        .eq("product_slug", "agente-financeiro")
        .eq("is_active", true);
      targets = data || [];
    }

    const out: any[] = [];
    for (const t of targets) {
      const r = await aggregateOne(sb, t.id);
      out.push({ customer_product_id: t.id, ...r });
    }
    return json(200, { ok: true, processed: targets.length, results: out });
  } catch (e) {
    console.error("kpi-aggregate error:", e);
    return json(500, { error: e instanceof Error ? e.message : "unknown" });
  }
});

async function aggregateOne(sb: any, cpId: string) {
  const today = new Date();
  const ymd = today.toISOString().slice(0, 10);
  const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const ninetyAgo = new Date();
  ninetyAgo.setDate(ninetyAgo.getDate() - 90);

  // MTD income/expense + ticket médio
  const { data: mtdTx } = await sb
    .from("financial_agent_transactions")
    .select("type, amount, date")
    .eq("customer_product_id", cpId)
    .gte("date", firstOfMonth);

  const revenue_mtd = (mtdTx || []).filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const expense_mtd = (mtdTx || []).filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const incomeTx = (mtdTx || []).filter((t: any) => t.type === "income");
  const avg_ticket = incomeTx.length > 0 ? revenue_mtd / incomeTx.length : 0;
  const net_margin_pct = revenue_mtd > 0 ? ((revenue_mtd - expense_mtd) / revenue_mtd) * 100 : 0;

  // Burn rate: média mensal de despesa nos últimos 90 dias
  const { data: burnTx } = await sb
    .from("financial_agent_transactions")
    .select("amount, date, type")
    .eq("customer_product_id", cpId)
    .eq("type", "expense")
    .gte("date", ninetyAgo.toISOString().slice(0, 10));
  const burn90 = (burnTx || []).reduce((s: number, t: any) => s + Number(t.amount), 0);
  const burn_rate_monthly = burn90 / 3;

  // Saldo de caixa: income - expense de todo o histórico
  const { data: allTx } = await sb
    .from("financial_agent_transactions")
    .select("type, amount")
    .eq("customer_product_id", cpId);
  const totalIn = (allTx || []).filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalOut = (allTx || []).filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const cash_balance = totalIn - totalOut;

  // Runway = saldo / burn rate
  const runway_months = burn_rate_monthly > 0 ? cash_balance / burn_rate_monthly : 0;

  // Receivables abertos
  const { data: recv } = await sb
    .from("financial_receivables")
    .select("total, status")
    .eq("customer_product_id", cpId)
    .in("status", ["sent", "overdue", "draft"]);
  const receivables_open = (recv || []).reduce((s: number, r: any) => s + Number(r.total || 0), 0);

  // Payables abertos
  const { data: pay } = await sb
    .from("financial_agent_invoices")
    .select("amount, paid_amount, status")
    .eq("customer_product_id", cpId)
    .in("status", ["pending", "overdue"]);
  const payables_open = (pay || []).reduce((s: number, p: any) => s + (Number(p.amount) - Number(p.paid_amount || 0)), 0);

  const snap = {
    customer_product_id: cpId,
    snapshot_date: ymd,
    revenue_mtd: round2(revenue_mtd),
    expense_mtd: round2(expense_mtd),
    net_margin_pct: round2(net_margin_pct),
    burn_rate_monthly: round2(burn_rate_monthly),
    runway_months: round2(runway_months),
    avg_ticket: round2(avg_ticket),
    cash_balance: round2(cash_balance),
    receivables_open: round2(receivables_open),
    payables_open: round2(payables_open),
    metadata: { tx_mtd: (mtdTx || []).length },
  };

  await sb.from("financial_kpi_snapshots").upsert(snap, { onConflict: "customer_product_id,snapshot_date" });

  return snap;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
