import jsPDF from 'jspdf';

// ── Auditt Brand Colors ──
const NAVY: [number, number, number] = [0, 32, 63];
const NAVY_MID: [number, number, number] = [0, 58, 112];
const GOLD: [number, number, number] = [212, 175, 55];
const WHITE: [number, number, number] = [255, 255, 255];
const CARBON: [number, number, number] = [35, 35, 35];
const LIGHT_BG: [number, number, number] = [245, 247, 250];
const GRAY: [number, number, number] = [120, 120, 120];

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function drawGradientBar(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  from: [number, number, number],
  to: [number, number, number],
) {
  const steps = 60;
  for (let i = 0; i < steps; i++) {
    const ratio = i / steps;
    const r = Math.round(from[0] + (to[0] - from[0]) * ratio);
    const g = Math.round(from[1] + (to[1] - from[1]) * ratio);
    const b = Math.round(from[2] + (to[2] - from[2]) * ratio);
    doc.setFillColor(r, g, b);
    doc.rect(x, y + (i * h) / steps, w, h / steps + 0.15, 'F');
  }
}

export interface BudgetPDFItem {
  tipo: 'peca' | 'mao_de_obra';
  codigo: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  horas?: number | null;
  valor_hora?: number | null;
}

export interface BudgetPDFData {
  osNumber: string;
  placa: string;
  veiculo: string;
  km: number;
  dataEntrada: string;
  oficinaNome: string;
  laudoTecnico: string;
  items: BudgetPDFItem[];
  totalPecas: number;
  totalMaoDeObra: number;
  totalBruto: number;
  comissaoPct: number;
  totalLiquido: number;
  status: string;
  budgetId: string;
  approvedBy?: string;
  approvedAt?: string;
}

// ── Column positions (absolute X from left edge) ──
const COL = {
  num: 14,       // #
  tipo: 22,      // Tipo badge
  desc: 38,      // Descrição
  qty: 116,      // Qtd / Hrs
  unit: 140,     // Unitário / Hora
  total: 174,    // Total (right-aligned)
} as const;

function ensurePage(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 272) {
    doc.addPage();
    doc.setFillColor(...LIGHT_BG);
    doc.rect(0, 0, 210, 297, 'F');
    return 16;
  }
  return y;
}

export function generateBudgetPDF(data: BudgetPDFData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = 210;
  const margin = 14;
  const contentW = pw - margin * 2;
  const rightEdge = margin + contentW;
  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // ═══════════ BACKGROUND ═══════════
  doc.setFillColor(...LIGHT_BG);
  doc.rect(0, 0, pw, 297, 'F');

  // ═══════════ HEADER ═══════════
  drawGradientBar(doc, 0, 0, pw, 38, NAVY, NAVY_MID);
  doc.setFillColor(...GOLD);
  doc.rect(0, 38, pw, 1.2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...WHITE);
  doc.text('AUDITT', margin, 16);

  doc.setFontSize(8);
  doc.setTextColor(...GOLD);
  doc.text('ORÇAMENTO DE MANUTENÇÃO', margin, 24);

  doc.setFontSize(7);
  doc.setTextColor(180, 200, 220);
  doc.text(`OS: ${data.osNumber}`, pw - margin, 12, { align: 'right' });
  doc.text(today, pw - margin, 18, { align: 'right' });
  doc.text(`#${data.budgetId.slice(0, 8).toUpperCase()}`, pw - margin, 24, {
    align: 'right',
  });

  // Status badge
  const isApproved = data.status === 'aprovado';
  const statusLabel = isApproved
    ? 'APROVADO'
    : data.status === 'pendente'
      ? 'PENDENTE'
      : data.status.toUpperCase();
  doc.setFillColor(
    isApproved ? 34 : 200,
    isApproved ? 139 : 160,
    isApproved ? 34 : 0,
  );
  doc.roundedRect(pw - margin - 30, 28, 30, 7, 2, 2, 'F');
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text(statusLabel, pw - margin - 15, 33, { align: 'center' });

  // ═══════════ VEHICLE INFO BOX ═══════════
  let y = 46;
  doc.setFillColor(235, 238, 244);
  doc.roundedRect(margin, y, contentW, 24, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...NAVY);
  doc.text('DADOS DO VEÍCULO', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text(
    `Placa: ${data.placa}   |   Veículo: ${data.veiculo}   |   KM: ${data.km.toLocaleString('pt-BR')}`,
    margin + 4,
    y + 13,
  );
  doc.text(
    `Oficina: ${data.oficinaNome}   |   Entrada: ${data.dataEntrada}`,
    margin + 4,
    y + 20,
  );

  // ═══════════ ITEMS TABLE ═══════════
  y += 32;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text('ITENS DO ORÇAMENTO', margin, y);
  y += 5;

  // Table header
  doc.setFillColor(...NAVY);
  doc.roundedRect(margin, y, contentW, 7, 1.5, 1.5, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
  doc.text('#', COL.num + 2, y + 5);
  doc.text('Tipo', COL.tipo + 2, y + 5);
  doc.text('Descrição', COL.desc, y + 5);
  doc.text('Qtd/Hrs', COL.qty, y + 5);
  doc.text('Unit./Hora', COL.unit, y + 5);
  doc.text('Total', COL.total + 8, y + 5, { align: 'right' });
  y += 9;

  // Table rows
  const rowH = 7.5;
  data.items.forEach((item, idx) => {
    y = ensurePage(doc, y, rowH + 2);

    const isMO = item.tipo === 'mao_de_obra';

    // Alternating row bg
    if (idx % 2 === 0) {
      doc.setFillColor(248, 249, 252);
      doc.rect(margin, y - 1, contentW, rowH, 'F');
    }

    // Row number
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...CARBON);
    doc.text(String(idx + 1), COL.num + 2, y + 4);

    // Type badge
    if (isMO) {
      doc.setFillColor(245, 230, 200);
      doc.roundedRect(COL.tipo, y, 14, 5.5, 1, 1, 'F');
      doc.setFontSize(5.5);
      doc.setTextColor(120, 80, 20);
      doc.text('M.O.', COL.tipo + 7, y + 4, { align: 'center' });
    } else {
      doc.setFillColor(210, 228, 248);
      doc.roundedRect(COL.tipo, y, 14, 5.5, 1, 1, 'F');
      doc.setFontSize(5.5);
      doc.setTextColor(30, 80, 140);
      doc.text('Peça', COL.tipo + 7, y + 4, { align: 'center' });
    }

    // Description (truncate to fit)
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...CARBON);
    const maxDescW = COL.qty - COL.desc - 3;
    const desc =
      doc.getTextWidth(item.descricao) > maxDescW
        ? item.descricao.slice(0, 40) + '…'
        : item.descricao;
    doc.text(desc, COL.desc, y + 4);

    // Qty or hours
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    const qtyText = isMO ? `${item.horas || 0}h` : String(item.quantidade);
    doc.text(qtyText, COL.qty + 10, y + 4, { align: 'center' });

    // Unit price or hourly rate
    const unitText = isMO ? fmt(item.valor_hora || 0) : fmt(item.valor_unitario);
    doc.text(unitText, COL.unit + 16, y + 4, { align: 'center' });

    // Total
    doc.setFont('courier', 'bold');
    doc.text(fmt(item.valor_total), COL.total + 8, y + 4, { align: 'right' });

    y += rowH;
  });

  // ═══════════ TOTALS ═══════════
  y = ensurePage(doc, y, 50);
  y += 4;
  doc.setDrawColor(200, 205, 215);
  doc.line(margin, y, rightEdge, y);
  y += 6;

  const totalsX = rightEdge - 65;

  const drawTotalLine = (
    label: string,
    value: string,
    bold = false,
    color: [number, number, number] = CARBON,
  ) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(label, totalsX, y);
    doc.setFont('courier', bold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    doc.text(value, rightEdge, y, { align: 'right' });
    y += 5.5;
  };

  drawTotalLine('Peças:', fmt(data.totalPecas), true);
  drawTotalLine('Mão de Obra:', fmt(data.totalMaoDeObra), true);
  drawTotalLine(
    `Comissão Auditt (${data.comissaoPct}%):`,
    fmt(data.totalBruto - data.totalLiquido),
    false,
    [180, 140, 50],
  );
  y += 2;

  // Grand total box
  doc.setFillColor(...NAVY);
  doc.roundedRect(totalsX - 4, y - 1, rightEdge - totalsX + 8, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text('TOTAL GERAL:', totalsX, y + 6);
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.text(fmt(data.totalBruto), rightEdge + 2, y + 6, { align: 'right' });
  y += 16;

  // ═══════════ LAUDO TÉCNICO ═══════════
  if (data.laudoTecnico && data.laudoTecnico.trim()) {
    y = ensurePage(doc, y, 30);
    doc.setFillColor(235, 238, 244);
    const laudoLines = doc.splitTextToSize(data.laudoTecnico, contentW - 8);
    const laudoH = Math.max(16, laudoLines.length * 4.5 + 10);
    doc.roundedRect(margin, y, contentW, laudoH, 3, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...NAVY);
    doc.text('LAUDO TÉCNICO / OBSERVAÇÕES', margin + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text(laudoLines, margin + 4, y + 12);
    y += laudoH + 6;
  }

  // ═══════════ APPROVAL SECTION ═══════════
  y = ensurePage(doc, y, 30);

  if (isApproved) {
    doc.setFillColor(230, 248, 230);
    doc.roundedRect(margin, y, contentW, 20, 3, 3, 'F');
    doc.setDrawColor(34, 139, 34);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, contentW, 20, 3, 3, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(20, 100, 20);
    doc.text('ORÇAMENTO APROVADO', margin + 6, y + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(40, 100, 40);
    const approvalText = `Aprovado por: ${data.approvedBy || 'Gestor da Frota'}   |   Data: ${data.approvedAt || today}`;
    doc.text(approvalText, margin + 6, y + 16);
  } else {
    // Signature lines for pending approval
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...NAVY);
    doc.text('APROVAÇÃO', margin, y + 4);
    y += 10;

    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);

    // Signature line — Oficina
    doc.line(margin, y + 12, margin + 70, y + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text('Responsável Oficina', margin + 10, y + 17);

    // Signature line — Gestor
    doc.line(rightEdge - 70, y + 12, rightEdge, y + 12);
    doc.text('Gestor da Frota', rightEdge - 55, y + 17);

    // Date line
    doc.text('Data: ____/____/________', pw / 2, y + 17, { align: 'center' });
  }

  // ═══════════ FOOTER ═══════════
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const fY = 289;
    doc.setFillColor(...GOLD);
    doc.rect(0, fY - 4, pw, 0.5, 'F');

    doc.setFont('courier', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `Auditt Tecnologia e Logística LTDA • Documento gerado automaticamente • ${today} • Página ${p}/${totalPages}`,
      pw / 2,
      fY,
      { align: 'center' },
    );
  }

  // ═══════════ SAVE ═══════════
  const safePlaca = data.placa.replace(/[^a-zA-Z0-9]/g, '');
  doc.save(
    `ORCAMENTO_AUDITT_${safePlaca}_${data.budgetId.slice(0, 8).toUpperCase()}.pdf`,
  );
}
