import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface DREData {
  period: string;
  receitaBruta: number;
  deducoes: number;
  receitaLiq: number;
  custos: number;
  lucroBruto: number;
  despOp: { pessoal: number; marketing: number; administrativas: number; infraestrutura: number };
  totalOp: number;
  ebitda: number;
  despFin: number;
  lucroLiq: number;
  mb: number; me: number; ml: number;
  txCount: number;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
const fmtPct = (v: number) => `${isFinite(v) ? v.toFixed(2) : "0,00"}%`;

export function generateDREPDF(data: DREData): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Header
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(0, 0, 210, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Demonstração do Resultado", 14, 16);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Período de referência: ${data.period}`, 14, 24);
  doc.setFontSize(8);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")} • ${data.txCount} transação(ões) consideradas`, 14, 29);

  // Margens em destaque
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Indicadores de margem", 14, 44);
  autoTable(doc, {
    startY: 48,
    head: [["Indicador", "Valor", "% s/Receita Líq."]],
    body: [
      ["Lucro Bruto", fmtBRL(data.lucroBruto), fmtPct(data.mb)],
      ["EBITDA",      fmtBRL(data.ebitda),     fmtPct(data.me)],
      ["Lucro Líquido", fmtBRL(data.lucroLiq), fmtPct(data.ml)],
    ],
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 9 },
    styles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
  });

  // Tabela DRE
  const startY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold");
  doc.text("Demonstração detalhada", 14, startY);

  autoTable(doc, {
    startY: startY + 4,
    head: [["Linha", "Valor (R$)"]],
    body: [
      [{ content: "(+) Receita Bruta", styles: { fontStyle: "bold" } }, { content: fmtBRL(data.receitaBruta), styles: { halign: "right", fontStyle: "bold" } }],
      [{ content: "   (−) Deduções (impostos s/ vendas)" }, { content: fmtBRL(-data.deducoes), styles: { halign: "right", textColor: [185, 28, 28] } }],
      [{ content: "(=) Receita Líquida", styles: { fontStyle: "bold", fillColor: [240, 240, 250] } }, { content: fmtBRL(data.receitaLiq), styles: { halign: "right", fontStyle: "bold", fillColor: [240, 240, 250] } }],
      [{ content: "   (−) Custos dos Produtos/Serviços (CPV/CSV)" }, { content: fmtBRL(-data.custos), styles: { halign: "right", textColor: [185, 28, 28] } }],
      [{ content: `(=) Lucro Bruto  ·  ${fmtPct(data.mb)}`, styles: { fontStyle: "bold", fillColor: [240, 240, 250] } }, { content: fmtBRL(data.lucroBruto), styles: { halign: "right", fontStyle: "bold", fillColor: [240, 240, 250] } }],
      [{ content: "(−) Despesas Operacionais", styles: { fontStyle: "bold" } }, { content: fmtBRL(-data.totalOp), styles: { halign: "right", fontStyle: "bold", textColor: [185, 28, 28] } }],
      [{ content: "   • Pessoal & encargos" }, { content: fmtBRL(-data.despOp.pessoal), styles: { halign: "right" } }],
      [{ content: "   • Marketing & vendas" }, { content: fmtBRL(-data.despOp.marketing), styles: { halign: "right" } }],
      [{ content: "   • Administrativas / Outras" }, { content: fmtBRL(-data.despOp.administrativas), styles: { halign: "right" } }],
      [{ content: "   • Infraestrutura & TI" }, { content: fmtBRL(-data.despOp.infraestrutura), styles: { halign: "right" } }],
      [{ content: `(=) EBITDA  ·  ${fmtPct(data.me)}`, styles: { fontStyle: "bold", fillColor: [219, 234, 254] } }, { content: fmtBRL(data.ebitda), styles: { halign: "right", fontStyle: "bold", fillColor: [219, 234, 254] } }],
      [{ content: "   (−) Despesas Financeiras" }, { content: fmtBRL(-data.despFin), styles: { halign: "right", textColor: [185, 28, 28] } }],
      [
        { content: `(=) Lucro Líquido do Exercício  ·  ${fmtPct(data.ml)}`, styles: { fontStyle: "bold", fillColor: data.lucroLiq >= 0 ? [220, 252, 231] : [254, 226, 226] } },
        { content: fmtBRL(data.lucroLiq), styles: { halign: "right", fontStyle: "bold", fontSize: 12, textColor: data.lucroLiq >= 0 ? [21, 128, 61] : [185, 28, 28], fillColor: data.lucroLiq >= 0 ? [220, 252, 231] : [254, 226, 226] } },
      ],
    ],
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 9 },
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: "right" } },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(`Agente Financeiro NovaLink • DRE • Página ${i}/${pageCount}`, 14, 290);
    doc.text(`Hash: ${Date.now().toString(36)}`, 196, 290, { align: "right" });
  }

  return doc.output("blob");
}
