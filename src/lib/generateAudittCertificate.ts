import jsPDF from 'jspdf';

interface WorkshopData {
  nome_fantasia: string | null;
  razao_social: string | null;
  cnpj: string;
  cidade: string | null;
  estado: string | null;
  categorias: string[] | null;
  valor_hora_tecnica: number | null;
}

// ── Auditt Brand Colors ──
const NAVY_DARK: [number, number, number] = [0, 32, 63];
const NAVY_MID: [number, number, number] = [0, 58, 112];
const GOLD: [number, number, number] = [212, 175, 55];
const GOLD_GLOW: [number, number, number] = [255, 215, 0];
const WHITE: [number, number, number] = [255, 255, 255];
const CARBON: [number, number, number] = [35, 35, 35];
const LIGHT_BG: [number, number, number] = [245, 247, 250];

function drawGradientV(doc: jsPDF, x: number, y: number, w: number, h: number, from: [number, number, number], to: [number, number, number]) {
  const steps = 180;
  for (let i = 0; i < steps; i++) {
    const ratio = i / steps;
    const r = Math.round(from[0] + (to[0] - from[0]) * ratio);
    const g = Math.round(from[1] + (to[1] - from[1]) * ratio);
    const b = Math.round(from[2] + (to[2] - from[2]) * ratio);
    doc.setFillColor(r, g, b);
    const sliceH = h / steps + 0.15;
    doc.rect(x, y + (i * h / steps), w, sliceH, 'F');
  }
}

function drawRoundedCard(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, color: [number, number, number]) {
  doc.setFillColor(...color);
  doc.roundedRect(x, y, w, h, r, r, 'F');
}

function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return cnpj;
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export function generateAudittCertificate(workshop: WorkshopData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = 210;
  const ph = 297;
  const name = workshop.nome_fantasia || workshop.razao_social || 'Oficina Parceira';
  const docId = Date.now().toString(36).toUpperCase().slice(-8);
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  // ═══════════════════════════════════════════
  // BACKGROUND
  // ═══════════════════════════════════════════
  doc.setFillColor(...LIGHT_BG);
  doc.rect(0, 0, pw, ph, 'F');

  // ═══════════════════════════════════════════
  // HEADER GRADIENT BAR
  // ═══════════════════════════════════════════
  drawGradientV(doc, 0, 0, pw, 50, NAVY_DARK, NAVY_MID);

  // Gold accent line
  doc.setFillColor(...GOLD);
  doc.rect(0, 50, pw, 1.5, 'F');

  // Header branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(34);
  doc.setTextColor(...WHITE);
  doc.text('AUDITT', 18, 22);

  doc.setFontSize(9);
  doc.setTextColor(...GOLD_GLOW);
  doc.text('A INTELIGÊNCIA QUE AUDITA SUA FROTA E ACELERA SEU CAIXA.', 18, 32);

  // Doc ID on header right
  doc.setFontSize(7);
  doc.setTextColor(180, 200, 220);
  doc.text(`DOC #${docId}`, pw - 18, 14, { align: 'right' });
  doc.text(today, pw - 18, 20, { align: 'right' });

  // Decorative geometric accent (top right corner)
  doc.setFillColor(230, 215, 170);
  doc.triangle(pw - 60, 0, pw, 0, pw, 40, 'F');

  // ═══════════════════════════════════════════
  // TITLE SECTION
  // ═══════════════════════════════════════════
  let y = 68;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(42);
  doc.setTextColor(...NAVY_DARK);
  doc.text('CERTIFICADO', 18, y);

  y += 16;
  doc.setFontSize(42);
  doc.setTextColor(...GOLD);
  doc.text('DE PARCERIA', 18, y);

  // Horizontal gold rule
  y += 8;
  doc.setFillColor(...GOLD);
  doc.rect(18, y, 60, 1, 'F');

  // ═══════════════════════════════════════════
  // PERSONALIZED MESSAGE
  // ═══════════════════════════════════════════
  y += 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...CARBON);
  doc.text(`Parabéns, ${name}!`, 20, y);

  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(70, 70, 70);

  const msg =
    `A unidade ${name.toUpperCase()} foi oficialmente homologada no ecossistema AUDITT. ` +
    `A partir deste momento, sua operação está integrada à nossa plataforma de inteligência ` +
    `artificial para auditoria de orçamentos, gestão de frotas e garantia de transparência ` +
    `financeira. Sua oficina agora conta com tecnologia de ponta para validar cada serviço ` +
    `e maximizar a rentabilidade do seu negócio.`;

  const lines = doc.splitTextToSize(msg, 170);
  doc.text(lines, 20, y);

  // ═══════════════════════════════════════════
  // PERFORMANCE CARDS
  // ═══════════════════════════════════════════
  y += lines.length * 6 + 18;
  const cw = 54;
  const ch = 58;
  const gap = 7;
  const startX = (pw - (cw * 3 + gap * 2)) / 2;

  // Card 1 — Financeiro
  drawRoundedCard(doc, startX, y, cw, ch, 5, NAVY_DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...GOLD_GLOW);
  doc.text('FINANCEIRO', startX + cw / 2, y + 12, { align: 'center' });
  doc.setFontSize(13);
  doc.setTextColor(...WHITE);
  doc.text('D+1', startX + cw / 2, y + 24, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(200, 210, 220);
  const t1 = doc.splitTextToSize('Capital de giro liberado em tempo recorde.', cw - 12);
  doc.text(t1, startX + cw / 2, y + 34, { align: 'center' });

  // Card 2 — Auditoria IA
  const x2 = startX + cw + gap;
  drawRoundedCard(doc, x2, y, cw, ch, 5, GOLD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...NAVY_DARK);
  doc.text('TECNOLOGIA', x2 + cw / 2, y + 12, { align: 'center' });
  doc.setFontSize(13);
  doc.text('IA VERO 1.0', x2 + cw / 2, y + 24, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(50, 50, 50);
  const t2 = doc.splitTextToSize('Cada orçamento auditado pela nossa malha neural.', cw - 12);
  doc.text(t2, x2 + cw / 2, y + 34, { align: 'center' });

  // Card 3 — Rede
  const x3 = startX + (cw + gap) * 2;
  drawRoundedCard(doc, x3, y, cw, ch, 5, CARBON);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...GOLD_GLOW);
  doc.text('EXCLUSIVIDADE', x3 + cw / 2, y + 12, { align: 'center' });
  doc.setFontSize(13);
  doc.setTextColor(...WHITE);
  doc.text('TOP PARTNER', x3 + cw / 2, y + 24, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(200, 210, 220);
  const t3 = doc.splitTextToSize('Atenda as maiores frotas do Brasil.', cw - 12);
  doc.text(t3, x3 + cw / 2, y + 34, { align: 'center' });

  // ═══════════════════════════════════════════
  // WORKSHOP DATA BOX
  // ═══════════════════════════════════════════
  y += ch + 16;
  drawRoundedCard(doc, 18, y, pw - 36, 38, 4, [235, 238, 244]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...NAVY_DARK);
  doc.text('DADOS DA UNIDADE HOMOLOGADA', 26, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const dataLines = [
    `Razão Social: ${workshop.razao_social || name}`,
    `CNPJ: ${formatCNPJ(workshop.cnpj)}    |    Localização: ${workshop.cidade || '—'}/${workshop.estado || '—'}`,
    `Categorias: ${(workshop.categorias || []).join(', ') || '—'}    |    Hora Técnica: R$ ${(workshop.valor_hora_tecnica || 0).toFixed(2)}`,
  ];
  dataLines.forEach((line, i) => {
    doc.text(line, 26, y + 16 + i * 7);
  });

  // ═══════════════════════════════════════════
  // SEAL & SIGNATURE
  // ═══════════════════════════════════════════
  const sealY = 248;
  // Outer ring
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.ellipse(pw / 2, sealY, 16, 16, 'D');
  // Inner ring
  doc.setLineWidth(0.3);
  doc.ellipse(pw / 2, sealY, 12, 12, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY_DARK);
  doc.text('AUDITT', pw / 2, sealY - 2, { align: 'center' });
  doc.setFontSize(6);
  doc.setTextColor(...GOLD);
  doc.text('CERTIFIED', pw / 2, sealY + 3, { align: 'center' });
  doc.setFontSize(5);
  doc.text('2026', pw / 2, sealY + 7, { align: 'center' });

  // Authorization text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY_DARK);
  doc.text('AUTORIZADO PELA DIRETORIA AUDITT', pw / 2, sealY + 24, { align: 'center' });

  // ═══════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════
  doc.setFont('courier', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(160, 160, 160);
  doc.text(`Auditt Tecnologia e Logística LTDA • Verificação: ${docId} • IA-CORE V4.0`, pw / 2, ph - 10, { align: 'center' });

  // ═══════════════════════════════════════════
  // DOWNLOAD
  // ═══════════════════════════════════════════
  const safeName = name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`CERTIFICADO_AUDITT_${safeName}.pdf`);
}
