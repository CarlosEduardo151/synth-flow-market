import { jsPDF } from "jspdf";

interface PredictiveReport {
  resumo_executivo?: string;
  indicadores_chave?: { nome: string; valor: string; tendencia: string; descricao: string }[];
  analise_funil?: { total_leads: number; taxa_conversao_estimada: number; gargalos: string[]; recomendacoes: string[] };
  previsao_demanda?: { proximos_30_dias: string; proximos_90_dias: string; confianca_pct: number; fatores: string[] };
  riscos_identificados?: { risco: string; severidade: string; impacto: string; mitigacao: string }[];
  principais_causas_problemas?: { causa: string; evidencia: string; frequencia: string }[];
  acoes_recomendadas?: { acao: string; prioridade: string; prazo_sugerido: string; impacto_esperado: string; responsavel_sugerido: string }[];
  segmentacao_clientes?: { segmento: string; quantidade: number; comportamento: string; estrategia: string }[];
  sentimento_geral?: { score: number; classificacao: string; principais_drivers_positivos: string[]; principais_drivers_negativos: string[] };
  oportunidades_crescimento?: { oportunidade: string; potencial_receita: string; dificuldade: string; descricao: string }[];
  metricas_engajamento?: { taxa_resposta_estimada: string; tempo_medio_resposta: string; canais_mais_ativos: string[]; horarios_pico: string[] };
  conclusao?: string;
}

interface Options {
  title: string;
  generatedAt: string;
  report: PredictiveReport;
}

export function generateCRMReportPDF({ title, generatedAt, report }: Options) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPage = (needed = 10) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeWrapped = (text: string, size = 10, bold = false, color: [number, number, number] = [40, 40, 40]) => {
    if (!text) return;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, contentWidth);
    for (const line of lines) {
      checkPage(size * 0.5);
      doc.text(line, margin, y);
      y += size * 0.45;
    }
  };

  const sectionTitle = (label: string) => {
    checkPage(14);
    y += 4;
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, y - 4, contentWidth, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(label, margin + 2, y + 1);
    y += 8;
    doc.setTextColor(40, 40, 40);
  };

  const bullet = (text: string) => {
    if (!text) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(`•  ${text}`, contentWidth - 4);
    for (const line of lines) {
      checkPage(5);
      doc.text(line, margin + 3, y);
      y += 4.2;
    }
  };

  // Cabeçalho
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Relatório Preditivo CRM", margin, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(title, margin, 18);
  doc.text(`Gerado em: ${generatedAt}`, margin, 23);
  y = 36;
  doc.setTextColor(40, 40, 40);

  if (report.resumo_executivo) {
    sectionTitle("Resumo Executivo");
    writeWrapped(report.resumo_executivo, 10);
  }

  if (report.indicadores_chave?.length) {
    sectionTitle("Indicadores-Chave");
    report.indicadores_chave.forEach((ind) => {
      writeWrapped(`${ind.nome}: ${ind.valor} (${ind.tendencia})`, 10, true);
      writeWrapped(ind.descricao, 9, false, [90, 90, 90]);
      y += 1;
    });
  }

  if (report.analise_funil) {
    sectionTitle("Análise de Funil");
    writeWrapped(
      `Total de leads: ${report.analise_funil.total_leads} | Taxa de conversão estimada: ${report.analise_funil.taxa_conversao_estimada}%`,
      10,
      true,
    );
    if (report.analise_funil.gargalos?.length) {
      writeWrapped("Gargalos identificados:", 10, true, [200, 50, 50]);
      report.analise_funil.gargalos.forEach(bullet);
    }
    if (report.analise_funil.recomendacoes?.length) {
      writeWrapped("Recomendações:", 10, true, [40, 130, 60]);
      report.analise_funil.recomendacoes.forEach(bullet);
    }
  }

  if (report.previsao_demanda) {
    sectionTitle("Previsão de Demanda");
    writeWrapped(`Próximos 30 dias: ${report.previsao_demanda.proximos_30_dias}`, 10);
    writeWrapped(`Próximos 90 dias: ${report.previsao_demanda.proximos_90_dias}`, 10);
    writeWrapped(`Confiança: ${report.previsao_demanda.confianca_pct}%`, 10, true);
    if (report.previsao_demanda.fatores?.length) {
      writeWrapped("Fatores: " + report.previsao_demanda.fatores.join(", "), 9, false, [90, 90, 90]);
    }
  }

  if (report.riscos_identificados?.length) {
    sectionTitle("Riscos Identificados");
    report.riscos_identificados.forEach((r) => {
      writeWrapped(`${r.risco} [${r.severidade.toUpperCase()}]`, 10, true, [180, 60, 60]);
      writeWrapped(`Impacto: ${r.impacto}`, 9);
      writeWrapped(`Mitigação: ${r.mitigacao}`, 9, false, [40, 130, 60]);
      y += 1;
    });
  }

  if (report.principais_causas_problemas?.length) {
    sectionTitle("Principais Causas de Problemas");
    report.principais_causas_problemas.forEach((c) => {
      writeWrapped(`${c.causa} (${c.frequencia})`, 10, true);
      writeWrapped(c.evidencia, 9, false, [90, 90, 90]);
      y += 1;
    });
  }

  if (report.acoes_recomendadas?.length) {
    sectionTitle("Ações Recomendadas");
    report.acoes_recomendadas.forEach((a) => {
      writeWrapped(`${a.acao} [${a.prioridade.toUpperCase()}]`, 10, true);
      writeWrapped(`Prazo: ${a.prazo_sugerido} | Responsável: ${a.responsavel_sugerido}`, 9);
      writeWrapped(`Impacto esperado: ${a.impacto_esperado}`, 9, false, [40, 130, 60]);
      y += 1;
    });
  }

  if (report.segmentacao_clientes?.length) {
    sectionTitle("Segmentação de Clientes");
    report.segmentacao_clientes.forEach((s) => {
      writeWrapped(`${s.segmento} (${s.quantidade} clientes)`, 10, true);
      writeWrapped(s.comportamento, 9);
      writeWrapped(`Estratégia: ${s.estrategia}`, 9, false, [50, 80, 200]);
      y += 1;
    });
  }

  if (report.sentimento_geral) {
    sectionTitle("Sentimento Geral");
    writeWrapped(
      `Score: ${report.sentimento_geral.score}/100 — ${report.sentimento_geral.classificacao}`,
      10,
      true,
    );
    if (report.sentimento_geral.principais_drivers_positivos?.length) {
      writeWrapped("Drivers positivos:", 10, true, [40, 130, 60]);
      report.sentimento_geral.principais_drivers_positivos.forEach(bullet);
    }
    if (report.sentimento_geral.principais_drivers_negativos?.length) {
      writeWrapped("Drivers negativos:", 10, true, [200, 50, 50]);
      report.sentimento_geral.principais_drivers_negativos.forEach(bullet);
    }
  }

  if (report.oportunidades_crescimento?.length) {
    sectionTitle("Oportunidades de Crescimento");
    report.oportunidades_crescimento.forEach((o) => {
      writeWrapped(`${o.oportunidade} [${o.dificuldade}]`, 10, true);
      writeWrapped(o.descricao, 9);
      writeWrapped(`Potencial: ${o.potencial_receita}`, 9, false, [40, 130, 60]);
      y += 1;
    });
  }

  if (report.metricas_engajamento) {
    sectionTitle("Métricas de Engajamento");
    writeWrapped(`Taxa de resposta: ${report.metricas_engajamento.taxa_resposta_estimada}`, 10);
    writeWrapped(`Tempo médio de resposta: ${report.metricas_engajamento.tempo_medio_resposta}`, 10);
    if (report.metricas_engajamento.canais_mais_ativos?.length) {
      writeWrapped("Canais mais ativos: " + report.metricas_engajamento.canais_mais_ativos.join(", "), 9);
    }
    if (report.metricas_engajamento.horarios_pico?.length) {
      writeWrapped("Horários de pico: " + report.metricas_engajamento.horarios_pico.join(", "), 9);
    }
  }

  if (report.conclusao) {
    sectionTitle("Conclusão");
    writeWrapped(report.conclusao, 10);
  }

  // Rodapé com numeração
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Página ${i} de ${totalPages} • Gerado pelo CRM`,
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" },
    );
  }

  doc.save(`relatorio-crm-${Date.now()}.pdf`);
}
