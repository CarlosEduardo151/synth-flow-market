import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImportRequest {
  customer_product_id: string;
  format: "ofx" | "csv";
  file_name?: string;
  content: string; // raw text
}

interface ParsedTx {
  date: string; // YYYY-MM-DD
  amount: number; // positive number
  type: "income" | "expense";
  description: string;
}

function parseOFX(text: string): ParsedTx[] {
  const txs: ParsedTx[] = [];
  const blocks = text.split(/<STMTTRN>/i).slice(1);
  for (const block of blocks) {
    const seg = block.split(/<\/STMTTRN>/i)[0];
    const get = (tag: string) => {
      const m = seg.match(new RegExp(`<${tag}>\\s*([^<\\r\\n]+)`, "i"));
      return m ? m[1].trim() : "";
    };
    const dt = get("DTPOSTED").slice(0, 8); // YYYYMMDD
    const amt = parseFloat(get("TRNAMT").replace(",", "."));
    const memo = get("MEMO") || get("NAME") || "Transação";
    if (!dt || isNaN(amt)) continue;
    const date = `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`;
    txs.push({
      date,
      amount: Math.abs(amt),
      type: amt >= 0 ? "income" : "expense",
      description: memo,
    });
  }
  return txs;
}

function parseCSV(text: string): ParsedTx[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase());
  const idx = (names: string[]) => headers.findIndex((h) => names.some((n) => h.includes(n)));
  const iDate = idx(["data", "date"]);
  const iDesc = idx(["descri", "histor", "memo", "description"]);
  const iAmt = idx(["valor", "amount", "vlr"]);
  const iType = idx(["tipo", "type"]);
  if (iDate < 0 || iAmt < 0) return [];

  const txs: ParsedTx[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep);
    const rawDate = (cols[iDate] || "").trim();
    let date = rawDate;
    // dd/mm/yyyy → yyyy-mm-dd
    const br = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (br) date = `${br[3]}-${br[2]}-${br[1]}`;
    const isoMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) date = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

    const rawAmt = (cols[iAmt] || "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
    const amt = parseFloat(rawAmt);
    if (isNaN(amt) || !date) continue;

    let type: "income" | "expense" = amt >= 0 ? "income" : "expense";
    if (iType >= 0) {
      const t = (cols[iType] || "").toLowerCase();
      if (t.includes("cred") || t.includes("rec") || t.includes("entr")) type = "income";
      else if (t.includes("deb") || t.includes("desp") || t.includes("sai")) type = "expense";
    }

    txs.push({
      date,
      amount: Math.abs(amt),
      type,
      description: (cols[iDesc] || "Transação importada").trim().slice(0, 240),
    });
  }
  return txs;
}

async function aiCategorize(txs: ParsedTx[]): Promise<ParsedTx[]> {
  const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
  if (!GROQ_API_KEY || txs.length === 0) return txs;
  try {
    const sample = txs.slice(0, 80).map((t, i) => `${i}|${t.description}`).join("\n");
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Categorize transações bancárias brasileiras. Retorne JSON {"items":[{"i":idx,"cat":"Categoria"}]}. Categorias: Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Salário, Vendas, Impostos, Marketing, Infraestrutura, Serviços, Outros.',
          },
          { role: "user", content: sample },
        ],
      }),
    });
    if (!resp.ok) return txs;
    const data = await resp.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
    const items = parsed.items || [];
    for (const it of items) {
      if (typeof it.i === "number" && txs[it.i]) {
        txs[it.i].description = `[${it.cat}] ${txs[it.i].description}`;
      }
    }
  } catch (e) {
    console.error("AI categorize failed", e);
  }
  return txs;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user?.id) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ImportRequest = await req.json();
    if (!body.customer_product_id || !body.format || !body.content) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    const { data: cp } = await supabase
      .from("customer_products")
      .select("id, user_id")
      .eq("id", body.customer_product_id)
      .maybeSingle();
    if (!cp || cp.user_id !== userRes.user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let txs: ParsedTx[] = [];
    if (body.format === "ofx") txs = parseOFX(body.content);
    else if (body.format === "csv") txs = parseCSV(body.content);

    const total = txs.length;
    if (total === 0) {
      await supabase.from("financial_agent_imports").insert({
        customer_product_id: body.customer_product_id,
        source_format: body.format,
        file_name: body.file_name || null,
        total_rows: 0,
        imported_rows: 0,
        skipped_rows: 0,
        status: "empty",
        error_message: "Nenhuma transação encontrada no arquivo",
      });
      return new Response(JSON.stringify({ ok: true, total: 0, imported: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    txs = await aiCategorize(txs);

    const rows = txs.map((t) => ({
      customer_product_id: body.customer_product_id,
      type: t.type,
      amount: t.amount,
      date: t.date,
      description: t.description,
      payment_method: "Importado",
      source: body.format.toUpperCase(),
    }));

    const { error: insErr } = await supabase.from("financial_agent_transactions").insert(rows);
    if (insErr) {
      await supabase.from("financial_agent_imports").insert({
        customer_product_id: body.customer_product_id,
        source_format: body.format,
        file_name: body.file_name || null,
        total_rows: total,
        imported_rows: 0,
        skipped_rows: total,
        status: "failed",
        error_message: insErr.message,
      });
      throw insErr;
    }

    await supabase.from("financial_agent_imports").insert({
      customer_product_id: body.customer_product_id,
      source_format: body.format,
      file_name: body.file_name || null,
      total_rows: total,
      imported_rows: rows.length,
      skipped_rows: 0,
      status: "completed",
    });

    return new Response(
      JSON.stringify({ ok: true, total, imported: rows.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("financial-import-statement error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
