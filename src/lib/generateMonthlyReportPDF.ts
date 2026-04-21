import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fmtBRL = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export interface MonthlyReportData {
  periodLabel: string;
  income: number;
  expense: number;
  net: number;
  margin: number;
  receivablesOpen: number;
  payablesOpen: number;
  agingBuckets: { label: string; total: number }[];
  goals: { name: string; current: number; target: number; pct: number }[];
  insights: { title: string; severity: string; impact: number }[];
  topCategories: { category: string; total: number }[];
  businessName?: string;
}

export function generateMonthlyReportPDF(data: MonthlyReportData): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 50;

  // Cabeçalho
  doc.setFillColor(16, 122, 87);
  doc.rect(0, 0, pageWidth, 80, "F");
  doc.setTextColor(255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório Mensal Consolidado", 40, 40);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(data.businessName || "NovaLink Financeiro", 40, 60);
  doc.setFontSize(10);
  doc.text(data.periodLabel, pageWidth - 40, 60, { align: "right" });

  y = 110;
  doc.setTextColor(0);

  // DRE
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 122, 87);
  doc.text("📊 Resumo Financeiro (DRE)", 40, y);
  y += 10;
  doc.setTextColor(0);

  autoTable(doc, {
    startY: y + 5,
    theme: "grid",
    headStyles: { fillColor: [16, 122, 87] },
    body: [
      ["Receitas totais", fmtBRL(data.income)],
      ["Despesas totais", fmtBRL(data.expense)],
      [{ content: "Resultado líquido", styles: { fontStyle: "bold" } },
       { content: fmtBRL(data.net), styles: { fontStyle: "bold", textColor: data.net >= 0 ? [16, 122, 87] : [220, 38, 38] } }],
      ["Margem líquida", `${data.margin.toFixed(1)}%`],
    ],
    columnStyles: { 1: { halign: "right" } },
  });

  y = (doc as any).lastAutoTable.finalY + 25;

  // Fluxo
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 122, 87);
  doc.text("💸 Fluxo em aberto", 40, y);
  y += 5;
  doc.setTextColor(0);
  autoTable(doc, {
    startY: y + 5,
    theme: "grid",
    body: [
      ["A receber em aberto", fmtBRL(data.receivablesOpen)],
      ["A pagar em aberto", fmtBRL(data.payablesOpen)],
    ],
    columnStyles: { 1: { halign: "right" } },
  });
  y = (doc as any).lastAutoTable.finalY + 25;

  // Aging
  if (data.agingBuckets.length) {
    if (y > 700) { doc.addPage(); y = 50; }
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 122, 87);
    doc.text("📅 Aging — Recebíveis vencidos", 40, y);
    y += 5;
    doc.setTextColor(0);
    autoTable(doc, {
      startY: y + 5,
      theme: "grid",
      head: [["Faixa", "Total"]],
      headStyles: { fillColor: [16, 122, 87] },
      body: data.agingBuckets.map(b => [b.label, fmtBRL(b.total)]),
      columnStyles: { 1: { halign: "right" } },
    });
    y = (doc as any).lastAutoTable.finalY + 25;
  }

  // Top categorias
  if (data.topCategories.length) {
    if (y > 700) { doc.addPage(); y = 50; }
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 122, 87);
    doc.text("🏷️ Top categorias de despesa", 40, y);
    y += 5;
    doc.setTextColor(0);
    autoTable(doc, {
      startY: y + 5,
      theme: "grid",
      head: [["Categoria", "Total"]],
      headStyles: { fillColor: [16, 122, 87] },
      body: data.topCategories.map(c => [c.category || "—", fmtBRL(c.total)]),
      columnStyles: { 1: { halign: "right" } },
    });
    y = (doc as any).lastAutoTable.finalY + 25;
  }

  // Metas
  if (data.goals.length) {
    if (y > 700) { doc.addPage(); y = 50; }
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 122, 87);
    doc.text("🎯 Metas", 40, y);
    y += 5;
    doc.setTextColor(0);
    autoTable(doc, {
      startY: y + 5,
      theme: "grid",
      head: [["Meta", "Atual", "Alvo", "%"]],
      headStyles: { fillColor: [16, 122, 87] },
      body: data.goals.map(g => [
        g.name,
        fmtBRL(g.current),
        fmtBRL(g.target),
        `${g.pct.toFixed(0)}%`,
      ]),
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    });
    y = (doc as any).lastAutoTable.finalY + 25;
  }

  // Insights
  if (data.insights.length) {
    if (y > 700) { doc.addPage(); y = 50; }
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 122, 87);
    doc.text("💡 Insights detectados", 40, y);
    y += 5;
    doc.setTextColor(0);
    autoTable(doc, {
      startY: y + 5,
      theme: "grid",
      head: [["Severidade", "Insight", "Impacto"]],
      headStyles: { fillColor: [16, 122, 87] },
      body: data.insights.map(i => [
        i.severity.toUpperCase(),
        i.title,
        i.impact > 0 ? fmtBRL(i.impact) : "—",
      ]),
      columnStyles: { 2: { halign: "right" } },
    });
  }

  // Rodapé
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      `NovaLink · Agente Financeiro · Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" },
    );
  }

  return doc;
}
