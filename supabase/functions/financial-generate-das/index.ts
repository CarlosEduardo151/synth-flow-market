// Edge Function: financial-generate-das
// Gera uma guia DAS (Documento de Arrecadação do Simples Nacional) em PDF
// Suporta MEI e Simples Nacional Anexos I, II, III, IV e V (com Fator R).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ===== Tabelas Simples Nacional 2024 =====
type Faixa = { upTo: number; rate: number; deduct: number };
type Anexo = {
  faixas: Faixa[];
  // Repartição percentual em cada faixa: [IRPJ, CSLL, COFINS, PIS, CPP, ICMS_or_ISS]
  reparticao: Record<number, number[]>;
  // 'ICMS' (Anexo I/II) ou 'ISS' (III/IV/V)
  ultimoTributo: "ICMS" | "ISS";
};

const ANEXO_I: Anexo = {
  faixas: [
    { upTo: 180000, rate: 0.04, deduct: 0 },
    { upTo: 360000, rate: 0.073, deduct: 5940 },
    { upTo: 720000, rate: 0.095, deduct: 13860 },
    { upTo: 1800000, rate: 0.107, deduct: 22500 },
    { upTo: 3600000, rate: 0.143, deduct: 87300 },
    { upTo: 4800000, rate: 0.19, deduct: 378000 },
  ],
  reparticao: {
    1: [5.5, 3.5, 12.74, 2.76, 41.5, 34.0],
    2: [5.5, 3.5, 12.74, 2.76, 41.5, 34.0],
    3: [5.5, 3.5, 12.74, 2.76, 42.0, 33.5],
    4: [5.5, 3.5, 12.74, 2.76, 42.0, 33.5],
    5: [5.5, 3.5, 12.74, 2.76, 42.0, 33.5],
    6: [13.5, 10.0, 28.27, 6.13, 42.1, 0.0],
  },
  ultimoTributo: "ICMS",
};

const ANEXO_II: Anexo = {
  faixas: [
    { upTo: 180000, rate: 0.045, deduct: 0 },
    { upTo: 360000, rate: 0.078, deduct: 5940 },
    { upTo: 720000, rate: 0.10, deduct: 13860 },
    { upTo: 1800000, rate: 0.112, deduct: 22500 },
    { upTo: 3600000, rate: 0.147, deduct: 85500 },
    { upTo: 4800000, rate: 0.30, deduct: 720000 },
  ],
  reparticao: {
    1: [5.5, 3.5, 11.51, 2.49, 37.5, 32.0 + 7.5],
    2: [5.5, 3.5, 11.51, 2.49, 37.5, 32.0 + 7.5],
    3: [5.5, 3.5, 11.51, 2.49, 37.5, 32.0 + 7.5],
    4: [5.5, 3.5, 11.51, 2.49, 37.5, 32.0 + 7.5],
    5: [5.5, 3.5, 11.51, 2.49, 37.5, 32.0 + 7.5],
    6: [8.5, 7.5, 20.96, 4.54, 23.5, 35.0],
  },
  ultimoTributo: "ICMS",
};

const ANEXO_III: Anexo = {
  faixas: [
    { upTo: 180000, rate: 0.06, deduct: 0 },
    { upTo: 360000, rate: 0.112, deduct: 9360 },
    { upTo: 720000, rate: 0.135, deduct: 17640 },
    { upTo: 1800000, rate: 0.16, deduct: 35640 },
    { upTo: 3600000, rate: 0.21, deduct: 125640 },
    { upTo: 4800000, rate: 0.33, deduct: 648000 },
  ],
  reparticao: {
    1: [4.0, 3.5, 12.82, 2.78, 43.4, 33.5],
    2: [4.0, 3.5, 14.05, 3.05, 43.4, 32.0],
    3: [4.0, 3.5, 13.64, 2.96, 43.4, 32.5],
    4: [4.0, 3.5, 13.64, 2.96, 43.4, 32.5],
    5: [4.0, 3.5, 12.82, 2.78, 43.4, 33.5],
    6: [35.0, 15.0, 16.03, 3.47, 30.5, 0.0],
  },
  ultimoTributo: "ISS",
};

const ANEXO_IV: Anexo = {
  faixas: [
    { upTo: 180000, rate: 0.045, deduct: 0 },
    { upTo: 360000, rate: 0.09, deduct: 8100 },
    { upTo: 720000, rate: 0.102, deduct: 12420 },
    { upTo: 1800000, rate: 0.14, deduct: 39780 },
    { upTo: 3600000, rate: 0.22, deduct: 183780 },
    { upTo: 4800000, rate: 0.33, deduct: 828000 },
  ],
  reparticao: {
    1: [18.8, 15.2, 17.67, 3.83, 0.0, 44.5],
    2: [19.8, 15.2, 20.55, 4.45, 0.0, 40.0],
    3: [20.8, 15.2, 19.73, 4.27, 0.0, 40.0],
    4: [17.8, 19.2, 18.9, 4.1, 0.0, 40.0],
    5: [18.8, 19.2, 18.08, 3.92, 0.0, 40.0],
    6: [53.5, 21.5, 20.55, 4.45, 0.0, 0.0],
  },
  ultimoTributo: "ISS",
};

const ANEXO_V: Anexo = {
  faixas: [
    { upTo: 180000, rate: 0.155, deduct: 0 },
    { upTo: 360000, rate: 0.18, deduct: 4500 },
    { upTo: 720000, rate: 0.195, deduct: 9900 },
    { upTo: 1800000, rate: 0.205, deduct: 17100 },
    { upTo: 3600000, rate: 0.23, deduct: 62100 },
    { upTo: 4800000, rate: 0.305, deduct: 540000 },
  ],
  reparticao: {
    1: [25.0, 15.0, 14.1, 3.05, 28.85, 14.0],
    2: [23.0, 15.0, 14.1, 3.05, 27.85, 17.0],
    3: [24.0, 15.0, 14.92, 3.23, 23.85, 19.0],
    4: [21.0, 15.0, 15.74, 3.41, 23.85, 21.0],
    5: [23.0, 12.5, 14.1, 3.05, 23.85, 23.5],
    6: [35.0, 15.5, 16.44, 3.56, 29.5, 0.0],
  },
  ultimoTributo: "ISS",
};

const ANEXOS: Record<string, Anexo> = {
  "Anexo I": ANEXO_I,
  "Anexo II": ANEXO_II,
  "Anexo III": ANEXO_III,
  "Anexo IV": ANEXO_IV,
  "Anexo V": ANEXO_V,
};

const MEI_AMOUNTS: Record<string, number> = {
  comercio: 71.6,
  servicos: 75.6,
  transporte: 80.6,
};

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function calcSimples(anexoKey: string, revenue12m: number, revenueMonth: number) {
  const anexo = ANEXOS[anexoKey] ?? ANEXO_I;
  const idx = anexo.faixas.findIndex((f) => revenue12m <= f.upTo);
  const faixaIdx = idx === -1 ? anexo.faixas.length - 1 : idx;
  const faixa = anexo.faixas[faixaIdx];
  const aliquotaEfetiva =
    (revenue12m * faixa.rate - faixa.deduct) / Math.max(revenue12m, 1);
  const das = Math.max(revenueMonth * aliquotaEfetiva, 0);
  const rep = anexo.reparticao[faixaIdx + 1];
  const breakdown: Record<string, number> = {
    IRPJ: das * (rep[0] / 100),
    CSLL: das * (rep[1] / 100),
    COFINS: das * (rep[2] / 100),
    PIS: das * (rep[3] / 100),
    CPP: das * (rep[4] / 100),
    [anexo.ultimoTributo]: das * (rep[5] / 100),
  };
  return { faixa, aliquotaEfetiva: Math.max(aliquotaEfetiva, 0), das, breakdown, anexo: anexoKey };
}

function calcMEI(activity: string) {
  const total = MEI_AMOUNTS[activity] ?? MEI_AMOUNTS.comercio;
  const iss = activity === "servicos" ? 5 : 0;
  const icms = activity === "comercio" ? 1 : activity === "transporte" ? 6 : 0;
  const inss = total - iss - icms;
  return { total, breakdown: { INSS: inss, ISS: iss, ICMS: icms } };
}

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

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("CONTRIBUINTE", 12, 40);
  doc.setFont("helvetica", "normal");
  doc.text(`Empresa: ${data.empresa}`, 12, 46);
  doc.text(`CNPJ: ${data.cnpj}`, 12, 51);
  doc.text(
    `Regime: ${data.regime.toUpperCase()}${data.anexo ? ` - ${data.anexo}` : ""}`,
    12,
    56,
  );

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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("BASE DE CÁLCULO", 12, 72);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Faturamento do mês: ${fmtBRL(data.revenueMonth)}`, 12, 78);
  doc.text(`RBT12 (últimos 12 meses): ${fmtBRL(data.revenue12m)}`, 12, 83);
  doc.text(`Alíquota efetiva: ${(data.aliquota * 100).toFixed(3)}%`, 12, 88);

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

  doc.setDrawColor(16, 122, 87);
  doc.setLineWidth(0.5);
  doc.line(12, y + 2, 198, y + 2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(16, 122, 87);
  doc.text("TOTAL A PAGAR", 14, y + 10);
  doc.text(fmtBRL(data.total), 196, y + 10, { align: "right" });

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("LINHA DIGITÁVEL", 12, y + 25);
  doc.setFont("courier", "normal");
  doc.setFontSize(10);
  const formatted = data.barcode.replace(/(.{12})/g, "$1 ").trim();
  doc.text(formatted, 12, y + 32);

  let bx = 12;
  const by = y + 38;
  for (let i = 0; i < data.barcode.length; i++) {
    const c = parseInt(data.barcode[i], 10) || 0;
    const bw = 0.4 + (c % 3) * 0.3;
    doc.setFillColor(20, 20, 20);
    doc.rect(bx, by, bw, 12, "F");
    bx += bw + 0.6;
  }

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(
    "Este documento é uma guia interna de controle gerada pelo sistema NovaLink. " +
      "Para a guia oficial DAS, acesse o portal PGDAS-D (Receita Federal) ou o app MEI.",
    12,
    285,
    { maxWidth: 186 },
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

    let total = 0;
    let breakdown: Record<string, number> = {};
    let aliquota = 0;
    let anexoUsed: string | null = null;
    if (regime === "mei") {
      const r = calcMEI(meiActivity ?? "comercio");
      total = r.total;
      breakdown = r.breakdown;
    } else {
      const r = calcSimples(anexo, Number(revenue12m), Number(revenueMonth));
      total = r.das;
      breakdown = r.breakdown;
      aliquota = r.aliquotaEfetiva;
      anexoUsed = r.anexo;
    }

    const today = new Date();
    const month = competenciaMonth ?? today.getMonth() + 1;
    const year = competenciaYear ?? today.getFullYear();
    const dueDate = new Date(year, month, 20);
    const competenciaStr = `${String(month).padStart(2, "0")}/${year}`;
    const vencimentoStr = dueDate.toLocaleDateString("pt-BR");

    const barcode = generateBarcode(customerProductId, year, month, total);

    const pdfBytes = generatePDF({
      empresa,
      cnpj,
      regime,
      anexo: regime === "simples" ? anexoUsed ?? anexo : undefined,
      competencia: competenciaStr,
      vencimento: vencimentoStr,
      total,
      breakdown,
      revenueMonth: Number(revenueMonth),
      revenue12m: Number(revenue12m),
      aliquota,
      barcode,
    });

    const path = `${customerProductId}/${year}-${String(month).padStart(2, "0")}-DAS.pdf`;
    const { error: upErr } = await admin.storage
      .from("das_guides")
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (upErr) throw upErr;

    const { data: signed } = await admin.storage
      .from("das_guides")
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    const { data: guide, error: insErr } = await admin
      .from("financial_das_guides")
      .upsert(
        {
          customer_product_id: customerProductId,
          user_id: cp.user_id,
          regime,
          anexo: regime === "simples" ? anexoUsed ?? anexo : null,
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
        { onConflict: "customer_product_id,competencia_year,competencia_month" },
      )
      .select()
      .single();

    if (insErr) throw insErr;

    return new Response(
      JSON.stringify({ ok: true, guide, pdf_url: signed?.signedUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[financial-generate-das]", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
