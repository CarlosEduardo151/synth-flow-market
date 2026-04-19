import { describe, it, expect, vi } from "vitest";
import { generateCRMReportPDF } from "@/lib/generateCRMReportPDF";

// Mock jsPDF to capture calls without depending on a real PDF render
vi.mock("jspdf", () => {
  const text = vi.fn();
  const setFontSize = vi.fn();
  const setFont = vi.fn();
  const setTextColor = vi.fn();
  const setFillColor = vi.fn();
  const setDrawColor = vi.fn();
  const rect = vi.fn();
  const line = vi.fn();
  const splitTextToSize = vi.fn((s: string) => [s]);
  const addPage = vi.fn();
  const save = vi.fn();
  const getNumberOfPages = vi.fn(() => 1);
  const setPage = vi.fn();
  return {
    jsPDF: vi.fn().mockImplementation(() => ({
      internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 }, pages: [null, null] },
      text, setFontSize, setFont, setTextColor, setFillColor, setDrawColor,
      rect, line, splitTextToSize, addPage, save, getNumberOfPages, setPage,
    })),
  };
});

describe("generateCRMReportPDF", () => {
  it("generates a PDF with title and executive summary without throwing", () => {
    expect(() =>
      generateCRMReportPDF({
        title: "Relatório Preditivo Mensal",
        generatedAt: new Date("2026-04-19").toISOString(),
        report: {
          resumo_executivo: "Pipeline saudável com 12 leads quentes.",
          indicadores_chave: [
            { nome: "MRR", valor: "R$ 18k", tendencia: "alta", descricao: "Crescimento 12% MoM" },
          ],
          acoes_recomendadas: [
            { acao: "Follow-up VIPs", prioridade: "alta", prazo_sugerido: "7d", impacto_esperado: "+15% conv", responsavel_sugerido: "SDR" },
          ],
          conclusao: "Manter ritmo de prospecção.",
        },
      }),
    ).not.toThrow();
  });

  it("handles empty report gracefully", () => {
    expect(() =>
      generateCRMReportPDF({
        title: "Vazio",
        generatedAt: new Date().toISOString(),
        report: {},
      }),
    ).not.toThrow();
  });
});
