// Event bus simples para sincronizar dashboards financeiros após mutações
// (pagar fatura, lançar transação, etc).
import { useEffect } from "react";

export const FINANCIAL_DATA_CHANGED = "financial:data-changed";

export function emitFinancialDataChanged(reason?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(FINANCIAL_DATA_CHANGED, { detail: { reason, ts: Date.now() } }),
  );
}

export function useFinancialDataChanged(handler: () => void) {
  useEffect(() => {
    const fn = () => handler();
    window.addEventListener(FINANCIAL_DATA_CHANGED, fn);
    return () => window.removeEventListener(FINANCIAL_DATA_CHANGED, fn);
  }, [handler]);
}
