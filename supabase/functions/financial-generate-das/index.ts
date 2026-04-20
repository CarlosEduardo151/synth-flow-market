// Edge Function: financial-generate-das
// Gera uma guia DAS (Documento de Arrecadação do Simples Nacional) em PDF
// e armazena no bucket privado `das_guides`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ===== Tabelas Simples Nacional (Anexo I — Comércio 2024) =====
const ANEXO_I = [
  { upTo: 180000, rate: 0.04, deduct: 0 },
  { upTo: 360000, rate: 0.073, deduct: 5940 },
  { upTo: 720000, rate: 0.095, deduct: 13860 },
  { upTo: 1800000, rate: 0.107, deduct: 22500 },
  { upTo: 3600000, rate: 0.143, deduct: 87300 },
  { upTo: 4800000, rate: 0.19, deduct: 378000 },
];

const MEI_AMOUNTS: Record<string, number> = {
  comercio: 71.6,
  servicos: 75.6,
  transporte: 80.6,
};

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function calcSimples(revenue12m: number, revenueMonth: number) {
  const faixa = ANEXO_I.find((f) => revenue12m <= f.upTo) ?? ANEXO_I[ANEXO_I.length - 1];
  const aliquotaEfetiva = (revenue12m * faixa.rate - faixa.deduct) / Math.max(revenue12m, 1);
  const das = Math.max(revenueMonth * aliquotaEfetiva, 0);
  const breakdown = {
    IRPJ: das * 0.055,
    CSLL: das * 0.035,
    COFINS: das * 0.127,
    PIS: das * 0.0276,
    CPP: das * 0.415,
    ICMS: das * 0.34,
  };
  return { faixa, aliquotaEfetiva, das, breakdown };
}

function calcMEI(activity: string) {
  const total = MEI_AMOUNTS[activity] ?? MEI_AMOUNTS.comercio;
  const iss = activity === "servicos" ? 5 : 0;
  const icms = activity === "comercio" ? 1 : activity === "transporte" ? 6 : 0;
  const inss = total - iss - icms;
  return { total, breakdown: { INSS: inss, ISS: iss, ICMS: icms } };
}

// "Código de barras" interno (não-oficial). Para guias oficiais use o PGDAS-D.
function generateBarcode(cp: string, year: number, month: number, amount: number) {
  const cents = Math.round(amount * 100).toString().padStart(10, "0");
  const period = `${year}${String(month).padStart(2, "0")}`;
  const cpShort = cp.replace(/-/g, "").slice(0, 12).padEnd(12, "0");
  return `85890000${cents}${period}${cpShort}`.slice(0, 48);
}

function generatePDF(data: {
  empresa: string;
  cnpj: string;
  regime: string;
  anexo?: string;
  competencia: string;
  vencimento: string;
  total: number;
  breakdown: Record<string, number>;
  revenueMonth: number;
  revenue12m: number;
  aliquota: number;
  barcode: string;
}): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;

  // Header faixa
  doc.setFillColor(16, 122, 87);
  doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("GUIA DAS", 12, 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Documento de Arrecadação do Simples Nacional", 12, 19);
  doc.text("Guia interna de controle - Emitida via NovaLink", 12, 24);

  // Dados empresa
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("CONTRIBUINTE", 12, 40);
  doc.setFont("helvetica", "normal");
  doc.text(`Empresa: ${data.empresa}`, 12, 46);
  doc.text(`CNPJ: ${data.cnpj}`, 12, 51);
  doc.text(`Regime: ${data.regime.toUpperCase()}${data.anexo ? ` - ${data.anexo}` : ""}`, 12, 56);

  // Competência box
  doc.setDrawColor(200);
  doc.rect(120, 36, 78, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("COMPETÊNCIA", 124, 41);
  doc.text("VENCIMENTO", 124, 51);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(data.competencia, 158, 41);
  doc.text(data.vencimento, 158, 51);

  // Faturamento
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("BASE DE CÁLCULO", 12, 72);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Faturamento do mês: ${fmtBRL(data.revenueMonth)}`, 12, 78);
  doc.text(`RBT12 (últimos 12 meses): ${fmtBRL(data.revenue12m)}`, 12, 83);
  doc.text(`Alíquota efetiva: ${(data.aliquota * 100).toFixed(3)}%`, 12, 88);

  // Breakdown
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("DETALHAMENTO DOS TRIBUTOS", 12, 100);
  doc.setDrawColor(220);
  doc.line(12, 102, 198, 102);

  let y = 109;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const [label, value] of Object.entries(data.breakdown)) {
    doc.text(label, 14, y);
    doc.text(fmtBRL(value), 196, y, { align: "right" });
    y += 6;
  }

  // Total
  doc.setDrawColor(16, 122, 87);
  doc.setLineWidth(0.5);
  doc.line(12, y + 2, 198, y + 2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(16, 122, 87);
  doc.text("TOTAL A PAGAR", 14, y + 10);
  doc.text(fmtBRL(data.total), 196, y + 10, { align: "right" });

  // Linha digitável (placeholder)
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("LINHA DIGITÁVEL", 12, y + 25);
  doc.setFont("courier", "normal");
  doc.setFontSize(10);
  const formatted = data.barcode.replace(/(.{12})/g, "$1 ").trim();
  doc.text(formatted, 12, y + 32);

  // Barcode visual (fake bars)
  let bx = 12;
  const by = y + 38;
  for (let i = 0; i < data.barcode.length; i++) {
    const c = parseInt(data.barcode[i], 10) || 0;
    const bw = 0.4 + (c % 3) * 0.3;
    doc.setFillColor(20, 20, 20);
    doc.rect(bx, by, bw, 12, "F");
    bx += bw + 0.6;
  }

  // Footer
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(
    "Este documento é uma guia interna de controle gerada pelo sistema NovaLink. " +
      "Para a guia oficial DAS, acesse o portal PGDAS-D (Receita Federal) ou o app MEI.",
    12,
    285,
    { maxWidth: 186 }
  );
  doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, 12, 292);

  return new Uint8Array(doc.output("arraybuffer"));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      customerProductId,
      regime,
      meiActivity,
      revenueMonth = 0,
      revenue12m = 0,
      empresa = "Empresa",
      cnpj = "00.000.000/0001-00",
      anexo = "Anexo I",
      competenciaMonth,
      competenciaYear,
    } = body ?? {};

    if (!customerProductId || !regime) {
      return new Response(JSON.stringify({ error: "missing_params" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verifica posse
    const { data: cp } = await admin
      .from("customer_products")
      .select("id, user_id")
      .eq("id", customerProductId)
      .maybeSingle();
    if (!cp || cp.user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cálculo
    let total = 0;
    let breakdown: Record<string, number> = {};
    let aliquota = 0;
    if (regime === "mei") {
      const r = calcMEI(meiActivity ?? "comercio");
      total = r.total;
      breakdown = r.breakdown;
    } else {
      const r = calcSimples(Number(revenue12m), Number(revenueMonth));
      total = r.das;
      breakdown = r.breakdown;
      aliquota = r.aliquotaEfetiva;
    }

    const today = new Date();
    const month = competenciaMonth ?? today.getMonth() + 1;
    const year = competenciaYear ?? today.getFullYear();
    const dueDate = new Date(year, month, 20); // dia 20 do mês seguinte
    const competenciaStr = `${String(month).padStart(2, "0")}/${year}`;
    const vencimentoStr = dueDate.toLocaleDateString("pt-BR");

    const barcode = generateBarcode(customerProductId, year, month, total);

    // PDF
    const pdfBytes = generatePDF({
      empresa,
      cnpj,
      regime,
      anexo: regime === "simples" ? anexo : undefined,
      competencia: competenciaStr,
      vencimento: vencimentoStr,
      total,
      breakdown,
      revenueMonth: Number(revenueMonth),
      revenue12m: Number(revenue12m),
      aliquota,
      barcode,
    });

    // Upload no Storage
    const path = `${customerProductId}/${year}-${String(month).padStart(2, "0")}-DAS.pdf`;
    const { error: upErr } = await admin.storage
      .from("das_guides")
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (upErr) throw upErr;

    const { data: signed } = await admin.storage
      .from("das_guides")
      .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 dias

    // Upsert do registro
    const { data: guide, error: insErr } = await admin
      .from("financial_das_guides")
      .upsert(
        {
          customer_product_id: customerProductId,
          regime,
          anexo: regime === "simples" ? anexo : null,
          competencia_month: month,
          competencia_year: year,
          revenue_month: Number(revenueMonth),
          revenue_12m: Number(revenue12m),
          aliquota_efetiva: aliquota,
          total_amount: total,
          tax_breakdown: breakdown,
          due_date: dueDate.toISOString().slice(0, 10),
          payment_status: "pending",
          barcode,
          pdf_storage_path: path,
          pdf_url: signed?.signedUrl ?? null,
        },
        { onConflict: "customer_product_id,competencia_year,competencia_month" }
      )
      .select()
      .single();

    if (insErr) throw insErr;

    return new Response(
      JSON.stringify({ ok: true, guide, pdf_url: signed?.signedUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[financial-generate-das]", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
