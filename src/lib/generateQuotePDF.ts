import { jsPDF } from "jspdf";

interface QuoteItem {
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
}

interface QuoteData {
  type: "quote" | "invoice";
  number: string;
  date: string;
  validUntil?: string | null;
  dueDate?: string | null;
  status?: string;
  client: {
    name: string;
    email?: string | null;
    phone?: string | null;
    document?: string | null;
    address?: string | null;
  };
  items: QuoteItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes?: string | null;
  terms?: string | null;
  business?: { name?: string | null };
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function generateQuotePDF(data: QuoteData): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const isQuote = data.type === "quote";
  const accent: [number, number, number] = isQuote ? [99, 102, 241] : [16, 122, 87];
  const title = isQuote ? "ORÇAMENTO" : "FATURA";

  // Header band
  doc.setFillColor(...accent);
  doc.rect(0, 0, W, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(title, 12, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Nº ${data.number}`, 12, 22);
  doc.text(`Emitido em ${data.date}`, 12, 28);

  if (data.business?.name) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(data.business.name, W - 12, 15, { align: "right" });
  }
  if (data.validUntil) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Válido até: ${data.validUntil}`, W - 12, 22, { align: "right" });
  }
  if (data.dueDate) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Vencimento: ${data.dueDate}`, W - 12, 22, { align: "right" });
  }

  // Client box
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("CLIENTE", 12, 44);
  doc.setDrawColor(220);
  doc.line(12, 46, 198, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(data.client.name, 12, 53);
  let cy = 59;
  if (data.client.document) { doc.text(`Doc: ${data.client.document}`, 12, cy); cy += 5; }
  if (data.client.email) { doc.text(`E-mail: ${data.client.email}`, 12, cy); cy += 5; }
  if (data.client.phone) { doc.text(`Telefone: ${data.client.phone}`, 12, cy); cy += 5; }
  if (data.client.address) { doc.text(`Endereço: ${data.client.address}`, 12, cy, { maxWidth: 186 }); cy += 5; }

  // Items table
  let y = Math.max(cy + 5, 80);
  doc.setFillColor(...accent);
  doc.rect(12, y, 186, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DESCRIÇÃO", 14, y + 5.5);
  doc.text("QTD", 122, y + 5.5, { align: "right" });
  doc.text("UNITÁRIO", 150, y + 5.5, { align: "right" });
  doc.text("DESC.", 170, y + 5.5, { align: "right" });
  doc.text("TOTAL", 196, y + 5.5, { align: "right" });
  y += 12;

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const it of data.items) {
    if (y > 250) { doc.addPage(); y = 20; }
    const descLines = doc.splitTextToSize(it.description, 100);
    doc.text(descLines, 14, y);
    doc.text(String(it.quantity), 122, y, { align: "right" });
    doc.text(fmtBRL(it.unit_price), 150, y, { align: "right" });
    doc.text(it.discount ? fmtBRL(it.discount) : "—", 170, y, { align: "right" });
    doc.text(fmtBRL(it.total), 196, y, { align: "right" });
    y += Math.max(descLines.length * 4.5, 6);
    doc.setDrawColor(235);
    doc.line(12, y - 1, 198, y - 1);
    y += 2;
  }

  // Totals box
  y += 4;
  if (y > 240) { doc.addPage(); y = 30; }
  const tx = 130;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Subtotal", tx, y);
  doc.text(fmtBRL(data.subtotal), 196, y, { align: "right" });
  y += 6;
  if (data.discount > 0) {
    doc.text("Desconto", tx, y);
    doc.text(`- ${fmtBRL(data.discount)}`, 196, y, { align: "right" });
    y += 6;
  }
  if (data.tax > 0) {
    doc.text("Impostos", tx, y);
    doc.text(fmtBRL(data.tax), 196, y, { align: "right" });
    y += 6;
  }
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.5);
  doc.line(tx, y, 196, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...accent);
  doc.text("TOTAL", tx, y);
  doc.text(fmtBRL(data.total), 196, y, { align: "right" });
  doc.setTextColor(20, 20, 20);
  y += 10;

  if (data.notes) {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("OBSERVAÇÕES", 12, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(data.notes, 186);
    doc.text(lines, 12, y);
    y += lines.length * 4.5 + 4;
  }

  if (data.terms) {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("TERMOS E CONDIÇÕES", 12, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(data.terms, 186);
    doc.text(lines, 12, y);
  }

  // Footer
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(140);
  doc.text(
    `Documento gerado eletronicamente em ${new Date().toLocaleString("pt-BR")} · NovaLink`,
    105, 290, { align: "center" }
  );

  return doc.output("blob");
}

export function downloadQuotePDF(data: QuoteData) {
  const blob = generateQuotePDF(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.type === "quote" ? "Orcamento" : "Fatura"}-${data.number}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
