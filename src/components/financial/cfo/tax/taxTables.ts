// Tabelas do Simples Nacional 2024 (frontend - apenas para preview/display)
export type Faixa = { upTo: number; rate: number; deduct: number };

export const ANEXOS: Record<string, Faixa[]> = {
  "Anexo I": [
    { upTo: 180000, rate: 0.04, deduct: 0 },
    { upTo: 360000, rate: 0.073, deduct: 5940 },
    { upTo: 720000, rate: 0.095, deduct: 13860 },
    { upTo: 1800000, rate: 0.107, deduct: 22500 },
    { upTo: 3600000, rate: 0.143, deduct: 87300 },
    { upTo: 4800000, rate: 0.19, deduct: 378000 },
  ],
  "Anexo II": [
    { upTo: 180000, rate: 0.045, deduct: 0 },
    { upTo: 360000, rate: 0.078, deduct: 5940 },
    { upTo: 720000, rate: 0.10, deduct: 13860 },
    { upTo: 1800000, rate: 0.112, deduct: 22500 },
    { upTo: 3600000, rate: 0.147, deduct: 85500 },
    { upTo: 4800000, rate: 0.30, deduct: 720000 },
  ],
  "Anexo III": [
    { upTo: 180000, rate: 0.06, deduct: 0 },
    { upTo: 360000, rate: 0.112, deduct: 9360 },
    { upTo: 720000, rate: 0.135, deduct: 17640 },
    { upTo: 1800000, rate: 0.16, deduct: 35640 },
    { upTo: 3600000, rate: 0.21, deduct: 125640 },
    { upTo: 4800000, rate: 0.33, deduct: 648000 },
  ],
  "Anexo IV": [
    { upTo: 180000, rate: 0.045, deduct: 0 },
    { upTo: 360000, rate: 0.09, deduct: 8100 },
    { upTo: 720000, rate: 0.102, deduct: 12420 },
    { upTo: 1800000, rate: 0.14, deduct: 39780 },
    { upTo: 3600000, rate: 0.22, deduct: 183780 },
    { upTo: 4800000, rate: 0.33, deduct: 828000 },
  ],
  "Anexo V": [
    { upTo: 180000, rate: 0.155, deduct: 0 },
    { upTo: 360000, rate: 0.18, deduct: 4500 },
    { upTo: 720000, rate: 0.195, deduct: 9900 },
    { upTo: 1800000, rate: 0.205, deduct: 17100 },
    { upTo: 3600000, rate: 0.23, deduct: 62100 },
    { upTo: 4800000, rate: 0.305, deduct: 540000 },
  ],
};

export const ANEXO_LABELS: Record<string, string> = {
  "Anexo I": "I — Comércio",
  "Anexo II": "II — Indústria",
  "Anexo III": "III — Serviços (com Fator R ≥ 28%)",
  "Anexo IV": "IV — Serviços específicos (advocacia, construção)",
  "Anexo V": "V — Serviços (sem Fator R)",
};

export const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function parseBR(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/\s/g, "").replace(/[R$]/g, "");
  if (cleaned.includes(",")) {
    const n = Number(cleaned.replace(/\./g, "").replace(",", "."));
    return isNaN(n) ? 0 : n;
  }
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}

export function sanitizeMoneyInput(s: string): string {
  return s.replace(/[^\d.,]/g, "");
}

export function calcSimples(anexoKey: string, revenue12m: number, revenueMonth: number) {
  const faixas = ANEXOS[anexoKey] ?? ANEXOS["Anexo I"];
  const faixa = faixas.find((f) => revenue12m <= f.upTo) ?? faixas[faixas.length - 1];
  const aliquotaEfetiva =
    revenue12m > 0 ? (revenue12m * faixa.rate - faixa.deduct) / revenue12m : 0;
  const das = Math.max(revenueMonth * aliquotaEfetiva, 0);
  return { faixa, aliquotaEfetiva: Math.max(aliquotaEfetiva, 0), das };
}
